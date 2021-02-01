import { BareBlockMove } from "https://cdn.skypack.dev/cubing/alg";
import { TwizzleAPIClient } from "../api.twizzle.net/client/index.ts";
import { TwizzleAPIServer } from "../api.twizzle.net/server/index.ts";

console.log("Starting dev script.");

const server = new TwizzleAPIServer();
const client = new TwizzleAPIClient("http://127.0.0.1", {});

setTimeout(async () => {
  const sendingStream = await client.createStream();
  console.log({ sendingStream });
  // console.log("stream list", stream.permittedToSend(), stream.connected());
  // await stream.connect();
  // console.log("stream list", stream.permittedToSend(), stream.connected());

  const listeningStream = (await client.streams())[0];
  console.log(
    sendingStream.streamID === listeningStream.streamID,
    listeningStream.permittedToSend(),
  );
  await listeningStream.connect();

  await sendingStream.connect();
  sendingStream.sendMove({
    timestamp: 1,
    move: BareBlockMove("R", 1),
  });

  listeningStream.sendMove({
    timestamp: 1,
    move: BareBlockMove("R", 1),
  });
}, 1000);
