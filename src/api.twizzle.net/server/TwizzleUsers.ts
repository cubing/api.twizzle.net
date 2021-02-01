import {
  ClaimToken,
  TwizzleAccessToken,
  TwizzleUserID,
} from "../common/auth.ts";
import { WCAAccountInfo } from "../common/wca.ts";
import {
  newClaimToken,
  newTwizzleAccessToken,
  newTwizzleUserID,
} from "./identifiers.ts";

export class TwizzleUser {
  id: TwizzleUserID = newTwizzleUserID();
  // TODO: multiple tokens?
  twizzleAccessToken = newTwizzleAccessToken(); // TODO: hash?
  constructor(public wcaAccountInfo: WCAAccountInfo) {}
}

export class TwizzleUsers {
  users: Map<TwizzleUserID, TwizzleUser> = new Map<
    TwizzleUserID,
    TwizzleUser
  >();
  tokenToUser: Map<TwizzleAccessToken, TwizzleUser> = new Map<
    TwizzleAccessToken,
    TwizzleUser
  >();
  availableClaims: Map<ClaimToken, TwizzleUser> = new Map<
    ClaimToken,
    TwizzleUser
  >();

  addWCAUser(wcaAccountInfo: WCAAccountInfo): TwizzleUser {
    const user = new TwizzleUser(wcaAccountInfo);
    this.addUser(user);
    return user;
  }

  addUser(user: TwizzleUser): void {
    this.users.set(user.id, user);
    this.tokenToUser.set(user.twizzleAccessToken, user);
  }

  removeUser(user: TwizzleUser): void {
    // TODO: Error handling in case one/both fails?
    this.users.delete(user.id);
    this.tokenToUser.delete(user.twizzleAccessToken);
  }

  // TODO: timeout?
  createClaimToken(user: TwizzleUser): ClaimToken {
    const claimToken = newClaimToken();
    this.availableClaims.set(claimToken, user);
    return claimToken;
  }

  claim(claimToken: ClaimToken): TwizzleUser | null {
    const maybeUser = this.availableClaims.get(claimToken);
    if (!maybeUser) {
      return null;
    }
    this.availableClaims.delete(claimToken);
    return maybeUser;
  }
}
