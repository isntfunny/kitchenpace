import { css } from "styled-system/css";
import { container } from "styled-system/patterns";
import { Header } from "@/components/features/Header";
import { DailyHighlight } from "@/components/sections/DailyHighlight";
import { NewestRecipes } from "@/components/sections/NewestRecipes";
import { TopRated } from "@/components/sections/TopRated";
import { FitsNow } from "@/components/sections/FitsNow";
import { Seasonal } from "@/components/sections/Seasonal";

export default function Home() {
  return (
    <div
      className={css({
        minH: "100vh",
        bg: "light",
      })}
    >
      <Header />
      <main
        className={container({
          maxW: "1200px",
          px: "6",
        })}
      >
        <DailyHighlight />
        <NewestRecipes />
        <TopRated />
        <FitsNow />
        <Seasonal />
      </main>
      <footer
        className={css({
          py: "8",
          borderTop: "1px solid",
          borderColor: "rgba(0,0,0,0.1)",
          textAlign: "center",
          fontFamily: "body",
          fontSize: "sm",
          color: "text-muted",
        })}
      >
        © 2026 KüchenTakt - Deine Rezepte im Takt
      </footer>
    </div>
  );
}
