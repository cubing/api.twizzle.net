import type { TwizzleAccessToken, TwizzleUserID } from "./auth.ts";

export interface TwizzleUserPublicInfo {
  twizzleUserID: TwizzleUserID;
  wcaID: string | null;
  name: string;
}

export interface TwizzleSessionInfo {
  twizzleAccessToken: TwizzleAccessToken;
  userInfo: TwizzleUserPublicInfo;
}
