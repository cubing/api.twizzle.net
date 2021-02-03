import {
  ClaimToken,
  TwizzleAccessToken,
  TwizzleUserID,
} from "../../common/auth.ts";
import { WCAAccountInfo } from "../../common/wca.ts";
import {
  newClaimToken,
  newTwizzleAccessToken,
  newTwizzleUserID,
} from "../identifiers.ts";

// import googleCloudDatastore from "https://cdn.skypack.dev/@google-cloud/datastore";
import Storage from "../../vendor/Storage.js";
import { TwizzleUser } from "../TwizzleUsers.ts";

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

const users: StorageBackedMap<TwizzleUserID, TwizzleUser> =
  new StorageBackedMap<
    TwizzleUserID,
    TwizzleUser
  >("./data/users.json");
const tokenIndex: StorageBackedMap<TwizzleAccessToken, TwizzleUserID> =
  new StorageBackedMap<
    TwizzleAccessToken,
    TwizzleUserID
  >("./data/tokenIndex.json");
const claimIndex: StorageBackedMap<ClaimToken, TwizzleUserID> =
  new StorageBackedMap<
    ClaimToken,
    TwizzleUserID
  >("./data/claimIndex.json");

export const tables = {
  users,
  tokenIndex,
  claimIndex,
};
