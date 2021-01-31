import { log } from "../common/log.ts";
import { StreamServer } from "./stream/index.ts";

export const STREAM_SERVER_PORT = 4445;

export class TwizzleAPIServer {
  public streamServer: StreamServer;
  constructor() {
    log(this, "starting");
    this.streamServer = new StreamServer(STREAM_SERVER_PORT);
  }
}
