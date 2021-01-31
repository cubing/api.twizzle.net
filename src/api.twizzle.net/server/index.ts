import { log } from "../common/log.ts";
import { MainServer } from "./MainServer.ts";
import { StreamServer } from "./StreamServer.ts";

export const STREAM_SERVER_PORT = 4445;

export class TwizzleAPIServer {
  public mainServer: MainServer
  public streamServer: StreamServer;
  constructor() {
    log(this, "starting");
    this.mainServer = new MainServer();
    this.streamServer = new StreamServer(STREAM_SERVER_PORT);
  }
}
