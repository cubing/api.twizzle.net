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

export class TwizzleUsers {
  users: StorageBackedMap<TwizzleUserID, TwizzleUser> = new StorageBackedMap<
    TwizzleUserID,
    TwizzleUser
  >("./data/users.json");
  tokenToUser: StorageBackedMap<TwizzleAccessToken, TwizzleUser> =
    new StorageBackedMap<
      TwizzleAccessToken,
      TwizzleUser
    >("./data/tokenToUser.json");
  availableClaims: StorageBackedMap<ClaimToken, TwizzleUser> =
    new StorageBackedMap<
      ClaimToken,
      TwizzleUser
    >("./data/availableClaims.json");

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
