import { Sequence } from "cubing/alg";
import {
  BluetoothPuzzle,
  connect,
  debugKeyboardConnect,
  GanCube,
  GoCube,
  KeyboardPuzzle,
  MoveEvent,
  OrientationEvent,
} from "cubing/bluetooth";
import { EquivalentStates, KPuzzle, KPuzzleDefinition } from "cubing/kpuzzle";
import { cube3x3x3 } from "cubing/puzzles";
import { Twisty3DCanvas, Twisty3DPuzzle, TwistyPlayer } from "cubing/twisty";
import { Quaternion } from "three";
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

class ListenerMonoplexer<E> {
  constructor(private actualListener: (e: E) => void) {}
  currentMonoplexListener: (e: E) => void = () => {};
  newMonoplexListener(): (e: E) => void {
    const proxyListener = (e: E) => {
      if (proxyListener === this.currentMonoplexListener) {
        this.actualListener(e);
      }
    };
    return this.currentMonoplexListener = proxyListener;
  }
}

let trackingOrientation = false;
function resetCamera(options?: { resetToNonTracking: boolean }): void {
  if (trackingOrientation && !options?.resetToNonTracking) {
    (twistyPlayer.viewerElems[0] as Twisty3DCanvas).camera.position.set(
      0,
      4,
      5
    );
  } else {
    trackingOrientation = false;
    (twistyPlayer.viewerElems[0] as Twisty3DCanvas).camera.position.set(
      3,
      4,
      5
    );
  }
  (twistyPlayer.viewerElems[0] as Twisty3DCanvas).camera.lookAt(0, 0, 0);
  twistyPlayer.scene.twisty3Ds.forEach((twisty3DPuzzle: Twisty3DPuzzle) => {
    twisty3DPuzzle.quaternion.copy(new Quaternion()); // TODO
  });
  (twistyPlayer.timeline as any).dispatchTimestamp(); // TODO
}
function setOrientation(orientationEvent: OrientationEvent) {
  if (!trackingOrientation) {
    // First orientation event.
    trackingOrientation = true;
    resetCamera();
  }
  twistyPlayer.scene.twisty3Ds.forEach(
    (twisty3DPuzzle: Twisty3DPuzzle) => {
      twisty3DPuzzle.quaternion.copy(orientationEvent.quaternion as Quaternion); // TODO
    },
  );
  // TODO: expose a way to scheduler renders on objects.
  (twistyPlayer.timeline as any).dispatchTimestamp(); // TODO
}

const playerMoveMonoplexer = new ListenerMonoplexer<MoveEvent>(
  (moveEvent: MoveEvent) => {
    twistyPlayer.experimentalAddMove(moveEvent.latestMove);
  },
);
const playerOriMonoplexer = new ListenerMonoplexer<OrientationEvent>(
  (orientationEvent: OrientationEvent) => {
    setOrientation(orientationEvent);
  },
);
let currentStream: Stream | null = null;
const streamMoveMonoplexer = new ListenerMonoplexer<MoveEvent>(
  (moveEvent: MoveEvent) => {
    currentStream?.sendMoveEvent(mutateToBinary(moveEvent));
  },
);
const streamOriMonoplexer = new ListenerMonoplexer<OrientationEvent>(
  (orientationEvent: OrientationEvent) => {
    currentStream?.sendOrientationEvent(orientationEvent);
  },
);

