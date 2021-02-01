// import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { TwizzleAccessToken } from "../common/auth.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamClientToken, StreamID, StreamInfo } from "../common/stream.ts";

export class Stream {
  public streamID: StreamID;
  #streamURL: string;
  #webSocket: Promise<WebSocket> | null = null;
  #connnected = false;
  #twizzleAccessToken: TwizzleAccessToken | null = null;
  constructor(
    public streamInfo: StreamInfo,
    streamURL: string,
    options?: {
      twizzleAccessToken?: TwizzleAccessToken;
    },
  ) {
    this.streamID = streamInfo.streamID;
    this.#streamURL = streamURL;
    this.#twizzleAccessToken = options?.twizzleAccessToken ?? null;
  }

  permittedToSend(): boolean {
    return !!this.#twizzleAccessToken;
  }

  connected(): boolean {
    return this.#connnected;
  }

  // Idempotent: reuses an existing connection (or pending connection)
  // Returns once connected.
  async connect(): Promise<void> {
    twizzleLog(this, "connecting", this.streamID);
    this.#webSocket ||= new Promise((resolve, reject) => {
      console.log(this.#streamURL);
      const socketURL = new URL(this.#streamURL);
      if (this.#twizzleAccessToken) {
        // TODO: avoid including this in the URL?
        socketURL.searchParams.set(
          "twizzleAccessToken",
          this.#twizzleAccessToken,
        );
      }
      const webSocket = new WebSocket(
        socketURL.toString(),
      );
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
  // deno-lint-ignore no-explicit-any
  sendMove(data: { timestamp: number; move: any }): void {
    (async () => {
      if (!this.#webSocket) {
        // TODO: write test
        throw new Error("cannot send to stream while disconnected");
      }
      (await this.#webSocket).send(
        JSON.stringify({
          event: "move",
          data,
        }),
      );
    })();
  }

  // deno-lint-ignore no-explicit-any
  onMessage(messageEvent: MessageEvent<any>): void {
    const message = JSON.parse(messageEvent.data); // TODO: error handling
    console.log("onMessage", message);
  }

  onClose(): void {
    twizzleLog(this, "closed:", this.streamID);
    this.#connnected = false;
  }
}
