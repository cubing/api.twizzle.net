import {
  ClaimToken,
  TwizzleAccessToken,
  TwizzleUserID,
} from "../../common/auth.ts";
// import googleCloudDatastore from "https://cdn.skypack.dev/@google-cloud/datastore";
import Storage from "../../vendor/Storage.js";
import { TwizzleUser } from "./TwizzleUser.ts";

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
const wcaAccountIDIndex: StorageBackedMap<string, TwizzleUserID> =
  new StorageBackedMap<
    string,
    TwizzleUserID
  >("./data/wcaAccountIDIndex.json");

export const tables = {
  users,
  tokenIndex,
  claimIndex,
  wcaAccountIDIndex,
};
