import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamID } from "../common/stream.ts";

export class TwizzleAPIStreamClient {
  private webSocket: Promise<WebSocket>;
  constructor(urlString: string) {
    twizzleLog(this, "starting with url", urlString);
    this.webSocket = new Promise((resolve, reject) => {
      const webSocket = new WebSocket(urlString);
      webSocket.once("open", () => {
        twizzleLog(this, "connected");
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
