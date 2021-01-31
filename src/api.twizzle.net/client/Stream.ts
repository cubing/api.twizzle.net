// import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamClientToken, StreamID } from "../common/stream.ts";

export class Stream {
  #webSocket: Promise<WebSocket> | null = null;
  #connnected = false;
  #streamClientToken: StreamClientToken | null;
  constructor(
    private streamURL: string,
    public streamID: StreamID,
    options?: {
      streamClientToken?: StreamClientToken;
    },
  ) {
    this.#streamClientToken = options?.streamClientToken ?? null;
  }

  permittedToSend(): boolean {
    return !!this.#streamClientToken;
  }

  connected(): boolean {
    return this.#connnected;
  }

  // Idempotent: reuses an existing connection (or pending connection)
  // Returns once connected.
  async connect(): Promise<void> {
    twizzleLog(this, "connecting");
    this.#webSocket ||= new Promise((resolve, reject) => {
      const params = new URLSearchParams();
      if (this.#streamClientToken) {
        params.set("token", this.#streamClientToken);
      }
      const webSocket = new WebSocket(
        this.streamURL,
        params.toString() || undefined,
      );
      webSocket.onopen = () => {
        twizzleLog(this, "connected");
        webSocket.onmessage = this.onMessage.bind(this);
        webSocket.onclose = this.onClose.bind(this);
        this.#connnected = true;
        resolve(webSocket);
      };
      setTimeout(reject, 10000); // TODO: exponential retry?
    });
    await this.#webSocket;
    return;
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
  async sendMove(data: { timestamp: number; move: any }): Promise<void> {
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
  }

  // deno-lint-ignore no-explicit-any
  onMessage(messageEvent: MessageEvent<any>): void {
    const message = JSON.parse(messageEvent.data); // TODO: error handling
    console.log("onMessage", message);
  }

  onClose(): void {
    twizzleLog(this, "closed:", this.streamID);
  }
}
