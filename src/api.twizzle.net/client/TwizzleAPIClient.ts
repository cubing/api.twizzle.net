import { log } from "../common/log.ts";
import { TwizzleAPIStreamClient } from "./TwizzleAPIStreamClient.ts";

const streamPort = 4445;

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
    log(this, "starting");
  }

  streamClient(): TwizzleAPIStreamClient {
    return (this.#streamClient ||= new TwizzleAPIStreamClient(
      streamAPIURL(this.baseOrigin)
    ));
  }
}
