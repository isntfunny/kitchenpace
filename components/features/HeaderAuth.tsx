import { getLogtoContext } from "@logto/next/server-actions";
import { prisma } from "@/lib/prisma";
import { logtoConfig } from "@/app/logto";
import { HeaderAuthClient } from "./HeaderAuthClient";

export async function HeaderAuth() {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);
  
  let profile = null;
  if (isAuthenticated && claims?.sub) {
    profile = await prisma.profile.findUnique({
      where: { userId: claims.sub },
    });
  }

  return (
    <HeaderAuthClient 
      isAuthenticated={isAuthenticated} 
      profile={profile ? {
        photoUrl: profile.photoUrl,
        nickname: profile.nickname,
      } : null}
    />
  );
}
