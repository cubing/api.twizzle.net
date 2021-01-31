import { BareBlockMove } from "cubing/alg";
import { TwizzleAPIClient } from "../../api.twizzle.net/client/index.ts";

const client = new TwizzleAPIClient("http://127.0.0.1");

(async () => {
  const streams = await client.streams();
  console.log(streams)
  const stream = streams[0];
  stream.connect();

  const sendingStream = await client.createStream();
  await sendingStream.connect();
  console.log(sendingStream.sendMove({
    timestamp: 1,
    move: BareBlockMove("R")
  }))

  console.log("indexing!");
})();
