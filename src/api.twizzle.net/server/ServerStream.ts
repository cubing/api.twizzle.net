import { ensureDirSync } from "https://deno.land/std@0.85.0/fs/mod.ts";
import { WebSocket } from "https://deno.land/std@0.85.0/ws/mod.ts";
import { TwizzleUserID } from "../common/auth.ts";
import { twizzleError, twizzleLog } from "../common/log.ts";
import {
  BinaryMoveEvent,
  ClientID,
  OrientationEvent,
  ResetEvent,
  StreamID,
  StreamInfo,
} from "../common/stream.ts";
import { TwizzleUserPublicInfo } from "../common/user.ts";
import { BufferedLogFile } from "./BufferedLogFile.ts";
import { TwizzleUser } from "./db/TwizzleUser.ts";
import { newClientID, newStreamID } from "./identifiers.ts";
const STREAM_TIMEOUT_MS = 10 * 60 * 1000;

ensureDirSync("./data/log/streams");

class ServerStreamClient {
  clientID: ClientID = newClientID();
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

  constructor(
    private streamTerminatedCallback: (stream: ServerStream) => void,
    initialPermittedSenders: TwizzleUser[],
  ) {
    for (const sender of initialPermittedSenders) {
      this.permittedSenderIDs.add(sender.id);
    }
    console.log(
      "initial permitted senders",
      this.streamID,
      Array.from(this.permittedSenderIDs.values()),
    );
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
      twizzleError(
        this,
        "attempted to add client to terminated stream",
        this.streamID,
      );
    }

    const clientIsPermittedToSend = !!(
      maybeUser && this.permittedSenderIDs.has(maybeUser.id)
    );
    console.log(
      this.permittedSenderIDs.size,
      maybeUser?.id,
      clientIsPermittedToSend,
    );
    const client = new ServerStreamClient(webSocket, clientIsPermittedToSend);
    this.clients.add(client);
    this.#bufferedLogFile.log({
      event: "client-added",
      clientID: client.clientID,
      userID: maybeUser?.id ?? null,
      clientIsPermittedToSend,
    });
    if (clientIsPermittedToSend) {
      this.clearPendingTimeout();
    } else {
      if (this.#lastMoveMessage) {
        this.sendToClient(client, this.#lastMoveMessage);
      }
      if (this.#lastOrientationMessage) {
        this.sendToClient(client, this.#lastOrientationMessage);
      }
      if (this.#lastResetMessage) {
        this.sendToClient(client, this.#lastResetMessage);
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
      twizzleLog(
        this,
        "received message from client who is not permitted to send:",
        client.clientID,
      );
      this.removeClient(client);
      return;
    } else {
      // TODO: process
      if (typeof message !== "string") {
        twizzleLog(
          this,
          "error: received non-string web socket message from",
          client.clientID,
        );
        return;
      }
      try {
        // TODO: validate
        const messageJSON = JSON.parse(message);
        this.#bufferedLogFile.log(messageJSON);
        if (messageJSON.event === "move") {
          this.#lastMoveMessage = messageJSON;
        }
        if (messageJSON.event === "orientation") {
          this.#lastOrientationMessage = messageJSON;
        }
        if (messageJSON.event === "reset") {
          this.#lastResetMessage = messageJSON;
        }
        this.broadcast(messageJSON);
      } catch (e) {
        this.#bufferedLogFile.log({
          event: "message-invalid",
          clientID: client.clientID,
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
    twizzleLog(this, "timed out, terminating", this.streamID);
    if (this.numSendingClients() !== 0) {
      twizzleError(
        this,
        "inconsistency: active pending termination, but not 0 sending clients",
        this.streamID,
      );
    }
    this.terminate();
  }

  removeClient(client: ServerStreamClient): void {
    twizzleLog(
      this,
      "removing client",
      client.clientID,
      "for stream",
      this.streamID,
    );
    client.closeIfNotYetClosed();
    this.clients.delete(client);
    this.#bufferedLogFile.log({
      event: "client-removed",
      clientID: client.clientID,
    });

    if (this.numSendingClients() === 0) {
      twizzleLog(
        this,
        "0 sending clients remaining. Setting termination timeout",
        this.streamID,
      );
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
