import type { TwizzleUserID } from "./auth.ts";

export interface TwizzleUserPublicInfo {
  twizzleUserID: TwizzleUserID;
  wcaID: string | null;
  name: string;
}
