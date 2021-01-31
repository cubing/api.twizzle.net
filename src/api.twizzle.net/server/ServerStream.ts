import { WebSocket } from "https://deno.land/std@0.85.0/ws/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { ClientID, StreamClientToken, StreamID } from "../common/stream.ts";

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
}

export class ServerStream {
  clients: Set<ServerStreamClient> = new Set<ServerStreamClient>();

  public streamID: StreamID = newStreamID();
  streamClientToken: StreamClientToken = newStreamClientToken();

  addClient(
    webSocket: WebSocket,
    options?: {
      streamClientToken?: StreamClientToken | null;
    },
  ): void {
    const clientIsPermittedToSend =
      options?.streamClientToken === this.streamClientToken;
    const client = new ServerStreamClient(webSocket, clientIsPermittedToSend);
    this.clients.add(client);

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

  removeClient(client: ServerStreamClient): void {
    twizzleLog(this, "removing client", client.clientID);
    if (!client.webSocket.isClosed) {
      // TODO: why do we get a final message with code 1001?

      client.webSocket.close();
    }
    this.clients.delete(client);
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
