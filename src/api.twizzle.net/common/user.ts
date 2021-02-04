import type { TwizzleAccessToken, TwizzleUserID } from "./auth.ts";
import { WCA_ID } from "./wca.ts";

export interface TwizzleUserPublicInfo {
  twizzleUserID: TwizzleUserID;
  wcaID: WCA_ID | null;
  name: string;
}

export interface TwizzleSessionInfo {
  twizzleAccessToken: TwizzleAccessToken;
  userInfo: TwizzleUserPublicInfo;
}
