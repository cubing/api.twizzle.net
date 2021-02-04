import { setProd } from "../api.twizzle.net/common/config.ts";
setProd(true);

import { TwizzleAPIServer } from "../api.twizzle.net/server/index.ts";

// TODO: Pass prod flag param here.
const server = new TwizzleAPIServer();
