import { ClaimToken, TwizzleAccessToken } from "../common/auth.ts";
import { prod, setProd } from "../common/config.ts";
import { twizzleLog } from "../common/log.ts";
import {
  StreamInfo,
  StreamsGETResponse,
  StreamsPOSTResponse,
} from "../common/stream.ts";
import { TwizzleSessionInfo } from "../common/user.ts";
import { wcaOAuthStartURL } from "../common/wca.ts";
import { StoredSessionInfo } from "./StoredSessionInfo.ts";
import { Stream } from "./Stream.ts";

function apiOrigin(): string {
  return prod() ? "https://api.twizzle.net/" : "http://127.0.0.1:4444";
}

function mainAPIURL(pathname?: string): string {
  const url = new URL(apiOrigin());
  if (pathname) {
    url.pathname = pathname;
  }
  return url.toString();
}

function streamAPIURL(pathname?: string): string {
  const url = new URL(apiOrigin());
  // We'd set `url.scheme`, but `deno` doesn't support that?
  url.protocol = prod() ? "wss:" : "ws:";
  if (pathname) {
    url.pathname = pathname;
  }
  return url.toString();
}

export class TwizzleAPIClient {
  storedSessionInfo: StoredSessionInfo;
  constructor(
    storage: Record<string, string>,
  ) {
    twizzleLog(this, "starting");
    this.storedSessionInfo = new StoredSessionInfo(storage);
  }

  async createStream(): Promise<Stream> {
    const createURL = new URL(mainAPIURL("/v0/streams"));
    const twizzleAccessToken = this.storedSessionInfo.twizzleAccessToken();
    if (twizzleAccessToken) {
      // TODO: avoid including this in the URL?
      createURL.searchParams.set(
        "twizzleAccessToken",
        twizzleAccessToken,
      );
    }

    const response: StreamsPOSTResponse = await (
      await fetch(createURL, {
        method: "POST",
      })
    ).json();

    const streamURL = new URL(streamAPIURL(
      `/v0/streams/${response.stream.streamID}/socket`,
    ));
    if (twizzleAccessToken) {
      // TODO: avoid including this in the URL?
      streamURL.searchParams.set(
        "twizzleAccessToken",
        twizzleAccessToken,
      );
    }
    return new Stream(
      response.stream,
      streamURL.toString(),
      this.storedSessionInfo,
    );
  }

  async streams(): Promise<Stream[]> {
    const response: StreamsGETResponse =
      await (await fetch(mainAPIURL("/v0/streams"))).json();
    return response.streams.map(
      (streamInfo: StreamInfo) =>
        new Stream(
          streamInfo,
          streamAPIURL(
            `/v0/streams/${streamInfo.streamID}/socket`,
          ),
          this.storedSessionInfo,
        ),
    );
  }

  wcaAuthURL(): string {
    return wcaOAuthStartURL();
  }

  authenticated(): boolean {
    return !!this.storedSessionInfo.twizzleAccessToken()?.startsWith(
      "twizzle_access_token_",
    );
  }

  myQualifiedName(): string {
    return this.storedSessionInfo.qualifiedName();
  }

  async claim(claimToken: ClaimToken): Promise<void> {
    const url = new URL(mainAPIURL("/v0/claim"));
    url.searchParams.set("claimToken", claimToken);
    const storedSessionInfo: TwizzleSessionInfo =
      (await (await fetch(url, { method: "POST" }))
        .json());
    this.storedSessionInfo.set(storedSessionInfo);
  }
}
