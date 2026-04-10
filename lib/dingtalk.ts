import { prisma } from "./prisma";

interface AccessTokenResponse {
  accessToken: string;
  expireIn: number;
}

interface UserInfoResponse {
  userid: string;
  name: string;
  avatar: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getDingTalkConfig() {
  try {
    const [appKeyRow, appSecretRow] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { configKey: "dingtalk_app_key" } }),
      prisma.systemConfig.findUnique({ where: { configKey: "dingtalk_app_secret" } }),
    ]);
    const appKey = appKeyRow?.configValue || process.env.DINGTALK_APP_KEY || "";
    const appSecret = appSecretRow?.configValue || process.env.DINGTALK_APP_SECRET || "";
    return { appKey, appSecret };
  } catch {
    return {
      appKey: process.env.DINGTALK_APP_KEY || "",
      appSecret: process.env.DINGTALK_APP_SECRET || "",
    };
  }
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const { appKey, appSecret } = await getDingTalkConfig();

  const res = await fetch(
    "https://api.dingtalk.com/v1.0/oauth2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appKey, appSecret }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to get DingTalk access token: ${res.status}`);
  }

  const data = (await res.json()) as AccessTokenResponse;
  cachedToken = {
    token: data.accessToken,
    expiresAt: Date.now() + (data.expireIn - 300) * 1000,
  };

  return data.accessToken;
}

export async function getUserInfoByCode(authCode: string): Promise<UserInfoResponse> {
  const accessToken = await getAccessToken();

  const tokenRes = await fetch(
    "https://api.dingtalk.com/v1.0/oauth2/userAccessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: (await getDingTalkConfig()).appKey,
        clientSecret: (await getDingTalkConfig()).appSecret,
        code: authCode,
        grantType: "authorization_code",
      }),
    }
  );

  if (!tokenRes.ok) {
    throw new Error(`Failed to get user access token: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  const userAccessToken = tokenData.accessToken;

  const userRes = await fetch(
    "https://api.dingtalk.com/v1.0/contact/users/me",
    {
      headers: {
        "x-acs-dingtalk-access-token": userAccessToken,
        "Content-Type": "application/json",
      },
    }
  );

  if (!userRes.ok) {
    throw new Error(`Failed to get user info: ${userRes.status}`);
  }

  const userInfo = await userRes.json();

  // Also get userid via server-side API for reliable matching
  const serverUserRes = await fetch(
    `https://oapi.dingtalk.com/topapi/v2/user/getbymobile?access_token=${accessToken}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: userInfo.mobile }),
    }
  );

  let userid = userInfo.openId;
  if (serverUserRes.ok) {
    const serverData = await serverUserRes.json();
    if (serverData.result?.userid) {
      userid = serverData.result.userid;
    }
  }

  return {
    userid,
    name: userInfo.nick || userInfo.name || "Unknown",
    avatar: userInfo.avatarUrl || "",
  };
}

export async function getUserIdByAuthCode(authCode: string): Promise<UserInfoResponse> {
  return getUserInfoByCode(authCode);
}
