import { getLogtoContext } from "@logto/next/server-actions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { css } from "styled-system/css";

import { logtoConfig } from "@/app/logto";
import { getOrCreateProfile, upsertProfile } from "@/lib/profile";

const MAX_NICKNAME_LENGTH = 32;
const MAX_TEASER_LENGTH = 160;
const MAX_PHOTO_URL_LENGTH = 2048;

const clamp = (value: string | null, maxLength: number) => {
  if (!value) {
    return null;
  }

  return value.slice(0, maxLength);
};

const ProfileEditPage = async () => {
  const { isAuthenticated, claims } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated || !claims?.sub) {
    redirect("/auth/signin");
  }

  const profile = await getOrCreateProfile(
    claims.sub,
    (claims.email as string | undefined) ?? "",
  );

  const handleSubmit = async (formData: FormData) => {
    "use server";

    const nickname = clamp((formData.get("nickname") as string)?.trim() ?? null, MAX_NICKNAME_LENGTH);
    const teaser = clamp((formData.get("teaser") as string)?.trim() ?? null, MAX_TEASER_LENGTH);
    const photoUrl = clamp((formData.get("photoUrl") as string)?.trim() ?? null, MAX_PHOTO_URL_LENGTH);

    await upsertProfile({
      userId: claims.sub!,
      email: (claims.email as string | undefined) ?? "",
      data: {
        nickname,
        teaser,
        photoUrl,
      },
    });

    revalidatePath("/profile");
    redirect("/profile");
  };

  return (
    <section
      className={css({
        minH: "100vh",
        background: "#fff4ec",
        px: { base: "4", md: "8" },
        py: { base: "8", md: "14" },
        fontFamily: "body",
      })}
    >
      <div
        className={css({
          maxW: "760px",
          margin: "0 auto",
          background: "white",
          padding: { base: "6", md: "10" },
          borderRadius: "3xl",
          boxShadow: "0 35px 90px rgba(224,123,83,0.25)",
        })}
      >
        <h1 className={css({ fontSize: "3xl", fontWeight: "800", mb: "2" })}>
          Profil bearbeiten
        </h1>
        <p className={css({ color: "text-muted", mb: "8" })}>
          Teile deine Persönlichkeit mit der KüchenTakt Community.
        </p>

        <form action={handleSubmit} className={css({ display: "flex", flexDir: "column", gap: "6" })}>
          <label className={css({ display: "flex", flexDir: "column", gap: "2" })}>
            <span className={css({ fontWeight: "600" })}>Profilfoto URL</span>
            <input
              type="url"
              name="photoUrl"
              defaultValue={profile.photoUrl ?? ""}
              placeholder="https://..."
              className={css({
                borderRadius: "xl",
                border: "1px solid rgba(224,123,83,0.4)",
                padding: "3",
                fontSize: "md",
                outline: "none",
                _focus: {
                  borderColor: "#e07b53",
                  boxShadow: "0 0 0 3px rgba(224,123,83,0.15)",
                },
              })}
            />
          </label>

          <label className={css({ display: "flex", flexDir: "column", gap: "2" })}>
            <span className={css({ fontWeight: "600" })}>Nickname</span>
            <input
              type="text"
              name="nickname"
              maxLength={32}
              defaultValue={profile.nickname ?? ""}
              placeholder="Dein öffentlicher Name"
              className={css({
                borderRadius: "xl",
                border: "1px solid rgba(224,123,83,0.4)",
                padding: "3",
                fontSize: "md",
                outline: "none",
                _focus: {
                  borderColor: "#e07b53",
                  boxShadow: "0 0 0 3px rgba(224,123,83,0.15)",
                },
              })}
              required
            />
          </label>

          <label className={css({ display: "flex", flexDir: "column", gap: "2" })}>
            <span className={css({ fontWeight: "600" })}>Teaser Text</span>
            <textarea
              name="teaser"
              maxLength={160}
              defaultValue={profile.teaser ?? ""}
              placeholder="Beschreibe deine Koch-DNA in wenigen Worten"
              className={css({
                borderRadius: "xl",
                border: "1px solid rgba(224,123,83,0.4)",
                padding: "3",
                minH: "32",
                fontSize: "md",
                resize: "vertical",
                outline: "none",
                _focus: {
                  borderColor: "#e07b53",
                  boxShadow: "0 0 0 3px rgba(224,123,83,0.15)",
                },
              })}
            />
          </label>

          <button
            type="submit"
            className={css({
              marginTop: "4",
              alignSelf: "flex-start",
              borderRadius: "full",
              px: "8",
              py: "3",
              background: "linear-gradient(135deg, #e07b53 0%, #f8b500 100%)",
              color: "white",
              fontWeight: "700",
              border: "none",
              cursor: "pointer",
              transition: "transform 150ms ease",
              _hover: { transform: "translateY(-1px)" },
            })}
          >
            Änderungen speichern
          </button>
        </form>
      </div>
    </section>
  );
};

export default ProfileEditPage;
