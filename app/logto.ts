import type { LogtoNextConfig } from "@logto/next";

type RuntimeEnv = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const runtimeEnv = globalThis as RuntimeEnv;
const cookieSecure = runtimeEnv.process?.env?.NODE_ENV === "production";

const baseUrl = "https://xn--kchentakt-q9a.de";
const endpoint = "https://login.xn--kchentakt-q9a.de/";

export const logtoConfig: LogtoNextConfig = {
  endpoint,
  appId: "wyf1bzl7k0fhyg29aig6e",
  appSecret: "wUKLX1zXaDkn3f938C9bdDud55OrbkEX",
  baseUrl,
  cookieSecret: "BZJiu9WEZ0ZlZyfQijhX7qD8R70AAsEG",
  cookieSecure,
};

export const LOGTO_CALLBACK_PATH = "/logto/callback";
export const LOGTO_SIGN_OUT_CALLBACK_PATH = "/logto/sign-out";

const buildAbsoluteUrl = (path: string) => new URL(path, baseUrl).toString();
const buildLogtoPortalUrl = (hashPath: string) =>
  `${endpoint}${hashPath}?appId=${logtoConfig.appId}`;

export const LOGTO_CALLBACK_URL = buildAbsoluteUrl(LOGTO_CALLBACK_PATH);
export const LOGTO_SIGN_OUT_CALLBACK_URL = buildAbsoluteUrl(
  LOGTO_SIGN_OUT_CALLBACK_PATH,
);
export const LOGTO_FORGOT_PASSWORD_URL = buildLogtoPortalUrl("#/forget-password");
export const LOGTO_PASSWORD_EDIT_URL = buildLogtoPortalUrl("#/reset-password");
