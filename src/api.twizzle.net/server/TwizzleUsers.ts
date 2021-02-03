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

// import googleCloudDatastore from "https://cdn.skypack.dev/@google-cloud/datastore";
import Storage from "../vendor/Storage.js";
import { tables } from "./db/tables.ts";

class StorageBackedMap<K extends string, V> {
  storage: Storage;
  constructor(path: string) {
    this.storage = new Storage(path);
  }

  set(key: K, value: V): void {
    this.storage.setItem(key, JSON.stringify(value));
  }

  get(key: K): V {
    return JSON.parse(this.storage.getItem(key)) as V;
  }

  delete(key: K): void {
    this.storage.removeItem(key);
  }
}

export class TwizzleUser {
  id: TwizzleUserID = newTwizzleUserID();
  // TODO: multiple tokens?
  twizzleAccessToken = newTwizzleAccessToken(); // TODO: hash?
  constructor(public wcaAccountInfo: WCAAccountInfo) {}
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

export function claim(claimToken: ClaimToken): TwizzleUser | null {
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

export function tokenToUser(
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
