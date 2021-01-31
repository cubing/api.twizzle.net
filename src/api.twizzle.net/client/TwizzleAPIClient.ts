import { twizzleLog } from "../common/log.ts";
import {
  StreamInfo,
  StreamsGETResponse,
  StreamsPOSTResponse,
} from "../common/stream.ts";
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
  constructor(private baseOrigin: string) {
    twizzleLog(this, "starting");
  }

  async createStream(): Promise<Stream> {
    const response: StreamsPOSTResponse = await (
      await fetch(mainAPIURL(this.baseOrigin, "/v0/streams"), {
        method: "POST",
      })
    ).json();
    return new Stream(
      streamAPIURL(this.baseOrigin, `/v0/streams/${response.streamID}/socket`),
      response.streamID,
      {
        streamClientToken: response.streamClientToken,
      },
    );
  }

  async streams(): Promise<Stream[]> {
    const response: StreamsGETResponse =
      await (await fetch(mainAPIURL(this.baseOrigin, "/v0/streams"))).json();
    return response.streams.map(
      (streamInfo: StreamInfo) =>
        new Stream(
          streamAPIURL(
            this.baseOrigin,
            `/v0/streams/${streamInfo.streamID}/socket`,
          ),
          streamInfo.streamID,
        ),
    );
  }
}
