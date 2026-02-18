"use server";

import { redirect } from "next/navigation";

export async function handleSignIn() {
  redirect("/auth/signin");
}

export async function handleSignOut() {
  redirect("/auth/signout");
}
