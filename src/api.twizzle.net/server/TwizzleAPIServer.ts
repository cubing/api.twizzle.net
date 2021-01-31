
import { serve, Server, ServerRequest } from "https://deno.land/std@0.85.0/http/server.ts";
import {
  acceptable,
  acceptWebSocket,
  WebSocket
} from "https://deno.land/std@0.85.0/ws/mod.ts";
import { twizzleLog } from "../common/log.ts";
import { StreamID, StreamsGETResponse, StreamsPOSTResponse } from "../common/stream.ts";
import { ServerStream } from "./ServerStream.ts";

export const REST_SERVER_PORT = 4444;
export const STREAM_SERVER_PORT = 4445;

export class TwizzleAPIServer {
  streams: Map<StreamID, ServerStream> = new Map<StreamID, ServerStream>();

  restServer: Server;
  constructor() {
    twizzleLog(this, "starting REST server on port:", REST_SERVER_PORT);
    this.restServer = serve({ hostname: "0.0.0.0", port: REST_SERVER_PORT });
    this.restServerLoop();
  }

  async restServerLoop(): Promise<void> {
    for await (const request of this.restServer) {
      twizzleLog(this, "request for:", request.method, request.url);
      try {
        const pathParts = request.url.split("/").slice(1);
        if (request.method === "GET" && request.url === "/streams") {
          this.getStreams(request);
        } else if (request.method === "POST" && request.url === "/streams") {
          this.postStreams(request);
        } else if (request.method === "GET" && request.url.startsWith("/streams/") && pathParts.length === 3 && pathParts[2] === "socket" && acceptable(request)) {
          // Note: no `await`
          this.streamsSocketHandler(request, pathParts[1]);
        } else {
          request.respond({
            status: 400,
          });
        }
      } catch (e) {
        twizzleLog(this, "server error", e, request);
        request.respond({
          status: 500,
        });
      }
    }
  }

  async streamsSocketHandler(request: ServerRequest, streamID: StreamID): Promise<void> {
    const stream: ServerStream | undefined = this.streams.get(streamID);
    if (!stream) {
      request.respond({
        status: 404,
        body: "stream ID is unknown"
      });
      return;
    }

    // TODO: this is a total hack.
    const params = new URLSearchParams(request.headers.get("sec-websocket-protocol") ?? "");
    const maybeToken: string | null = params.get("token");

    if (maybeToken) {
      if (!stream.isValidToken(maybeToken)) {
      request.respond({
        status: 401,
        body: "invalid token sent"
      });
      return;
      }
    }

    twizzleLog(this, "adding client for stream:", streamID)
    const webSocket: WebSocket = (await acceptWebSocket({
      conn: request.conn,
      bufReader: request.r,
      bufWriter: request.w,
      headers: request.headers,
    }));
    
    stream.addClient(webSocket, {
      streamClientToken: maybeToken
    })
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
