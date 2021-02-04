import { BareBlockMove } from "cubing/alg";
import { debugKeyboardConnect } from "cubing/bluetooth";
import { TwistyPlayer } from "cubing/twisty";
import { P } from "../../../../../Library/Caches/deno/deps/https/cdn.skypack.dev/974f7d518f512207d84c42dca57a1c4997f6b596fd0681ab3b3d2558dba95e2b";
import { TwizzleAPIClient } from "../../api.twizzle.net/client/index.ts";
import { Stream } from "../../api.twizzle.net/client/Stream.ts";
import { prod, setProd } from "../../api.twizzle.net/common/config.ts";

setProd(process.env.NODE_ENV === "production");
// console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("prod:", prod());

const client = new TwizzleAPIClient(localStorage);

(window as any).client = client;

const viewerElem = document.querySelector("#viewer");
const signInElem = document.querySelector("#sign-in");
const manageStreamElem = document.querySelector("#manage-stream");
const selectorsElem = document.querySelector("#selectors");

// TODO: reuse by resetting listeners
let cachedTwistyPlayer: TwistPlayer;
function resetTwistyPlayer(): TwistyPlayer {
  viewerElem.textContent = "";
  return cachedTwistyPlayer = viewerElem.appendChild(
    new TwistyPlayer({
      controlPanel: "none",
    }),
  );
}

(async () => {
  if (client.authenticated()) {
    signInElem.appendChild(document.createElement("span")).textContent =
      `Signed in as:`;
    signInElem.appendChild(document.createElement("br"));
    signInElem.appendChild(document.createElement("span")).textContent =
      `${client.myQualifiedName()}`;
    signInElem.appendChild(document.createElement("br"));
    const a = signInElem.appendChild(document.createElement("a"));
    a.href = client.wcaAuthURL();
    a.textContent = "(change)";
  } else {
    const a = signInElem.appendChild(document.createElement("a"));
    a.href = client.wcaAuthURL();
    a.textContent = "Sign in with your WCA account";
  }
  // selectors.appendChild(document.createElement("br"));
  // selectors.appendChild(document.createElement("br"));

  const streamList = selectorsElem.appendChild(document.createElement("div"));
  resetTwistyPlayer();

  const url = new URL(location.href);
  const maybeClaimToken = url.searchParams.get("claimToken");
  if (maybeClaimToken) {
    await client.claim(maybeClaimToken);
    url.searchParams.delete("claimToken");
    window.history.pushState({}, "", url);
  }
  try {
    const streams = await client.streams();
    console.log(streams);

    if (streams.length === 0) {
      streamList.appendChild(document.createElement("div")).textContent =
        "No active streams.";
    }
    const startSending = async (stream: Stream): void => {
      console.log("Starting stream:", stream);

      const kb = await debugKeyboardConnect();
      kb.addMoveListener((e: any) => {
        stream.sendMoveEvent(e);
        cachedTwistyPlayer.experimentalAddMove(e.latestMove);
      });
      await stream.connect();
      manageStreamElem.textContent = "";
      manageStreamElem.appendChild(document.createElement("span"))
        .textContent = `Stream: 0x${stream.streamID.slice(-2)}`;
      // sendingStream.sendMoveEvent({
      //   timestamp: 1,
      //   move: BareBlockMove("R"),
      // });
    };

    for (const stream of streams) {
      const a = streamList.appendChild(document.createElement("a"));
      a.classList.add("stream-selector");
      a.href = "#";
      a.textContent = `${stream.streamInfo.senders[0]?.name ??
        "<unknown stream>"} 0x${stream.streamID.slice(-2)}`;
      a.addEventListener("click", async (e: Event) => {
        if (stream.permittedToSend()) {
          startSending(stream);
        } else {
          e.preventDefault();
          await stream.connect();
          viewerElem.textContent = "";
          const twistyPlayer = resetTwistyPlayer();
          stream.addListener((moveEvent) => {
            twistyPlayer.experimentalAddMove(moveEvent.latestMove);
          });
        }
      });
    }
    if (client.authenticated()) {
      const startStreamButton = manageStreamElem.appendChild(
        document.createElement("button"),
      );
      startStreamButton.textContent = "Start new stream";

      startStreamButton.addEventListener("click", async () => {
        const sendingStream = await client.createStream();
        startSending(sendingStream);
      });
    }
  } catch (e) {
    console.error(e);
    streamList.appendChild(document.createElement("div")).textContent =
      "Cannot get stream info.";
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

  //   // console.log("indexing!");
})();
