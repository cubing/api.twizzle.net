import {
  ClaimToken,
  TwizzleAccessToken,
  TwizzleUserID,
} from "../common/auth.ts";
import { ClientID, StreamClientToken, StreamID } from "../common/stream.ts";

const DEFAULT_ENTROPY_NUM_BYTES = 8;

function buf2hex(buffer: Uint8Array): string {
  return Array.prototype.map
    .call(buffer, (x: number) => x.toString(16).padStart(2, "0"))
    .join("");
}

export function hexIDWithPrefix(
  prefix: string,
  options?: { entropyNumBytes?: number },
): StreamID {
  var array = new Uint8Array(
    options?.entropyNumBytes ?? DEFAULT_ENTROPY_NUM_BYTES,
  );
  window.crypto.getRandomValues(array);
  return `${prefix}${buf2hex(array)}`;
}

export function newStreamID(): StreamID {
  return hexIDWithPrefix("twizzle_stream_");
}

export function newClientID(): ClientID {
  return hexIDWithPrefix("client_");
}

export function newTwizzleUserID(): TwizzleUserID {
  return hexIDWithPrefix("user_");
}

export function newStreamClientToken(): StreamClientToken {
  return hexIDWithPrefix("token_", { entropyNumBytes: 16 });
}

export function newTwizzleAccessToken(): TwizzleAccessToken {
  return hexIDWithPrefix("twizzle_access_token_", { entropyNumBytes: 16 });
}

export function newClaimToken(): ClaimToken {
  return hexIDWithPrefix("claim_token_", { entropyNumBytes: 16 });
}
