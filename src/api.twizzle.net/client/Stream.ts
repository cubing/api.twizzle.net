import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamID, StreamClientToken } from "../common/stream.ts";

export class Stream {
  #webSocket: Promise<WebSocket> | null = null;
  #connnected = false;
  #streamClientToken: StreamClientToken | null;
  constructor(
    private streamURL: string,
    public streamID: StreamID,
    options?: {
      streamClientToken?: StreamClientToken;
    }
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
      const webSocket = new WebSocket(this.streamURL);
      webSocket.once("open", () => {
        twizzleLog(this, "connected");
        webSocket.on("message", this.onMessage.bind(this))
        this.#connnected = true;
        resolve(webSocket);
      });
      setTimeout(reject, 10000); // TODO: exponential retry?
    });
    await this.#webSocket;
    return;
  }

  // Idempotent: does nothing if already disconnected (or disconnecting)
  // Returns once disconnected.
  async disconnect(): Promise<void> {
    await (await this.#webSocket)?.close();
    return;
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
      })
    );
  }

  onMessage(message: string): void {
    console.log(message);
  }
}
