import { signOut, getLogtoContext } from "@logto/next/server-actions";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { css } from "styled-system/css";

import SignOutButton from "@/components/auth/SignOutButton";
import { LOGTO_SIGN_OUT_CALLBACK_URL, logtoConfig } from "@/app/logto";
import { getOrCreateProfile } from "@/lib/profile";

const ProfilePage = async () => {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated || !claims?.sub) {
    redirect("/auth/signin");
  }

  const profile = await getOrCreateProfile(
    claims.sub,
    (claims.email as string | undefined) ?? "",
  );

  return (
    <section
      className={css({
        minH: "100vh",
        background: "#fff7f1",
        px: { base: "4", md: "8" },
        py: { base: "8", md: "14" },
        fontFamily: "body",
        color: "text",
      })}
    >
      <div
        className={css({
          maxW: "5xl",
          margin: "0 auto",
          background: "white",
          borderRadius: "3xl",
          boxShadow: "0 40px 120px rgba(224,123,83,0.25)",
          padding: { base: "8", md: "14" },
        })}
      >
        <div
          className={css({
            display: "flex",
            flexDir: { base: "column", md: "row" },
            gap: "8",
            alignItems: { base: "flex-start", md: "center" },
          })}
        >
          <div>
            {profile.photoUrl ? (
              <Image
                src={profile.photoUrl}
                alt={profile.nickname ?? "Profilfoto"}
                width={160}
                height={160}
                unoptimized
                className={css({
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "6px solid #fff7f1",
                  boxShadow: "0 15px 40px rgba(0,0,0,0.15)",
                })}
              />
            ) : (
              <div
                className={css({
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #ffe5d1, #ffc89e)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "4xl",
                  fontWeight: "700",
                })}
              >
                {(profile.nickname ?? "KT").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className={css({ flex: 1 })}>
            <p className={css({ color: "text-muted", letterSpacing: "widest", mb: "1" })}>
              KüchenTakt Profil
            </p>
            <h1 className={css({ fontSize: "4xl", fontWeight: "800", mb: "3" })}>
              {profile.nickname ?? "Neuer KüchenFan"}
            </h1>
            <p className={css({ color: "text-muted", mb: "4", lineHeight: "1.8" })}>
              {profile.teaser ?? "Lass andere wissen, was dich in der Küche begeistert."}
            </p>
            <div
              className={css({
                display: "flex",
                flexWrap: "wrap",
                gap: "3",
                color: "text-muted",
                fontSize: "sm",
              })}
            >
              <span>Nickname: {profile.nickname ?? "–"}</span>
              <span>•</span>
              <span>Email: {(claims.email as string | undefined) ?? "–"}</span>
            </div>
          </div>

          <SignOutButton
            label="Abmelden"
            onSignOut={async () => {
              "use server";

              await signOut(logtoConfig, LOGTO_SIGN_OUT_CALLBACK_URL);
            }}
          />
        </div>

        <div
          className={css({
            marginTop: "10",
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "6",
          })}
        >
          <Link
            href="/profile/edit"
            className={css({
              borderRadius: "2xl",
              padding: "6",
              border: "1px solid rgba(224,123,83,0.3)",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 150ms ease",
              _hover: { transform: "translateY(-2px)", borderColor: "#e07b53" },
            })}
          >
            <h2 className={css({ fontSize: "xl", fontWeight: "700", mb: "2" })}>
              Profil bearbeiten
            </h2>
            <p className={css({ color: "text-muted" })}>
              Foto, Teaser oder Nickname aktualisieren.
            </p>
          </Link>

          <Link
            href="/profile/manage"
            className={css({
              borderRadius: "2xl",
              padding: "6",
              border: "1px solid rgba(224,123,83,0.3)",
              textDecoration: "none",
              color: "inherit",
              transition: "transform 150ms ease",
              _hover: { transform: "translateY(-2px)", borderColor: "#e07b53" },
            })}
          >
            <h2 className={css({ fontSize: "xl", fontWeight: "700", mb: "2" })}>
              Konto & Sicherheit
            </h2>
            <p className={css({ color: "text-muted" })}>
              Passwort ändern, Recovery und Accountverwaltung.
            </p>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
