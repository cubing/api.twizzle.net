import { Server } from "https://deno.land/std@0.65.0/http/server.ts";
import { TwizzleAPIServer } from "../api.twizzle.net/server/index.ts";
import { TwizzleAPIClient } from "../api.twizzle.net/client/index.ts";

console.log("Starting dev script.")

const server = new TwizzleAPIServer();
const client = new TwizzleAPIClient("http://127.0.0.1");

setTimeout(() => {
  const streamClient = client.streamClient();
}, 1000);
