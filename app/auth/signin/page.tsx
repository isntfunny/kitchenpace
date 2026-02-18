import { signIn } from "@logto/next/server-actions";
import { css } from "styled-system/css";

import SignInButton from "@/components/auth/SignInButton";
import { LOGTO_CALLBACK_URL, logtoConfig } from "@/app/logto";

const SignInPage = () => {
  return (
    <div
      className={css({
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fffcf9",
        fontFamily: "body",
        color: "text",
        px: "4",
      })}
    >
      <div
        className={css({
          background: "white",
          borderRadius: "2xl",
          padding: { base: "8", md: "10" },
          boxShadow: "0 20px 60px rgba(0,0,0,0.12)",
          maxW: "lg",
          width: "100%",
          textAlign: "center",
        })}
      >
        <h1
          className={css({
            fontSize: "3xl",
            fontWeight: "700",
            marginBottom: "3",
          })}
        >
          Willkommen zurück
        </h1>
        <p
          className={css({
            color: "text-muted",
            marginBottom: "8",
          })}
        >
          Melde dich an, um deine persönlichen KüchenTakt-Empfehlungen zu verwalten.
        </p>
        <SignInButton
          label="Anmelden"
          onSignIn={async () => {
            "use server";

            await signIn(logtoConfig, { redirectUri: LOGTO_CALLBACK_URL });
          }}
        />
      </div>
    </div>
  );
};

export default SignInPage;
