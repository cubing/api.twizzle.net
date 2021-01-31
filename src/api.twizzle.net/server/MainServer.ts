import { serve, Server } from "https://deno.land/std@0.85.0/http/server.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamsPostResponse } from "../common/stream.ts";
import { StreamServer } from "./StreamServer.ts";

export class MainServer {
  denoServer: Server;
  constructor(private streamServer: StreamServer, port: number) {
    twizzleLog(this, "starting on port:", port);
    this.denoServer = serve({ hostname: "0.0.0.0", port });
    this.mainLoop();
  }

  async mainLoop(): Promise<void> {
    for await (const request of this.denoServer) {
      twizzleLog(this, "request for:", request.method, request.url);
      try {
        if (request.method === "GET" && request.url === "/streams") {
          request.respond({
            status: 200,
            body: JSON.stringify(this.streamServer.streams.values()),
          });
        } else if (request.method === "POST" && request.url === "/streams") {
          const stream = this.streamServer.newStream();
          request.respond({
            status: 200,
            body: JSON.stringify({
              streamID: stream.streamID,
              streamClientToken: stream.sendingClientToken,
            } as StreamsPostResponse),
          });
        } else {
          request.respond({
            status: 404,
          });
        }
      } catch (e) {
        twizzleLog(this, "server error", e)
        request.respond({
          status: 500,
        });
      }
    }
  }
}
