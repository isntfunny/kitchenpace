import { signIn } from "@logto/next/server-actions";
import { css } from "styled-system/css";

import SignInButton from "@/components/auth/SignInButton";
import { LOGTO_CALLBACK_URL, logtoConfig } from "@/app/logto";

const RegisterPage = () => {
  return (
    <div
      className={css({
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg, #fff4eb 0%, #ffe5d1 100%)",
        fontFamily: "body",
        color: "text",
        px: "4",
      })}
    >
      <div
        className={css({
          background: "white",
          borderRadius: "3xl",
          padding: { base: "8", md: "12" },
          boxShadow: "0 30px 80px rgba(224,123,83,0.25)",
          maxW: "2xl",
          width: "100%",
        })}
      >
        <p className={css({ fontSize: "sm", color: "text-muted", mb: "2" })}>KüchenTakt</p>
        <h1 className={css({ fontSize: "4xl", fontWeight: "800", mb: "4" })}>
          Erstelle dein Kochprofil
        </h1>
        <p className={css({ color: "text-muted", mb: "10", fontSize: "lg" })}>
          Registriere dich über Logto, um persönliche Empfehlungen, Einkaufslisten und deine
          KüchenTakt-Community zu verwalten.
        </p>
        <SignInButton
          label="Jetzt registrieren"
          onSignIn={async () => {
            "use server";

            await signIn(logtoConfig, {
              redirectUri: LOGTO_CALLBACK_URL,
              extraParams: {
                prompt: "signup",
              },
            });
          }}
        />
      </div>
    </div>
  );
};

export default RegisterPage;
