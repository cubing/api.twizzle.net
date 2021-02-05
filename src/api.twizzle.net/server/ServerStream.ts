import { WebSocket } from "https://deno.land/std@0.85.0/ws/mod.ts";
import { TwizzleUserID } from "../common/auth.ts";
import {
  BinaryMoveEvent,
  ClientID,
  OrientationEvent,
  ResetEvent,
  StreamID,
  StreamInfo,
} from "../common/stream.ts";
import { TwizzleUserPublicInfo } from "../common/user.ts";
import { BufferedLogFile, mainErrorLog } from "./BufferedLogFile.ts";
import { TwizzleUser } from "./db/TwizzleUser.ts";
import { newClientID, newStreamID } from "./identifiers.ts";
const STREAM_TIMEOUT_MS = 10 * 60 * 1000;

class ServerStreamClient {
  id: ClientID = newClientID();
  constructor(
    public webSocket: WebSocket,
    public clientIsPermittedToSend: boolean,
  ) {}

  closeIfNotYetClosed() {
    if (!this.webSocket.isClosed) {
      // TODO: why do we get a final message with code 1001?
      this.webSocket.close();
    }
  }
}

export class ServerStream {
  permittedSenderIDs: Set<TwizzleUserID> = new Set<TwizzleUserID>();
  clients: Set<ServerStreamClient> = new Set<ServerStreamClient>();

  public streamID: StreamID = newStreamID();
  // streamClientToken: StreamClientToken = newStreamClientToken();

