"use server";

import { signIn } from "@logto/next/server-actions";
import { logtoConfig, LOGTO_CALLBACK_URL } from "@/app/logto";

export async function handleSignIn() {
  await signIn(logtoConfig, { redirectUri: LOGTO_CALLBACK_URL });
}
