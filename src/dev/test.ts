import { Server } from "https://deno.land/std@0.65.0/http/server.ts";
import { TwizzleAPIServer } from "../api.twizzle.net/server/index.ts";
import { clientScaffolding } from "../api.twizzle.net/client/index.ts";

const server = new TwizzleAPIServer();
clientScaffolding();