  #pendingTerminationTimeoutID: number | null = null;
  #terminated = false;
  // TODO: can we trust our own stream IDs?
  #bufferedLogFile = new BufferedLogFile(
    `./data/log/streams/${this.streamID}.log`,
  );

  // TODO: put these in e.g. a map.
  #lastMoveMessage: MessageEvent<BinaryMoveEvent> | null = null;
  #lastOrientationMessage: MessageEvent<OrientationEvent> | null = null;
  #lastResetMessage: MessageEvent<ResetEvent> | null = null;
  // hack to work around reset loop in client
  #lastMessage:
    | MessageEvent<BinaryMoveEvent | OrientationEvent | ResetEvent>
    | null = null;

  constructor(
    private streamTerminatedCallback: (stream: ServerStream) => void,
    initialPermittedSenders: TwizzleUser[],
  ) {
    for (const sender of initialPermittedSenders) {
      this.permittedSenderIDs.add(sender.id);
    }
    this.startTerminationTimeout(); // TODO: handle no one ever connecting

    this.#bufferedLogFile.log({
      event: "initialized",
      streamID: this.streamID,
      initialPermittedSenders: Array.from(this.permittedSenderIDs.values()),
    });
  }

  toJSON(): StreamInfo {
    return {
      streamID: this.streamID,
      senders: this.permittedSenderPublicInfos(),
    };
  }

  permittedSenderPublicInfos(): TwizzleUserPublicInfo[] {
    return Array.from(this.permittedSenderIDs.values()).map((senderUserID) =>
      TwizzleUser.publicInfo(senderUserID)
    );
  }

  addClient(webSocket: WebSocket, maybeUser: TwizzleUser | null): void {
    if (this.#terminated) {
      this.#bufferedLogFile.log({
        event: "stream.already_terminated",
      });
    }

    const clientIsPermittedToSend = !!(
      maybeUser && this.permittedSenderIDs.has(maybeUser.id)
    );
    const client = new ServerStreamClient(webSocket, clientIsPermittedToSend);
    this.clients.add(client);
    this.#bufferedLogFile.log({
      event: "client.added",
      clientID: client.id,
      userID: maybeUser?.id ?? null,
      clientIsPermittedToSend,
    });
    if (clientIsPermittedToSend) {
      this.clearPendingTimeout();
    } else {
      // Send the reset event first, so it doesn't clobber the others.
      if (this.#lastResetMessage) {
        this.sendToClient(client, this.#lastResetMessage);
      }
      if (this.#lastOrientationMessage) {
        this.sendToClient(client, this.#lastOrientationMessage);
      }
      if (this.#lastMoveMessage) {
        this.sendToClient(client, this.#lastMoveMessage);
      }
    }

    (async () => {
      try {
        for await (const message of webSocket) {
          this.onMessage(message as string, client);
        }
        this.removeClient(client);
      } catch (e) {
        this.#bufferedLogFile.log({
          event: "message-error",
          errorMessage: e.toString(),
        });
      }
    })();
  }

  onMessage(message: string, client: ServerStreamClient): void {
    if (!client.clientIsPermittedToSend) {
      mainErrorLog.log({
        event: "message.invalid_permission",
        client: client.id,
      });
      this.removeClient(client);
      return;
    } else {
      // TODO: process
      if (typeof message !== "string") {
        mainErrorLog.log({
          event: "message.non_string",
          client: client.id,
        });
        return;
      }
      try {
        // TODO: validate
        const messageJSON = JSON.parse(message);
        this.#bufferedLogFile.log(messageJSON);
        if (messageJSON.event === "move") {
          this.#lastMoveMessage = messageJSON;
          this.#lastMessage = messageJSON;
        }
        if (messageJSON.event === "orientation") {
          this.#lastOrientationMessage = messageJSON;
          this.#lastMessage = messageJSON;
        }
        if (messageJSON.event === "reset") {
          const resetMessage: MessageEvent<ResetEvent> = messageJSON;
          if (
            (this.#lastMessage as MessageEvent<Partial<ResetEvent>>).data
              .trackingOrientation === resetMessage.data.trackingOrientation
          ) {
            this.#bufferedLogFile.log({
              event: "message.reset_avoiding_loop",
              clientID: client.id,
            });
            mainErrorLog.log({
              event: "message.reset_avoiding_loop",
              stream: this.streamID,
              clientID: client.id,
            });
            return;
          }
          this.#lastResetMessage = messageJSON;
          this.#lastMessage = messageJSON;
        }
        this.broadcast(messageJSON);
      } catch (e) {
        this.#bufferedLogFile.log({
          event: "message.invalid",
          clientID: client.id,
        });
      }
    }
  }

  // idempotent
  clearPendingTimeout(): void {
    if (this.#pendingTerminationTimeoutID !== null) {
      clearTimeout(this.#pendingTerminationTimeoutID);
      this.#pendingTerminationTimeoutID = null;
    }
  }

  numSendingClients(): number {
    let num = 0;
    for (const client of this.clients) {
      if (client.clientIsPermittedToSend) {
        num++;
      }
    }
    return num;
  }

  terminate(): void {
    for (const client of this.clients) {
      client.closeIfNotYetClosed();
    }
    this.#terminated = true;
    this.streamTerminatedCallback(this);
  }

  startTerminationTimeout(): void {
    this.clearPendingTimeout();
    this.#pendingTerminationTimeoutID = setTimeout(
      this.terminationTimeout.bind(this),
      STREAM_TIMEOUT_MS,
    );
  }

  terminationTimeout() {
    this.#bufferedLogFile.log({
      event: "stream.timeout.due",
      stream: this.streamID,
    });
    if (this.numSendingClients() !== 0) {
      const errData = {
        event: "stream.timeout.inconsistency",
        message: "active pending termination, but not 0 sending clients",
        stream: this.streamID,
      };
      this.#bufferedLogFile.log(errData);
      mainErrorLog.log(errData);
    }
    this.terminate();
  }

  removeClient(client: ServerStreamClient): void {
    client.closeIfNotYetClosed();
    this.clients.delete(client);
    this.#bufferedLogFile.log({
      event: "client.removed",
      clientID: client.id,
    });

    if (this.numSendingClients() === 0) {
      this.#bufferedLogFile.log({
        event: "stream.timeout.start",
        stream: this.streamID,
      });
      this.startTerminationTimeout();
    }
  }

  // deno-lint-ignore no-explicit-any
  private broadcast(message: Record<string, any>): void {
    for (const client of this.clients) {
      this.sendToClient(client, message);
    }
  }

  private sendToClient(
    client: ServerStreamClient,
    // deno-lint-ignore no-explicit-any
    message: Record<string, any>,
  ): void {
    client.webSocket.send(JSON.stringify(message));
  }
}
