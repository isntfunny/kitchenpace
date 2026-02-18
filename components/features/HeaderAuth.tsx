import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { HeaderAuthClient } from "./HeaderAuthClient";

export async function HeaderAuth() {
  const session = await getServerSession(authOptions);
  
  let profile = null;
  if (session?.user?.id) {
    profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });
  }

  return (
    <HeaderAuthClient 
      isAuthenticated={!!session} 
      profile={profile ? {
        photoUrl: profile.photoUrl,
        nickname: profile.nickname,
      } : null}
    />
  );
}
