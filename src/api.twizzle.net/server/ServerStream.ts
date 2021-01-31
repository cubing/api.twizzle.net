
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

export class ServerStream {
  public streamID: StreamID = newStreamID();
  public streamClientToken: StreamClientToken = newStreamClientToken();
}
