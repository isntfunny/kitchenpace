import Link from "next/link";
import { css } from "styled-system/css";

import { LOGTO_PASSWORD_EDIT_URL } from "@/app/logto";

const EditPasswordPage = () => {
  return (
    <section
      className={css({
        minH: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #fff0e5 0%, #ffe2cf 100%)",
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
          boxShadow: "0 30px 80px rgba(224,123,83,0.3)",
          width: "100%",
          maxW: "xl",
        })}
      >
        <p className={css({ fontSize: "sm", textTransform: "uppercase", color: "text-muted" })}>
          Sicherheit
        </p>
        <h1 className={css({ fontSize: "3xl", fontWeight: "800", mt: "2", mb: "4" })}>
          Passwort aktualisieren
        </h1>
        <p className={css({ color: "text-muted", mb: "8", lineHeight: "1.8" })}>
          Ändere dein Logto-Passwort regelmäßig, um dein Konto zu schützen. Die Aktualisierung
          erfolgt im Logto Sicherheitscenter.
        </p>
        <Link
          href={LOGTO_PASSWORD_EDIT_URL}
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
          Passwort im Sicherheitscenter ändern
        </Link>
      </div>
    </section>
  );
};

export default EditPasswordPage;
