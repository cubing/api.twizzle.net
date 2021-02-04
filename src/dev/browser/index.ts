import { Sequence } from "cubing/alg";
import { connect, debugKeyboardConnect, MoveEvent } from "cubing/bluetooth";
import { EquivalentStates, KPuzzle, KPuzzleDefinition } from "cubing/kpuzzle";
import { cube3x3x3 } from "cubing/puzzles";
import { TwistyPlayer } from "cubing/twisty";
import { TwizzleAPIClient } from "../../api.twizzle.net/client/index";
import { Stream } from "../../api.twizzle.net/client/Stream";
import { prod, setProd } from "../../api.twizzle.net/common/config";
import { BinaryMoveEvent } from "../../api.twizzle.net/common/stream";
import { mutateToBinary, mutateToTransformation } from "./binary";

setProd(process.env.NODE_ENV === "production");
// console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("prod:", prod());

const client = new TwizzleAPIClient(localStorage);

(window as any).client = client;

const viewerElem = document.querySelector("#viewer");
const signInElem = document.querySelector("#sign-in");
const connectElem = document.querySelector("#connect");
const manageStreamElem = document.querySelector("#manage-stream");
const selectorsElem = document.querySelector("#selectors");

const twistyPlayer = viewerElem.appendChild(
  new TwistyPlayer({
    controlPanel: "none",
  }),
);

function resetTwistyPlayer(): void {
  twistyPlayer.alg = new Sequence([]);
  twistyPlayer.experimentalSetStartStateOverride(null);
}

class ListenerMonoplexer {
  constructor(private actualListener: (moveEvent: MoveEvent) => void) {}
  currentMonoplexListener: (moveEvent: MoveEvent) => void = () => {};
  newMonoplexListener(): (moveEvent: MoveEvent) => void {
    const proxyListener = (moveEvent: MoveEvent) => {
      if (proxyListener === this.currentMonoplexListener) {
        this.actualListener(moveEvent);
      }
    };
    return this.currentMonoplexListener = proxyListener;
  }
}
const playerMonoplexer = new ListenerMonoplexer((moveEvent: MoveEvent) => {
  twistyPlayer.experimentalAddMove(moveEvent.latestMove);
});
let currentStream: Stream | null = null
const streamMonoplexer = new ListenerMonoplexer((moveEvent: MoveEvent) => {
  currentStream?.sendMoveEvent(mutateToBinary(moveEvent));
 });

function sameStates(
  def: KPuzzleDefinition,
  twistyPlayer: TwistyPlayer,
  moveEvent: MoveEvent,
): boolean {
  const indexer = (twistyPlayer.cursor as any).todoIndexer; // TODO: unhackify
  const playerState = indexer
    .stateAtIndex(
      indexer.numMoves() + 1,
      (twistyPlayer.cursor as any).startState, // TODO: unhackify
    );

  return EquivalentStates(def, playerState, moveEvent.state);
}

const defPromise = cube3x3x3.def();

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

  const url = new URL(location.href);
  const maybeClaimToken = url.searchParams.get("claimToken");
  if (maybeClaimToken) {
    await client.claim(maybeClaimToken);
    url.searchParams.delete("claimToken");
    window.history.pushState({}, "", url.toString());
  }
  try {
    const streams = await client.streams();
    console.log(streams);

    if (streams.length === 0) {
      streamList.appendChild(document.createElement("div")).textContent =
        "No active streams.";
    }

    const def = await defPromise;

    const startSending = async (stream: Stream): Promise<void> => {
      console.log("Starting stream:", stream);

      await stream.connect();
      currentStream = stream;
      manageStreamElem.textContent = "";
      manageStreamElem.appendChild(document.createElement("span"))
        .textContent = `Stream: 0x${stream.streamID.slice(-2)}`;
    };

    for (const stream of streams) {
      const a = streamList.appendChild(document.createElement("a"));
      a.classList.add("stream-selector");
      a.href = "#";
      a.textContent = `${stream.streamInfo.senders[0]?.name ??
        "<unknown stream>"} 0x${stream.streamID.slice(-2)}`;
      a.addEventListener("click", async (e: Event) => {
        e.preventDefault();
        if (stream.permittedToSend()) {
          startSending(stream);
        } else {
          await stream.connect();
          resetTwistyPlayer();
          let firstEvent = true;
          const playerMonoplexListener = playerMonoplexer.newMonoplexListener();
          stream.addListener((binaryMoveEvent: BinaryMoveEvent) => {
            if (playerMonoplexer.currentMonoplexListener !== playerMonoplexListener) {
              return;
            }

            const moveEvent = mutateToTransformation(binaryMoveEvent);
            if (firstEvent) {
              twistyPlayer.experimentalSetStartStateOverride(moveEvent.state);
              firstEvent = false;
            } else {
              playerMonoplexListener(moveEvent);
              if (!sameStates(def, twistyPlayer, moveEvent)) {
                twistyPlayer.alg = new Sequence([]);
                twistyPlayer.experimentalSetStartStateOverride(moveEvent.state);
              }
            }
          });
        }
      });
    }
    const connectKeyboardButton = connectElem.appendChild(
      document.createElement("button")
    );
    connectKeyboardButton.textContent = "Connect keyboard";
    connectKeyboardButton.addEventListener("click", async () => {
      const keyboardPuzzle = await debugKeyboardConnect();
      keyboardPuzzle.addMoveListener(playerMonoplexer.newMonoplexListener());
      keyboardPuzzle.addMoveListener(streamMonoplexer.newMonoplexListener());
    });
    const connectSmartPuzzleButton = connectElem.appendChild(
      document.createElement("button")
    );
    connectSmartPuzzleButton.textContent = "Connect smart cube";
    connectSmartPuzzleButton.addEventListener("click", async () => {
      const bluetoothPuzzle = await connect();
      const smartCubeKPuzzle = new KPuzzle(def);
      const playerMonoplexListener = playerMonoplexer.newMonoplexListener();
      const streamMonoplexListener = streamMonoplexer.newMonoplexListener();
      bluetoothPuzzle.addMoveListener((moveEvent: MoveEvent) => {
        smartCubeKPuzzle.applyBlockMove(moveEvent.latestMove);
        moveEvent.state = smartCubeKPuzzle.state;
        playerMonoplexListener(moveEvent);
        streamMonoplexListener(moveEvent);
      });
    });
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
})();
