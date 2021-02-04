import { prod } from "../common/config.ts";

export const TWIZZLE_WCA_APPLICATION_CLIENT_SECRET = Deno.env.get(
  "TWIZZLE_WCA_APPLICATION_CLIENT_SECRET",
)!;

if (!TWIZZLE_WCA_APPLICATION_CLIENT_SECRET) {
  console.error(
    "\n\n\n\nTWIZZLE_WCA_APPLICATION_CLIENT_SECRET is missing. Run:\n\n    read -x TWIZZLE_WCA_APPLICATION_CLIENT_SECRET\n\n\n\n",
  );
  Deno.exit(1);
}

export function CLIENT_APP_URL(): string {
  return prod() ? "https://twizzle.net/stream/" : "http://localhost:1234/";
}
