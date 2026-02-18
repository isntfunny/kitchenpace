"use client";

import { handleSignOut } from "@/components/auth/actions";
import { css } from "styled-system/css";

type Props = {
  label?: string;
};

const SignOutButton = ({ label = "Sign Out" }: Props) => {
  return (
    <button
      type="button"
      className={css({
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "2",
        px: "5",
        py: "2.5",
        borderRadius: "full",
        fontFamily: "body",
        fontWeight: "600",
        fontSize: "sm",
        color: "text",
        background: "white",
        border: "1px solid",
        borderColor: "rgba(224,123,83,0.4)",
        cursor: "pointer",
        transition: "all 150ms ease",
        _hover: {
          background: "rgba(224,123,83,0.08)",
          color: "#e07b53",
        },
      })}
      onClick={() => {
        handleSignOut();
      }}
    >
      {label}
    </button>
  );
};

export default SignOutButton;
