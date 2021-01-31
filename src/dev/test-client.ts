import { TwizzleAPIClient } from "../api.twizzle.net/client/index.ts";

console.log("Starting dev script.");

const client = new TwizzleAPIClient("http://127.0.0.1");

setTimeout(async () => {
  const listeningStream = (await client.streams())[0];
  await listeningStream.connect();
}, 1000);
