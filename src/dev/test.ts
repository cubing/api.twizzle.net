import { BareBlockMove } from "https://cdn.skypack.dev/cubing/alg";
import { TwizzleAPIServer } from "../api.twizzle.net/server/index.ts";
import { TwizzleAPIClient } from "../api.twizzle.net/client/index.ts";
import { Stream } from "../api.twizzle.net/client/Stream.ts";

console.log("Starting dev script.")

const server = new TwizzleAPIServer();
const client = new TwizzleAPIClient("http://127.0.0.1");

setTimeout(async () => {
  const stream: Stream = await client.createStream();
  console.log("stream list", stream.permittedToSend(), stream.connected());
  await stream.connect();
  console.log("stream list", stream.permittedToSend(), stream.connected());
  stream.sendMove({
    timestamp: 1,
    move: BareBlockMove("R", 1),
  })

  console.log(await client.streams())
  // const streamClient = client.streamClient();
}, 1000);
