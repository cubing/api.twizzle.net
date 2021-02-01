import { ClaimToken, TwizzleAccessToken } from "../common/auth.ts";
import { twizzleLog } from "../common/log.ts";
import {
  StreamInfo,
  StreamsGETResponse,
  StreamsPOSTResponse,
} from "../common/stream.ts";
import { wcaOAuthStartURL } from "../common/wca.ts";
import { Stream } from "./Stream.ts";

const mainPort = 4444;
const streamPort = mainPort; // TODO

function mainAPIURL(baseOrigin: string, pathname?: string): string {
  const url = new URL(baseOrigin);
  url.port = mainPort.toString();
  if (pathname) {
    url.pathname = pathname;
  }
  return url.toString();
}

function streamAPIURL(baseOrigin: string, pathname?: string): string {
  const url = new URL(baseOrigin);
  // We'd set `url.scheme`, but `deno` doesn't support that?
  url.protocol = "ws:";
  url.port = streamPort.toString();
  if (pathname) {
    url.pathname = pathname;
  }
  return url.toString();
}

export class TwizzleAPIClient {
  constructor(
    private baseOrigin: string,
    private storage: Record<string, string>,
  ) {
    twizzleLog(this, "starting");
  }

  async createStream(): Promise<Stream> {
    const url = new URL(mainAPIURL(this.baseOrigin, "/v0/streams"));
    const twizzleAccessToken = this.twizzleAccessToken();
    if (twizzleAccessToken) {
      // TODO: avoid including this in the URL?
      url.searchParams.set(
        "twizzleAccessToken",
        twizzleAccessToken,
      );
    }

    const response: StreamsPOSTResponse = await (
      await fetch(url, {
        method: "POST",
      })
    ).json();
    return new Stream(
      response.streamID,
      streamAPIURL(this.baseOrigin, `/v0/streams/${response.streamID}/socket`),
      {
        twizzleAccessToken: this.twizzleAccessToken() ?? undefined,
      },
    );
  }

  async streams(): Promise<Stream[]> {
    const response: StreamsGETResponse =
      await (await fetch(mainAPIURL(this.baseOrigin, "/v0/streams"))).json();
    return response.streams.map(
      (streamInfo: StreamInfo) =>
        new Stream(
          streamInfo.streamID,
          streamAPIURL(
            this.baseOrigin,
            `/v0/streams/${streamInfo.streamID}/socket`,
          ),
        ),
    );
  }

  wcaAuthURL(): string {
    return wcaOAuthStartURL();
  }

  twizzleAccessToken(): TwizzleAccessToken | null {
    const token = this.storage["twizzleAccessToken"];
    if (
      !token ||
      !token.startsWith(
        "twizzle_access_token_",
      )
    ) {
      return null;
    }
    return token;
  }

  authenticated(): boolean {
    return this.storage["twizzleAccessToken"].startsWith(
      "twizzle_access_token_",
    );
  }

  async claim(claimToken: ClaimToken): Promise<void> {
    const url = new URL(mainAPIURL(this.baseOrigin, "/v0/claim"));
    url.searchParams.set("claimToken", claimToken);
    const twizzleAccessToken: TwizzleAccessToken =
      (await (await fetch(url, { method: "POST" }))
        .json()).twizzleAccessToken;
    this.storage["twizzleAccessToken"] = twizzleAccessToken;
  }
}
