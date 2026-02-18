import Link from "next/link";
import { css } from "styled-system/css";

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
          Passwort zurücksetzen
        </h1>
        <p className={css({ color: "text-muted", mb: "6", lineHeight: "1.7" })}>
          Du hast dein Passwort vergessen? Kein Problem - diese Funktion ist bald verfügbar.
        </p>
        <div
          className={css({
            padding: "4",
            background: "#fff7f1",
            borderRadius: "xl",
            color: "text-muted",
          })}
        >
          <p>Diese Funktion ist bald verfügbar.</p>
        </div>
        <Link
          href="/auth/signin"
          className={css({
            display: "inline-block",
            mt: "4",
            color: "#e07b53",
          })}
        >
          ← Zurück zur Anmeldung
        </Link>
      </div>
    </section>
  );
};

export default ForgotPasswordPage;
