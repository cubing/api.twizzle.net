import { StreamServer } from "./stream/index.ts";

export const STREAM_SERVER_PORT = 4445;

export class TwizzleAPIServer {
  public streamServer?: StreamServer;
  constructor() {
    this.streamServer = new StreamServer(STREAM_SERVER_PORT);
  }
}