function sameStates(
  def: KPuzzleDefinition,
  twistyPlayer: TwistyPlayer,
  moveEvent: MoveEvent,
): boolean {
  // deno-lint-ignore no-explicit-any
  const indexer = (twistyPlayer.cursor as any).todoIndexer; // TODO: unhackify
  const playerState = indexer
    .stateAtIndex(
      indexer.numMoves() + 1,
      // deno-lint-ignore no-explicit-any
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
          const playerMoveMonoplexListener = playerMoveMonoplexer
            .newMonoplexListener();
          const playerOriMonoplexListener = playerOriMonoplexer
            .newMonoplexListener();
          stream.addMoveListener((binaryMoveEvent: BinaryMoveEvent) => {
            if (
              playerMoveMonoplexer.currentMonoplexListener !==
                playerMoveMonoplexListener
            ) {
              return;
            }

            const moveEvent = mutateToTransformation(binaryMoveEvent);
            if (firstEvent) {
              twistyPlayer.experimentalSetStartStateOverride(moveEvent.state);
              firstEvent = false;
            } else {
              playerMoveMonoplexListener(moveEvent);
              if (!sameStates(def, twistyPlayer, moveEvent)) {
                twistyPlayer.alg = new Sequence([]);
                twistyPlayer.experimentalSetStartStateOverride(moveEvent.state);
              }
            }
          });
          stream.addOrientationListener(
            (orientationEvent: OrientationEvent) => {
              playerOriMonoplexListener(orientationEvent);
            },
          );
        }
      });
    }
    const connectKeyboardButton = connectElem.appendChild(
      document.createElement("button"),
    );
    const connectSmartPuzzleButton = connectElem.appendChild(
      document.createElement("button"),
    );
    connectKeyboardButton.textContent = "Connect keyboard";
    let keyboardPuzzle: KeyboardPuzzle | null = null;
    connectKeyboardButton.addEventListener("click", async () => {
      connectKeyboardButton.textContent = "⏳ Connecting keyboard";
      try {
        keyboardPuzzle = await debugKeyboardConnect();
      } catch (e) {
        connectSmartPuzzleButton.textContent =
          "❌ Could not connect to keyboard";
        console.error(e);
        return;
      }
      smartPuzzle = null;
      connectKeyboardButton.textContent = "✅ Connected keyboard!";
      connectSmartPuzzleButton.textContent = "Connect smart cube";
      keyboardPuzzle.addMoveListener(playerMoveMonoplexer.newMonoplexListener());
      keyboardPuzzle.addMoveListener(streamMoveMonoplexer.newMonoplexListener());
      resetCamera({ resetToNonTracking: true });
      playerOriMonoplexer.newMonoplexListener(); // reset to empty
      streamOriMonoplexer.newMonoplexListener(); // reset to empty
    });
    connectSmartPuzzleButton.textContent = "Connect smart cube";
    let smartPuzzle: BluetoothPuzzle | null = null;
      const smartCubeKPuzzle = new KPuzzle(def);
    connectSmartPuzzleButton.addEventListener("click", async () => {
      connectSmartPuzzleButton.textContent = "⏳ Connecting to smart cube...";
      try {
        smartPuzzle = await connect(); // TODO: disconnect
      } catch (e) {
        connectSmartPuzzleButton.textContent =
          "❌ Could not connect to smart cube";
        console.error(e);
        return;
      }
      keyboardPuzzle = null;
      connectSmartPuzzleButton.textContent = "✅ Connected to smart cube";
      connectKeyboardButton.textContent = "Connect keyboard";
      smartCubeKPuzzle.reset();
      const playerMoveMonoplexListener = playerMoveMonoplexer
        .newMonoplexListener();
      const streamMoveMonoplexListener = streamMoveMonoplexer
        .newMonoplexListener();
      smartPuzzle.addMoveListener((moveEvent: MoveEvent) => {
        smartCubeKPuzzle.applyBlockMove(moveEvent.latestMove);
        moveEvent.state = smartCubeKPuzzle.state;
        playerMoveMonoplexListener(moveEvent);
        streamMoveMonoplexListener(moveEvent);
      });
      const playerOriMonoplexListener = playerOriMonoplexer
        .newMonoplexListener();
      const streamOriMonoplexListener = streamOriMonoplexer
        .newMonoplexListener();
      smartPuzzle.addOrientationListener((orientationEvent: OrientationEvent) => {
        playerOriMonoplexListener(orientationEvent);
        streamOriMonoplexListener(orientationEvent);
      });
    });
    const resetPuzzleButton = connectElem.appendChild(
      document.createElement("button")
    );
    resetPuzzleButton.textContent = "Reset cube";
    resetPuzzleButton.addEventListener("click", async () => {
      if (keyboardPuzzle !== null) {
        resetCamera({ resetToNonTracking: true });
        twistyPlayer.alg = new Sequence([]);
        (await keyboardPuzzle.puzzle).reset()
      }
      if (smartPuzzle !== null) {
        twistyPlayer.alg = new Sequence([]);
        resetCamera();
        if (
          (smartPuzzle as GoCube | { resetOrientation?: () => void })
            .resetOrientation
        ) {
          (smartPuzzle as
            | GoCube
            | { resetOrientation?: () => void }).resetOrientation();
        }
        if ((smartPuzzle as GanCube | { reset?: () => void }).reset) {
          (smartPuzzle as GanCube | { reset?: () => void }).reset();
        }
      }
    })
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
