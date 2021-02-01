import { BareBlockMove } from "cubing/alg";
import { TwizzleAPIClient } from "../../api.twizzle.net/client/index.ts";

const client = new TwizzleAPIClient("http://127.0.0.1");

(window as any).client = client;

(async () => {
  const a = document.createElement("a");
  a.href = client.authURL();
  a.textContent = "Log in with your WCA account";
  document.body.appendChild(a);

  // const streams = await client.streams();
  // console.log(streams);
  // const stream = streams[0];
  // await stream.connect();

  const sendingStream = await client.createStream();
  console.log({ sendingStream });
  await sendingStream.connect();

  const listeningStream = (await client.streams()).slice(-1)[0];
  console.log(listeningStream);
  await listeningStream.connect();

  sendingStream.sendMove({
    timestamp: 1,
    move: BareBlockMove("R"),
  });

  console.log("indexing!");
})();
