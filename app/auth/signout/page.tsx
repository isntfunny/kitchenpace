"use client";

import { handleSignOut } from "@/components/auth/actions";
import { css } from "styled-system/css";
import { PageShell } from "@/components/layouts/PageShell";

const SignOutPage = () => {
  return (
    <PageShell>
      <section
        className={css({
          paddingY: { base: "8", md: "12" },
          display: "flex",
          justifyContent: "center",
          fontFamily: "body",
          color: "text",
        })}
      >
        <div
          className={css({
            background: "white",
            borderRadius: "xl",
            padding: { base: "6", md: "8" },
            boxShadow: "0 18px 45px rgba(224,123,83,0.2)",
            width: "100%",
            maxWidth: "520px",
            textAlign: "center",
          })}
        >
          <h1 className={css({ fontSize: "2xl", fontWeight: "700", mb: "3" })}>
            Abmelden
          </h1>
          <p className={css({ color: "text-muted", mb: "6" })}>
            Du wirst abgemeldet und zur Startseite geleitet.
          </p>
          <button
            type="button"
            onClick={() => handleSignOut()}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2",
              px: "6",
              py: "3",
              borderRadius: "full",
              fontFamily: "body",
              fontWeight: "600",
              fontSize: "md",
              color: "white",
              background: "linear-gradient(135deg, #e07b53 0%, #f8b500 100%)",
              border: "none",
              cursor: "pointer",
              transition: "transform 150ms ease, box-shadow 150ms ease",
              _hover: {
                transform: "translateY(-1px)",
                boxShadow: "0 10px 30px rgba(224,123,83,0.35)",
              },
            })}
          >
            Jetzt abmelden
          </button>
        </div>
      </section>
    </PageShell>
  );
};

export default SignOutPage;
