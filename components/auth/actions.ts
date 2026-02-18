"use server";

import { signIn as authSignIn, signOut as authSignOut } from "next-auth/react";

export async function handleSignIn() {
  await authSignIn("credentials", { callbackUrl: "/" });
}

export async function handleSignOut() {
  await authSignOut({ callbackUrl: "/" });
}
