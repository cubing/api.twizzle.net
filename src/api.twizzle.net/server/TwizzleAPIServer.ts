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
import { TwizzleAccessToken } from "../common/auth.ts";
import { twizzleLog } from "../common/log.ts";
import {
  StreamID,
  StreamsGETResponse,
  StreamsPOSTResponse,
} from "../common/stream.ts";
import { TwizzleSessionInfo } from "../common/user.ts";
import { wcaGetToken } from "../common/wca.ts";
import {
  CLIENT_APP_URL,
  TWIZZLE_WCA_APPLICATION_CLIENT_SECRET,
} from "./config.ts";
import { addWCAUser, createClaimToken, TwizzleUser } from "./db/TwizzleUser.ts";
import { ServerStream } from "./ServerStream.ts";

export const PORT = 4444;

export class TwizzleAPIServer {
  // TODO: persist streams?
  // TODO: store stream metada in DB?
  streams: Map<StreamID, ServerStream> = new Map<StreamID, ServerStream>();

  restServer: Server;
  constructor() {
    twizzleLog(this, "starting server on port:", PORT);
    this.restServer = serve({ hostname: "0.0.0.0", port: PORT });
    this.restServerLoop();
  }

  async restServerLoop(): Promise<void> {
    for await (const request of this.restServer) {
      const headers = new Headers({ "Access-Control-Allow-Origin": "*" });
      twizzleLog(this, "request for:", request.method, request.url);
      try {
        const path = new URL(request.url, "https://localhost").pathname;
        const pathParts = path.split("/").slice(1);
        // if (request.method === "OPTIONS" && request.url === "/v0/streams") {
        //   request.respond({
        //     status: 200,
        //     headers,
        //   });
        // }
        if (request.method === "GET" && path === "/") {
          request.respond({
            status: 200,
            headers,
            body:
              "Welcome to api.twizzle.net\nContact Lucas Garron for more info.",
          });
        } else if (request.method === "GET" && path === "/v0/streams") {
          this.getStreams(request, headers);
        } else if (
          request.method === "POST" && path === "/v0/claim"
        ) {
          this.claim(request, headers);
        } else if (
          request.method === "GET" && path === "/v0/auth/wca/oauth_callback"
        ) {
          this.authWCACallback(request, headers);
        } else if (
          request.method === "POST" && path === "/v0/streams"
        ) {
          this.postStreams(request, headers);
        } else if (
          request.method === "GET" && path.startsWith("/v0/streams/") &&
          pathParts.length === 4 && pathParts[3] === "socket" &&
          acceptable(request)
        ) {
          // Note: no `await`
          this.streamsSocketHandler(request, headers, pathParts[2]);
        } else {
          request.respond({
            status: 400,
            headers,
          });
        }
      } catch (e) {
        twizzleLog(this, "server error", e);
        request.respond({
          status: 500,
          headers,
        });
      }
    }
  }

  userByParamToken(
    request: ServerRequest,
    headers: Headers,
  ): { haltNow: boolean; user: TwizzleUser | null } {
    // TODO: don't include the token in the URL?
    // Or maybe rename it to "secret streaming URL"?
    const maybeTwizzleAccessToken: TwizzleAccessToken | null = new URL(
      request.url,
      "http://localhost",
    ).searchParams.get(
      "twizzleAccessToken",
    );

    console.log("Sdfdsfsdf", request.url);

    if (!maybeTwizzleAccessToken) {
      return { haltNow: false, user: null };
    }

    const maybeUser = TwizzleUser.findByTwizzleAccessToken(
      maybeTwizzleAccessToken,
    );
    if (!maybeUser) {
      twizzleLog(this, "invalid twizzle access token");
      request.respond({
        status: 401,
        headers,
        body: "invalid twizzle access token",
      });
      return { haltNow: true, user: null };
    }

    console.log("maybaybaybyabyaya", maybeUser.id);

    return { haltNow: false, user: maybeUser };
  }

