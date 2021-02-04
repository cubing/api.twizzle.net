import { debugKeyboardConnect } from "cubing/bluetooth";
import { BareBlockMove } from "cubing/alg";
import { TwistyPlayer } from "cubing/twisty";
import { TwizzleAPIClient } from "../../api.twizzle.net/client/index.ts";

console.log("NODE_ENV:", process.env.NODE_ENV);

const client = new TwizzleAPIClient("http://127.0.0.1", localStorage);

(window as any).client = client;

const viewer = document.querySelector("#viewer");
const signIn = document.querySelector("#sign-in");
const selectors = document.querySelector("#selectors");
// TODO: reuse by resetting listeners
function resetTwistyPlayer(): TwistyPlayer {
  viewer.textContent = "";
  return viewer.appendChild(
    new TwistyPlayer({
      controlPanel: "none",
    }),
  );
}

(async () => {
  const a = document.createElement("a");
  a.href = client.wcaAuthURL();
  a.textContent = "Sign in with your WCA account";
  signIn.appendChild(a);
  // selectors.appendChild(document.createElement("br"));
  // selectors.appendChild(document.createElement("br"));

  const streamList = selectors.appendChild(document.createElement("div"));
  resetTwistyPlayer();

  const url = new URL(location.href);
  const maybeClaimToken = url.searchParams.get("claimToken");
  if (maybeClaimToken) {
    await client.claim(maybeClaimToken);
    url.searchParams.delete("claimToken");
    window.history.pushState({}, "", url);
  }

  const sendingStream = await client.createStream();
  console.log(sendingStream);

  const kb = await debugKeyboardConnect();
  kb.addMoveListener((e: any) => {
    sendingStream.sendMoveEvent(e);
  });

  const streams = await client.streams();
  console.log(streams);
  for (const stream of streams) {
    const a = streamList.appendChild(document.createElement("a"));
    a.classList.add("stream-selector");
    a.href = "#";
    a.textContent = `${stream.streamInfo.senders[0].name} 0x${
      stream.streamID.slice(-2)
    }`;
    a.addEventListener("click", async (e: Event) => {
      e.preventDefault();
      await stream.connect();
      viewer.textContent = "";
      const twistyPlayer = resetTwistyPlayer();
      stream.addListener((moveEvent) => {
        twistyPlayer.experimentalAddMove(moveEvent.latestMove);
      });
    });
  }

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

  await sendingStream.connect();
  sendingStream.sendMoveEvent({
    timestamp: 1,
    move: BareBlockMove("R"),
  });

  //   // console.log("indexing!");
})();
