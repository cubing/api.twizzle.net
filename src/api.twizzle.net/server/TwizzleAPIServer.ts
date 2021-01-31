
import { serve, Server, ServerRequest } from "https://deno.land/std@0.85.0/http/server.ts";
import {
  WebSocketServer
} from "https://deno.land/x/websocket@v0.0.5/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamID, StreamsGETResponse, StreamsPOSTResponse } from "../common/stream.ts";
import { ServerStream } from "./ServerStream.ts";

export const REST_SERVER_PORT = 4444;
export const STREAM_SERVER_PORT = 4445;

export class TwizzleAPIServer {
  streams: Map<StreamID, ServerStream> = new Map<StreamID, ServerStream>();

  restServer: Server;
  streamServer: WebSocketServer;
  constructor() {
    twizzleLog(this, "starting");

    twizzleLog(this, "starting REST server on port:", REST_SERVER_PORT);
    this.restServer = serve({ hostname: "0.0.0.0", port: REST_SERVER_PORT });
    this.restServerLoop();

    this.streamServer = new WebSocketServer(STREAM_SERVER_PORT);
  }

  async restServerLoop(): Promise<void> {
    for await (const request of this.restServer) {
      twizzleLog(this, "request for:", request.method, request.url);
      try {
        if (request.method === "GET" && request.url === "/streams") {
          this.getStreams(request)
        } else if (request.method === "POST" && request.url === "/streams") {
          this.postStreams(request);
        } else {
          request.respond({
            status: 404,
          });
        }
      } catch (e) {
        twizzleLog(this, "server error", e);
        request.respond({
          status: 500,
        });
      }
    }
  }

  getStreams(request: ServerRequest): void {
    const response: StreamsGETResponse = {
      streams: Array.from(this.streams.values()),
    };
    request.respond({
      status: 200,
      body: JSON.stringify(response),
    });
  }

  postStreams(request: ServerRequest): void {
    const stream: ServerStream = this.newStream();
    const response: StreamsPOSTResponse = {
      streamID: stream.streamID,
      streamClientToken: stream.streamClientToken,
    }
    request.respond({
      status: 200,
      body: JSON.stringify(response),
    });
  }

  newStream(): ServerStream {
    const stream = new ServerStream();
    this.streams.set(stream.streamID, stream);
    return stream;
  }
}
