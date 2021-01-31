
import {
  WebSocket,
} from "https://deno.land/std@0.85.0/ws/mod.ts";
import { StreamClientToken, StreamID } from "../common/stream.ts";

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

function newStreamClientToken(): StreamClientToken {
  var array = new Uint8Array(8);
  window.crypto.getRandomValues(array);
  return "token_" + buf2hex(array);
}

interface ServerStreamClient {
  webSocket: WebSocket;
  clientIsPermittedToSend: boolean;
}

export class ServerStream {
  clients: Set<ServerStreamClient> = new Set<ServerStreamClient>();

  public streamID: StreamID = newStreamID();
  streamClientToken: StreamClientToken = newStreamClientToken();

  addClient(
    webSocket: WebSocket,
    options?: {
      streamClientToken?: StreamClientToken | null;
    }
  ): void {
    const clientIsPermittedToSend = options?.streamClientToken === this.streamClientToken;
    const client = {
      webSocket,
      clientIsPermittedToSend: clientIsPermittedToSend,
    };
    this.clients.add(client);

    (async () => {
      for await (const message of webSocket) {
        if (!clientIsPermittedToSend) {
          webSocket.close();
        } else {
          // TODO: process
          if (typeof message !== "string") {
            throw new Error("unimplemented: non-string web socket messages");
          }
          this.broadcast(message);
        }
      }
      this.clients.delete(client);
    })();
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
