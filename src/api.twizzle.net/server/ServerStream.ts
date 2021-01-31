import { WebSocket } from "https://deno.land/std@0.85.0/ws/mod.ts";
import { Server } from "https://deno.land/std@0.85.0/http/server.ts";
import { twizzleError, twizzleLog } from "../common/log.ts";
import { ClientID, StreamClientToken, StreamID } from "../common/stream.ts";

const STREAM_TIMEOUT_MS = 1000; //10 * 60 * 1000;

function buf2hex(buffer: Uint8Array): string {
  return Array.prototype.map
    .call(buffer, (x: number) => x.toString(16).padStart(2, "0"))
    .join("");
}

function newStreamID(): StreamID {
  var array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return "twizzle_stream_" + buf2hex(array);
}

function newClientID(): ClientID {
  var array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return "client_" + buf2hex(array);
}

function newStreamClientToken(): StreamClientToken {
  var array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return "token_" + buf2hex(array);
}

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
  clients: Set<ServerStreamClient> = new Set<ServerStreamClient>();

  public streamID: StreamID = newStreamID();
  streamClientToken: StreamClientToken = newStreamClientToken();

  #pendingTerminationTimeoutID: number | null = null;
  #terminated = false;

  constructor(
    private streamTerminatedCallback: (stream: ServerStream) => void,
  ) {
  }

  addClient(
    webSocket: WebSocket,
    options?: {
      streamClientToken?: StreamClientToken | null;
    },
  ): void {
    if (this.#terminated) {
      twizzleError(
        this,
        "attempted to add client to terminated stream",
        this.streamID,
      );
    }

    const clientIsPermittedToSend =
      options?.streamClientToken === this.streamClientToken;
    const client = new ServerStreamClient(webSocket, clientIsPermittedToSend);
    this.clients.add(client);
    if (clientIsPermittedToSend) {
      this.#pendingTerminationTimeoutID = null;
    }

    (async () => {
      for await (const message of webSocket) {
        if (!clientIsPermittedToSend) {
          twizzleLog(
            this,
            "received message from client who is not permitted to send",
            client,
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
            continue;
          }
          twizzleLog(this, "received move", message);
          this.broadcast(message);
        }
      }
      this.removeClient(client);
    })();
  }

  // idempotent
  clearPendingTimeout(): void {
    if (this.#pendingTerminationTimeoutID !== null) {
      clearTimeout(this.#pendingTerminationTimeoutID);
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
    twizzleLog(this, "removing client", client.clientID);
    client.closeIfNotYetClosed();
    this.clients.delete(client);

    if (this.numSendingClients() === 0) {
      twizzleLog(
        this,
        "0 sending clients remaining. Setting termination timeout",
      );
      this.clearPendingTimeout();
      this.#pendingTerminationTimeoutID = setTimeout(
        this.terminationTimeout.bind(this),
        STREAM_TIMEOUT_MS,
      );
    }
  }

  isValidToken(streamClientToken: StreamClientToken): boolean {
    return streamClientToken === this.streamClientToken;
  }

  broadcast(message: string) {
    for (const client of this.clients) {
      client.webSocket.send(message);
    }
  }
}
