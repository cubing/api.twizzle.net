import {
  ClaimToken,
  TwizzleAccessToken,
  TwizzleUserID,
} from "../../common/auth.ts";
import { TwizzleUserPublicInfo } from "../../common/user.ts";
import { WCAAccountInfo } from "../../common/wca.ts";
import {
  newClaimToken,
  newTwizzleAccessToken,
  newTwizzleUserID,
} from "../identifiers.ts";

import { tables } from "./tables.ts";

export class TwizzleUser {
  id: TwizzleUserID = newTwizzleUserID();
  // TODO: multiple tokens?
  twizzleAccessToken = newTwizzleAccessToken(); // TODO: hash?
  constructor(public wcaAccountInfo: WCAAccountInfo) {}

  static findByID(id: TwizzleUserID): TwizzleUser {
    return tables.users.get(id);
  }

  // TODO: use models better
  static publicInfo(id: TwizzleUserID): TwizzleUserPublicInfo {
    const fullInfo = tables.users.get(id);
    console.log({ fullInfo });
    const wcaID = fullInfo.wcaAccountInfo.wcaUserInfo.wca_id;
    const name = `${fullInfo.wcaAccountInfo.wcaUserInfo.name} (${wcaID ??
      "unverified"})`;
    return {
      twizzleUserID: id,
      wcaID,
      name,
    };
  }

  static findByClaimCoken(claimToken: ClaimToken): TwizzleUser | null {
    const maybeUserID = tables.claimIndex.get(claimToken);
    if (!maybeUserID) {
      return null;
    }
    const maybeUser = tables.users.get(maybeUserID);
    if (!maybeUser) {
      return null;
    }
    tables.claimIndex.delete(claimToken);
    return maybeUser;
  }

  static findByTwizzleAccessToken(
    twizzleAccessToken: TwizzleAccessToken,
  ): TwizzleUser | null {
    const maybeUserID = tables.tokenIndex.get(twizzleAccessToken);
    console.log("maybeUserID", twizzleAccessToken, maybeUserID);
    if (!maybeUserID) {
      return null;
    }
    const maybeUser = tables.users.get(maybeUserID);
    if (!maybeUser) {
      return null;
    }
    console.log("maybeUser", twizzleAccessToken, maybeUser.id);
    return maybeUser;
  }
}

export function addWCAUser(wcaAccountInfo: WCAAccountInfo): TwizzleUser {
  const user = new TwizzleUser(wcaAccountInfo);
  addUser(user);
  return user;
}

export function addUser(user: TwizzleUser): void {
  tables.users.set(user.id, user);
  tables.tokenIndex.set(user.twizzleAccessToken, user.id);
}

export function removeUser(user: TwizzleUser): void {
  // TODO: Error handling in case one/both fails?
  tables.users.delete(user.id);
  tables.tokenIndex.delete(user.twizzleAccessToken);
}

// TODO: timeout?
export function createClaimToken(user: TwizzleUser): ClaimToken {
  const claimToken = newClaimToken();
  tables.claimIndex.set(claimToken, user.id);
  return claimToken;
}
