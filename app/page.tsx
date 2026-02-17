import { css } from "styled-system/css";
import { container } from "styled-system/patterns";
import { Header } from "@/components/features/Header";
import { DailyHighlight } from "@/components/sections/DailyHighlight";
import { FlowPillars } from "@/components/sections/FlowPillars";
import { HeroSpotlight } from "@/components/sections/HeroSpotlight";
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
        color: "text",
      })}
    >
      <div
        className={css({
          background: "radial-gradient(circle at 15% -10%, rgba(224,123,83,0.35) 0%, transparent 45%), linear-gradient(180deg, #fffaf7 0%, #faf9f7 100%)",
          paddingBottom: "10",
        })}
      >
        <Header />
        <HeroSpotlight />
      </div>
      <main
        className={container({
          maxW: "1200px",
          px: { base: "4", md: "6" },
          py: { base: "8", md: "10" },
        })}
      >
        <FlowPillars />
        <DailyHighlight />
        <NewestRecipes />
        <TopRated />
        <FitsNow />
        <Seasonal />
      </main>
      <footer
        className={css({
          py: "10",
          borderTop: "1px solid",
          borderColor: "rgba(0,0,0,0.05)",
          textAlign: "center",
          fontFamily: "body",
          fontSize: "sm",
          color: "text-muted",
        })}
      >
        © 2026 KüchenTakt · Produkte mit Gefühl entdecken
      </footer>
    </div>
  );
}
