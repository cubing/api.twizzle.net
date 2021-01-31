import { WebSocket } from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { log } from "../common/log.ts";

export class TwizzleAPIStreamClient {
  private webSocket: WebSocket;
  constructor(url: string) {
    log(this, "starting with url", url);
    this.webSocket = new WebSocket(url);
    this.webSocket.once("open", () => {
      log(this, "connected");
    });
  }
}
