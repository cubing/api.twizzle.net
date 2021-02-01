import { BareBlockMove } from "cubing/alg";
import { TwizzleAPIClient } from "../../api.twizzle.net/client/index.ts";

const client = new TwizzleAPIClient("http://127.0.0.1", localStorage);

(window as any).client = client;

(async () => {
  const a = document.createElement("a");
  a.href = client.wcaAuthURL();
  a.textContent = "Log in with your WCA account";
  document.body.appendChild(a);

  const url = new URL(location.href);
  const maybeClaimToken = url.searchParams.get("claimToken");
  if (maybeClaimToken) {
    await client.claim(maybeClaimToken);
    url.searchParams.delete("claimToken");
    window.history.pushState({}, "", url);
  }

  console.log(await client.createStream());

  //   // // const streams = await client.streams();
  //   // // console.log(streams);
  //   // // const stream = streams[0];
  //   // // await stream.connect();

  //   // const sendingStream = await client.createStream();
  //   // console.log({ sendingStream });
  //   // await sendingStream.connect();

  //   // const listeningStream = (await client.streams()).slice(-1)[0];
  //   // console.log(listeningStream);
  //   // await listeningStream.connect();

  //   // sendingStream.sendMove({
  //   //   timestamp: 1,
  //   //   move: BareBlockMove("R"),
  //   // });

  //   // console.log("indexing!");
})();
