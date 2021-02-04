import { TwizzleSessionInfo } from "../common/user.ts";
const STORED_SESSION_INFO_KEY = "twizzleSessionInfo";
export class StoredSessionInfo {
  // TODO: cache once this becomes hot?
  constructor(private storage: Record<string, string>) {
  }

  set(twizzleSessionInfo: TwizzleSessionInfo): void {
    // TODO: validate?
    this.storage[STORED_SESSION_INFO_KEY] = JSON.stringify(twizzleSessionInfo);
  }

  private twizzleSessionInfo(): TwizzleSessionInfo | null {
    const storedString = this.storage[STORED_SESSION_INFO_KEY];
    if (!storedString) {
      return null;
    }
    try {
      return JSON.parse(storedString);
    } catch (e) {
      console.error("could not parse stored session");
      return null;
    }
  }

  twizzleAccessToken(): string | null {
    return this.twizzleSessionInfo()?.twizzleAccessToken ?? null;
  }

  qualifiedName(): string {
    return this.twizzleSessionInfo()?.userInfo.name ?? "<not a user>";
  }

  twizzleUserID(): string | null {
    return this.twizzleSessionInfo()?.userInfo.twizzleUserID ?? null;
  }
}
