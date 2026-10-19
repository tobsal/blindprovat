"use server";

import { signIn, signOut } from "@/auth";

export async function logIn() {
  await signIn("github", { redirectTo: "/admin" });
}

export async function logOut() {
  await signOut({ redirectTo: "/" });
}
