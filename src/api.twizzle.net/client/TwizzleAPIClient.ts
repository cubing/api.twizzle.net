import { twizzleLog } from "../common/log.ts";
import { StreamInfo, StreamsGETResponse, StreamsPOSTResponse } from "../common/stream.ts";
import { TwizzleAPIStreamClient } from "./TwizzleAPIStreamClient.ts";
import { Stream } from "./Stream.ts";

const mainPort = 4444;
const streamPort = 4445;

function mainAPIURL(baseOrigin: string, pathname?: string): string {
  const url = new URL(baseOrigin);
  url.port = mainPort.toString();
  if (pathname) {
    url.pathname = pathname;
  }
  return url.toString();
}

function streamAPIURL(baseOrigin: string): string {
  const url = new URL(baseOrigin);
  // We'd set `url.scheme`, but `deno` doesn't support that?
  url.protocol = "ws:";
  url.port = streamPort.toString();
  return url.toString();
}

export class TwizzleAPIClient {
  #streamClient: TwizzleAPIStreamClient | null = null;

  constructor(private baseOrigin: string) {
    twizzleLog(this, "starting");
  }

  async createStream(): Promise<Stream> {
    const response: StreamsPOSTResponse = await (
      await fetch(mainAPIURL(this.baseOrigin, "/streams"), {
        method: "POST",
      })
    ).json();
    return new Stream(streamAPIURL(this.baseOrigin), response.streamID, {
      streamClientToken: response.streamClientToken,
    });
  }

  private streamClient(): TwizzleAPIStreamClient {
    return (this.#streamClient ||= new TwizzleAPIStreamClient(
      streamAPIURL(this.baseOrigin)
    ));
  }

  async streams(): Promise<Stream[]> {
    const response: StreamsGETResponse = await (await fetch(mainAPIURL(this.baseOrigin, "/streams"))).json();
    return response.streams.map((streamInfo: StreamInfo) => new Stream(streamAPIURL(this.baseOrigin), streamInfo.streamID, {
      streamClientToken: streamInfo.streamClientToken
    }))
  }
}
