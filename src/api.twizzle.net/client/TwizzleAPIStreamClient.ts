import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { log } from "../common/log.ts";
import { StreamID } from "../common/stream.ts";

export class TwizzleAPIStreamClient {
  private webSocket: Promise<WebSocket>;
  constructor(url: string) {
    log(this, "starting with url", url);
    this.webSocket = new Promise((resolve, reject) => {
      const webSocket = new WebSocket(url);
      webSocket.once("open", () => {
        log(this, "connected");
        resolve(webSocket);
      });
      setTimeout(reject, 10000); // TODO: exponential retry?
    });
  }

  getActiveStreams(): Promise<StreamID[]> {
    return new Promise((resolve, reject) => {
      (async () => {
        (await this.webSocket).send(
          JSON.stringify({
            event: "request-to-send",
          })
        );
        (await this.webSocket).once("message", (message: string) => {
          resolve([message]);
        })
      })();
      setTimeout(reject, 10000); // TODO: exponential retry?
    });
  }
}
