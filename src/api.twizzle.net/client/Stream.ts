// import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { twizzleLog } from "../common/log.ts";
import {
  BinaryMoveEvent,
  MoveEvent,
  OrientationEvent,
  ResetEvent,
  StreamID,
  StreamInfo,
  StreamMessageEvent,
} from "../common/stream.ts";
import { StoredSessionInfo } from "./StoredSessionInfo.ts";

type MoveListener = (moveEvent: MoveEvent) => void;
type OrientationListener = (orientationEvent: OrientationEvent) => void;
type ResetListener = (resetEvent: ResetEvent) => void;

// TODO: distingiush send/receive from credentialed/anonymous, so that we can
// auth logged-in listeners (and prioritize them when under DOS)
// TODO: make into enum
type StreamAuthMode = "credential" | "anonymous";

export class Stream {
  #moveListeners: Set<MoveListener> = new Set();
  #orientationListeners: Set<OrientationListener> = new Set();
  #resetListeners: Set<ResetListener> = new Set();

  public streamID: StreamID;
  #streamURL: string;
  #webSocket: Promise<WebSocket> | null = null;
  #connnected = false;
  #storedSessionInfo: StoredSessionInfo;
  constructor(
    public streamInfo: StreamInfo,
    streamURL: string,
    storedSessionInfo: StoredSessionInfo,
  ) {
    this.streamID = streamInfo.streamID;
    this.#streamURL = streamURL;
    this.#storedSessionInfo = storedSessionInfo;
  }

  addMoveListener(listener: MoveListener): void {
    this.#moveListeners.add(listener);
  }

  removeMoveListener(listener: MoveListener): void {
    this.#moveListeners.delete(listener);
  }

  addOrientationListener(listener: OrientationListener): void {
    this.#orientationListeners.add(listener);
  }

  removeOrientationListener(listener: OrientationListener): void {
    this.#orientationListeners.delete(listener);
  }

  addResetListener(listener: ResetListener): void {
    this.#resetListeners.add(listener);
  }

  removeResetListener(listener: ResetListener): void {
    this.#resetListeners.delete(listener);
  }

  permittedToSend(): boolean {
    for (const sender of this.streamInfo.senders) {
      if (sender.twizzleUserID === this.#storedSessionInfo.twizzleUserID()) {
        return true;
      }
    }
    return false;
  }

  connected(): boolean {
    return this.#connnected;
  }

  // Idempotent: reuses an existing connection (or pending connection)
  // Returns once connected.
  async connect(options?: {streamAuthMode: StreamAuthMode}): Promise<void> {
    twizzleLog(this, "connecting", this.streamID);
    this.#webSocket ||= new Promise((resolve, reject) => {
      console.log(this.#streamURL);
      const socketURL = new URL(this.#streamURL);
      const twizzleAccessToken = this.#storedSessionInfo.twizzleAccessToken();
      const streamAuthMode = options?.streamAuthMode ?? "credential";
      if (streamAuthMode === "credential" && twizzleAccessToken) {
        // TODO: avoid including this in the URL?
        socketURL.searchParams.set("twizzleAccessToken", twizzleAccessToken);
      }
      const webSocket = new WebSocket(socketURL.toString());
      const timeoutID = setTimeout(() => {
        if (!this.#connnected) {
          twizzleLog(this, "timeout:", this.streamID);
          reject("timeout");
        }
      }, 10000); // TODO: exponential retry?
      webSocket.onopen = () => {
        twizzleLog(this, "connected", this.streamID);
        webSocket.onmessage = this.onMessage.bind(this);
        webSocket.onclose = this.onClose.bind(this);
        this.#connnected = true;
        resolve(webSocket);
        clearTimeout(timeoutID);
      };
    });
    await this.#webSocket;
  }

  // Idempotent: does nothing if already disconnected (or disconnecting)
  // Returns once disconnected.
  async disconnect(): Promise<void> {
    const webSocketPromise = this.#webSocket;
    this.#webSocket = null;
    (await webSocketPromise)?.close();
  }

  // TODO: remove `any`
  sendMoveEvent(binaryMoveEvent: BinaryMoveEvent): void {
    (async () => {
      // We wrap in an inline async to avoid letting callers wait on this.
      if (!this.#webSocket) {
        // TODO: write test
        throw new Error("cannot send to stream while disconnected");
      }
      (await this.#webSocket).send(
        JSON.stringify({
          event: "move",
          data: binaryMoveEvent,
        }),
      );
    })();
  }

  // TODO: remove `any`
  sendOrientationEvent(orientationEvent: OrientationEvent): void {
    (async () => {
      // We wrap in an inline async to avoid letting callers wait on this.
      if (!this.#webSocket) {
        // TODO: write test
        throw new Error("cannot send to stream while disconnected");
      }
      orientationEvent.timeStamp = Math.floor(orientationEvent.timeStamp); // Reduce size on the wire.
      orientationEvent.quaternion.x =
        Math.floor(10000 * orientationEvent.quaternion.x) / 10000;
      orientationEvent.quaternion.y =
        Math.floor(10000 * orientationEvent.quaternion.y) / 10000;
      orientationEvent.quaternion.z =
        Math.floor(10000 * orientationEvent.quaternion.z) / 10000;
      orientationEvent.quaternion.w =
        Math.floor(10000 * orientationEvent.quaternion.w) / 10000;
      (await this.#webSocket).send(
        JSON.stringify({
          event: "orientation",
          data: orientationEvent,
        }),
      );
    })();
  }

  sendResetEvent(resetEvent: ResetEvent): void {
    (async () => {
      // We wrap in an inline async to avoid letting callers wait on this.
      if (!this.#webSocket) {
        // TODO: write test
        throw new Error("cannot send to stream while disconnected");
      }

      (await this.#webSocket).send(
        JSON.stringify({
          event: "reset",
          data: resetEvent,
        }),
      );
    })();
  }

  // deno-lint-ignore no-explicit-any
  onMessage(messageEvent: MessageEvent<any>): void {
    const message: StreamMessageEvent = JSON.parse(messageEvent.data); // TODO: error handling
    switch (message?.event) {
      case "move":
        for (const moveListener of this.#moveListeners) {
          moveListener(message.data);
        }
        break;
      case "orientation":
        for (const orientationListener of this.#orientationListeners) {
          orientationListener(message.data);
        }
        break;
      case "reset":
        for (const resetListener of this.#resetListeners) {
          resetListener(message.data);
        }
        break;
    }
  }

  onClose(): void {
    twizzleLog(this, "closed:", this.streamID);
    this.#connnected = false;
  }
}
