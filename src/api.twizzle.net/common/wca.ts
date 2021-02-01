// deno-lint-ignore-file  camelcase

const TWIZZLE_CLIENT_ID = "3GaLUmFKGG-61B1KTmkJnu2NWNbCmuKANvRuAcwKM-E";
const REDIRECT_URI = "http://localhost:4444/v0/auth/wca/oauth_callback";

export type WCAAccountID = number;

export interface WCAAuthInfo {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: "public";
  create_at: number; // unix seconds
}

export interface WCAUserInfo {
  class: "user";
  url: string; // can be empty
  id: WCAAccountID;
  wca_id: string | null;
  name: string;
  country_iso2: string;
  // delegate_status
  created_at: string;
  updated_at: string;
  // teams
  avatar: {
    url: string;
    thumb_url: string;
  };
}

export interface WCAAccountInfo {
  wcaAuthInfo: WCAAuthInfo;
  wcaUserInfo: WCAUserInfo;
}

export function wcaOAuthStartURL(): string {
  const url = new URL("https://www.worldcubeassociation.org/oauth/authorize");
  url.searchParams.set("client_id", TWIZZLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "");
  return url.toString();
}

export async function wcaGetToken(
  code: string,
  wcaApplicationClientSecret: string,
): Promise<WCAAccountInfo> {
  const wcaTokenURL = new URL(
    "https://www.worldcubeassociation.org/oauth/token",
  );
  wcaTokenURL.searchParams.set("grant_type", "authorization_code");
  wcaTokenURL.searchParams.set(
    "client_id",
    TWIZZLE_CLIENT_ID,
  );
  wcaTokenURL.searchParams.set(
    "client_secret",
    wcaApplicationClientSecret, // TODO
  );
  wcaTokenURL.searchParams.set(
    "code",
    code, // TODO
  );
  wcaTokenURL.searchParams.set(
    "redirect_uri",
    REDIRECT_URI,
  );

  console.log(wcaTokenURL.toString());

  const wcaAuthInfo: WCAAuthInfo =
    await (await fetch(wcaTokenURL.toString(), { method: "POST" })).json();
  console.log(wcaAuthInfo);

  const wcaUserInfo: WCAUserInfo =
    await (await fetch("https://www.worldcubeassociation.org/api/v0/me", {
      headers: {
        "Authorization":
          `${wcaAuthInfo.token_type} ${wcaAuthInfo.access_token}`,
      },
    })).json();

  console.log(wcaUserInfo);

  return { wcaAuthInfo, wcaUserInfo };
}
