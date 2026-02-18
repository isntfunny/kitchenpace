import Link from "next/link";
import { css } from "styled-system/css";

import { LOGTO_FORGOT_PASSWORD_URL } from "@/app/logto";

const ForgotPasswordPage = () => {
  return (
    <section
      className={css({
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fffaf4",
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
          boxShadow: "0 22px 60px rgba(0,0,0,0.1)",
          width: "100%",
          maxW: "lg",
        })}
      >
        <p className={css({ fontSize: "sm", textTransform: "uppercase", color: "text-muted" })}>
          Passwort vergessen
        </p>
        <h1 className={css({ fontSize: "3xl", fontWeight: "700", mt: "2", mb: "4" })}>
          Setze dein Logto Passwort zurück
        </h1>
        <p className={css({ color: "text-muted", mb: "6", lineHeight: "1.7" })}>
          Wir leiten dich zum Logto Recovery Portal weiter. Dort gibst du deine E-Mail-Adresse ein
          und erhältst eine sichere Anleitung zum Zurücksetzen deines Passworts.
        </p>
        <Link
          href={LOGTO_FORGOT_PASSWORD_URL}
          target="_blank"
          rel="noreferrer noopener"
          className={css({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            px: "6",
            py: "3",
            borderRadius: "full",
            fontWeight: "600",
            background: "linear-gradient(135deg, #e07b53 0%, #f8b500 100%)",
            color: "white",
            textDecoration: "none",
          })}
        >
          Logto Passwort zurücksetzen
        </Link>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
