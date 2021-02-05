import { ensureDirSync } from "https://deno.land/std@0.85.0/fs/ensure_dir.ts";
import {
  ClaimToken,
  TwizzleAccessToken,
  TwizzleUserID,
} from "../../common/auth.ts";
import { TwizzleUserPublicInfo } from "../../common/user.ts";
import { WCAAccountID, WCAAccountInfo } from "../../common/wca.ts";
import { BufferedLogFile } from "../BufferedLogFile.ts";
import {
  newClaimToken,
  newTwizzleAccessToken,
  newTwizzleUserID,
} from "../identifiers.ts";
import { tables } from "./tables.ts";

ensureDirSync("./data/log/users");
const usersLog = new BufferedLogFile("./data/log/users/users.log");

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
    const wcaID = fullInfo.wcaAccountInfo.wcaUserInfo.wca_id;
    const name = `${fullInfo.wcaAccountInfo.wcaUserInfo.name} (${wcaID ??
      "unverified"})`;
    return {
      twizzleUserID: id,
      wcaID,
      name,
    };
  }

  static findByWCAAccountID(wcaAccountID: WCAAccountID): TwizzleUser | null {
    const maybeUserID = tables.wcaAccountIDIndex.get(wcaAccountID.toString());
    if (!maybeUserID) {
      return null;
    }
    const maybeUser = tables.users.get(maybeUserID);
    if (!maybeUser) {
      return null;
    }
    return maybeUser;
  }

  static findByClaimToken(claimToken: ClaimToken): TwizzleUser | null {
    const maybeUserID = tables.claimIndex.get(claimToken);
    if (!maybeUserID) {
      return null;
    }
    const maybeUser = tables.users.get(maybeUserID);
    if (!maybeUser) {
      return null;
    }
    tables.claimIndex.delete(claimToken);
    usersLog.log({
      event: "claim-user",
      id: maybeUser.id,
      claimTokenEnding: claimToken.slice(-4),
    });
    return maybeUser;
  }

  static findByTwizzleAccessToken(
    twizzleAccessToken: TwizzleAccessToken,
  ): TwizzleUser | null {
    const maybeUserID = tables.tokenIndex.get(twizzleAccessToken);
    if (!maybeUserID) {
      return null;
    }
    const maybeUser = tables.users.get(maybeUserID);
    if (!maybeUser) {
      return null;
    }
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
  usersLog.log({
    event: "user-add",
    userID: user.id,
    wcaUserInfo: user.wcaAccountInfo.wcaUserInfo,
  });
  tables.tokenIndex.set(user.twizzleAccessToken, user.id);
  const wcaAccountID = user.wcaAccountInfo.wcaUserInfo.id;
  if (wcaAccountID) {
    tables.wcaAccountIDIndex.set(wcaAccountID.toString(), user.id);
  }
}

export function removeUser(user: TwizzleUser): void {
  usersLog.log({
    event: "user-remove",
    userID: user.id,
  });
  // TODO: Error handling in case one/both fails?
  tables.users.delete(user.id);
  tables.tokenIndex.delete(user.twizzleAccessToken);
}

// TODO: timeout?
export function createClaimToken(user: TwizzleUser): ClaimToken {
  const claimToken = newClaimToken();
  tables.claimIndex.set(claimToken, user.id);
  usersLog.log({
    event: "claim-create",
    userID: user.id,
    claimTokenEnding: claimToken.slice(-4),
  });
  return claimToken;
}
