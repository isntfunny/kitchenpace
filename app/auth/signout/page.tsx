import { signOut } from "@logto/next/server-actions";
import { css } from "styled-system/css";

import SignOutButton from "@/components/auth/SignOutButton";
import { LOGTO_SIGN_OUT_CALLBACK_URL, logtoConfig } from "@/app/logto";

const SignOutPage = () => {
  return (
    <div
      className={css({
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff7f1",
        fontFamily: "body",
        color: "text",
        px: "4",
      })}
    >
      <div
        className={css({
          background: "white",
          borderRadius: "xl",
          padding: { base: "6", md: "8" },
          boxShadow: "0 18px 45px rgba(224,123,83,0.2)",
          width: "100%",
          maxW: "md",
          textAlign: "center",
        })}
      >
        <h1 className={css({ fontSize: "2xl", fontWeight: "700", mb: "3" })}>
          Abmelden
        </h1>
        <p className={css({ color: "text-muted", mb: "6" })}>
          Du wirst von Logto abgemeldet und zurück zur Startseite geleitet.
        </p>
        <SignOutButton
          label="Jetzt abmelden"
          onSignOut={async () => {
            "use server";

            await signOut(logtoConfig, LOGTO_SIGN_OUT_CALLBACK_URL);
          }}
        />
      </div>
    </div>
  );
};

export default SignOutPage;
