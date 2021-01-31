import {
  serve,
  Server,
  ServerRequest,
} from "https://deno.land/std@0.85.0/http/server.ts";
import {
  acceptable,
  acceptWebSocket,
  WebSocket,
} from "https://deno.land/std@0.85.0/ws/mod.ts";
import { twizzleLog } from "../common/log.ts";
import {
  StreamID,
  StreamsGETResponse,
  StreamsPOSTResponse,
} from "../common/stream.ts";
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
      const headers = new Headers({ "Access-Control-Allow-Origin": "*" });
      twizzleLog(this, "request for:", request.method, request.url);
      try {
        const path = new URL(request.url, "https://localhost");
        const pathParts = path.pathname.split("/").slice(1);
        if (request.method === "OPTIONS" && request.url === "/v0/streams") {
          request.respond({
            status: 200,
            headers,
          });
        }
        if (request.method === "GET" && request.url === "/v0/streams") {
          this.getStreams(request, headers);
        } else if (request.method === "POST" && request.url === "/v0/streams") {
          this.postStreams(request, headers);
        } else if (
          request.method === "GET" && request.url.startsWith("/v0/streams/") &&
          pathParts.length === 4 && pathParts[3] === "socket" &&
          acceptable(request)
        ) {
          // Note: no `await`
          this.streamsSocketHandler(request, pathParts[2]);
        } else {
          request.respond({
            status: 400,
            headers,
          });
        }
      } catch (e) {
        twizzleLog(this, "server error", e, request);
        request.respond({
          status: 500,
          headers,
        });
      }
    }
  }

  async streamsSocketHandler(
    request: ServerRequest,
    streamID: StreamID,
  ): Promise<void> {
    const stream: ServerStream | undefined = this.streams.get(streamID);
    if (!stream) {
      request.respond({
        status: 404,
        body: "stream ID is unknown",
      });
      return;
    }

    // TODO: don't include the token in the URL?
    // Or maybe rename it to "secret streaming URL"?
    const maybeToken: string | null = new URL(request.url, "http://localhost")
      .searchParams.get(
        "token",
      );

    if (maybeToken) {
      if (!stream.isValidToken(maybeToken)) {
        twizzleLog(this, "invalid token for", streamID);
        request.respond({
          status: 401,
          body: "invalid token sent",
        });
        return;
      }
    }

    twizzleLog(this, "adding client for stream:", streamID);
    const webSocket: WebSocket = (await acceptWebSocket({
      conn: request.conn,
      bufReader: request.r,
      bufWriter: request.w,
      headers: request.headers,
    }));

    stream.addClient(webSocket, {
      streamClientToken: maybeToken,
    });
  }

  getStreams(request: ServerRequest, headers: Headers): void {
    const response: StreamsGETResponse = {
      streams: Array.from(this.streams.values()),
    };
    request.respond({
      status: 200,
      body: JSON.stringify(response),
      headers,
    });
  }

  postStreams(request: ServerRequest, headers: Headers): void {
    const stream: ServerStream = this.newStream();
    const response: StreamsPOSTResponse = {
      streamID: stream.streamID,
      streamClientToken: stream.streamClientToken,
    };
    request.respond({
      status: 200,
      body: JSON.stringify(response),
      headers,
    });
  }

  newStream(): ServerStream {
    const stream = new ServerStream(this.streamTerminated.bind(this));
    this.streams.set(stream.streamID, stream);
    return stream;
  }

  streamTerminated(stream: ServerStream): void {
    this.streams.delete(stream.streamID);
  }
}
