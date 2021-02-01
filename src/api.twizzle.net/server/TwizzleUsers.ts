import { TwizzleAccessToken, TwizzleUserID } from "../common/auth.ts";
import { WCAAccountInfo } from "../common/wca.ts";
import { newTwizzleAccessToken, newTwizzleUserID } from "./identifiers.ts";

class TwizzleUser {
  id: TwizzleUserID = newTwizzleUserID();
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
}