  async streamsSocketHandler(
    request: ServerRequest,
    headers: Headers,
    streamID: StreamID,
  ): Promise<void> {
    const stream: ServerStream | undefined = this.streams.get(streamID);
    if (!stream) {
      request.respond({
        status: 404,
        headers,
        body: "stream ID is unknown",
      });
      return;
    }

    const { haltNow, user } = this.userByParamToken(request, headers);
    if (haltNow) {
      return;
    }

    twizzleLog(
      this,
      "adding client for stream:",
      streamID,
      "for user:",
      user?.id,
    );
    const webSocket: WebSocket = (await acceptWebSocket({
      conn: request.conn,
      bufReader: request.r,
      bufWriter: request.w,
      headers: request.headers,
    }));

    stream.addClient(webSocket, user); // TODO: handle error?
  }

  getStreams(request: ServerRequest, headers: Headers): void {
    const response: StreamsGETResponse = {
      streams: Array.from(this.streams.values()).map((stream) =>
        stream.toJSON()
      ),
    };
    // console.log({ response });
    request.respond({
      status: 200,
      body: JSON.stringify(response),
      headers,
    });
  }

  postStreams(request: ServerRequest, headers: Headers): void {
    const { haltNow, user } = this.userByParamToken(request, headers);
    if (haltNow) {
      return;
    }

    const stream: ServerStream = this.newStream(user);
    const response: StreamsPOSTResponse = {
      stream: stream.toJSON(),
    };
    request.respond({
      status: 200,
      body: JSON.stringify(response),
      headers,
    });
  }

  newStream(user: TwizzleUser | null): ServerStream {
    console.log("newStreammamama", user?.id);
    const stream = new ServerStream(
      this.streamTerminated.bind(this),
      user ? [user] : [],
    );
    console.log("SDfsdf", stream.streamID, user?.id);
    this.streams.set(stream.streamID, stream);
    return stream;
  }

  streamTerminated(stream: ServerStream): void {
    this.streams.delete(stream.streamID);
  }

  // TODO: reuse OAuth claiming mechanism?
  claim(
    request: ServerRequest,
    headers: Headers,
  ): void {
    const maybeClaimToken = new URL(request.url, "https://localhost")
      .searchParams.get(
        "claimToken",
      );
    if (!maybeClaimToken) {
      request.respond({
        status: 400,
        headers,
      });
      return;
    }
    const maybeUser = TwizzleUser.findByClaimToken(maybeClaimToken);
    if (!maybeUser) {
      request.respond({
        status: 401,
        headers,
      });
      return;
    }
    twizzleLog(this, "claim token successfully used for user", maybeUser.id);
    const twizzleSessionInfo: TwizzleSessionInfo = {
      twizzleAccessToken: maybeUser.twizzleAccessToken,
      userInfo: TwizzleUser.publicInfo(maybeUser.id),
    };
    request.respond({
      status: 200,
      headers,
      body: JSON.stringify(twizzleSessionInfo),
    });
  }

  async authWCACallback(
    request: ServerRequest,
    headers: Headers,
  ): Promise<void> {
    const maybeCode = new URL(request.url, "https://localhost").searchParams
      .get(
        "code",
      );

    if (!maybeCode) {
      twizzleLog(this, "failed auth");
      request.respond({
        status: 400,
        headers,
        body: "code was not provided",
      });
      return;
    }

    const accountInfo = await wcaGetToken(
      maybeCode,
      TWIZZLE_WCA_APPLICATION_CLIENT_SECRET,
    );
    console.log(
      "accountInfo.wcaUserInfo.wca_id;",
      accountInfo.wcaUserInfo.wca_id,
    );
    const user: TwizzleUser = (accountInfo.wcaUserInfo.id &&
      TwizzleUser.findByWCAAccountID(accountInfo.wcaUserInfo.id)) ||
      addWCAUser(accountInfo);
    const url = new URL(CLIENT_APP_URL()); // TODO: return_to?
    url.searchParams.set("claimToken", createClaimToken(user));
    request.respond({
      status: 302,
      headers: new Headers({
        "Location": url.toString(),
      }),
    });
  }
}
