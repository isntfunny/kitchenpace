import { css } from "styled-system/css";
import { container, grid } from "styled-system/patterns";
import { Header } from "@/components/features/Header";
import { ActivitySidebar } from "@/components/features/ActivitySidebar";
import { TrendingTags } from "@/components/features/TrendingTags";
import { ChefSpotlight } from "@/components/features/ChefSpotlight";
import { QuickTips } from "@/components/features/QuickTips";
import { HorizontalRecipeScroll } from "@/components/features/HorizontalRecipeScroll";
import { DailyHighlight } from "@/components/sections/DailyHighlight";
import { FlowPillars } from "@/components/sections/FlowPillars";
import { HeroSpotlight } from "@/components/sections/HeroSpotlight";
import { FitsNow } from "@/components/sections/FitsNow";

const quickPickRecipes = [
  {
    id: "qp1",
    title: "Pasta Aglio e Olio",
    category: "Hauptgericht",
    rating: 4.8,
    time: "15 Min.",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=400&q=80",
  },
  {
    id: "qp2",
    title: "Greek Salad",
    category: "Beilage",
    rating: 4.7,
    time: "10 Min.",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80",
  },
  {
    id: "qp3",
    title: "Avocado Toast",
    category: "Frühstück",
    rating: 4.6,
    time: "5 Min.",
    image: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&q=80",
  },
  {
    id: "qp4",
    title: "Caprese",
    category: "Vorspeise",
    rating: 4.9,
    time: "5 Min.",
    image: "https://images.unsplash.com/photo-1529312266912-b33cf6227e24?w=400&q=80",
  },
  {
    id: "qp5",
    title: "Omelette",
    category: "Frühstück",
    rating: 4.5,
    time: "10 Min.",
    image: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400&q=80",
  },
];

const sweetToothRecipes = [
  {
    id: "st1",
    title: "Chocolate Mousse",
    category: "Dessert",
    rating: 4.9,
    time: "20 Min.",
    image: "https://images.unsplash.com/photo-1511381939415-e44015466834?w=400&q=80",
  },
  {
    id: "st2",
    title: "Berry Tart",
    category: "Dessert",
    rating: 4.8,
    time: "45 Min.",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400&q=80",
  },
  {
    id: "st3",
    title: "Pancakes",
    category: "Frühstück",
    rating: 4.7,
    time: "15 Min.",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80",
  },
  {
    id: "st4",
    title: "Apple Crumble",
    category: "Dessert",
    rating: 4.8,
    time: "35 Min.",
    image: "https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=400&q=80",
  },
];

export default function Home() {
  return (
    <div
      className={css({
        minH: "100vh",
        bg: "light",
        color: "text",
      })}
    >
      <Header />
      <HeroSpotlight />

      <main
        className={container({
          maxW: "1400px",
          px: { base: "4", md: "6" },
          py: { base: "6", md: "8" },
        })}
      >
        <FlowPillars />

        <div
          className={css({
            borderRadius: "3xl",
            background: "linear-gradient(135deg, rgba(224,123,83,0.08) 0%, rgba(248,181,0,0.06) 50%, rgba(0,184,148,0.04) 100%)",
            padding: "6",
            marginTop: "8",
            border: "2px solid",
            borderColor: "rgba(224,123,83,0.15)",
          })}
        >
          <div
            className={grid({
              columns: { base: 1, lg: 12 },
              gap: "6",
            })}
          >
            <div className={css({ lg: { gridColumn: "span 8" } })}>
              <DailyHighlight />

              <div
                className={css({
                  borderRadius: "2xl",
                  background: "white",
                  padding: "5",
                  marginTop: "6",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                })}
              >
                <HorizontalRecipeScroll
                  recipes={quickPickRecipes}
                  title="Schnelle Rezepte"
                />
              </div>

              <div
                className={css({
                  borderRadius: "2xl",
                  background: "linear-gradient(135deg, rgba(0,184,148,0.08) 0%, rgba(0,206,201,0.06) 100%)",
                  padding: "5",
                  marginTop: "6",
                  border: "2px solid",
                  borderColor: "rgba(0,184,148,0.2)",
                })}
              >
                <FitsNow />
              </div>

              <div
                className={css({
                  borderRadius: "2xl",
                  background: "linear-gradient(135deg, rgba(253,121,168,0.08) 0%, rgba(224,123,83,0.06) 100%)",
                  padding: "5",
                  marginTop: "6",
                  border: "2px solid",
                  borderColor: "rgba(253,121,168,0.2)",
                })}
              >
                <HorizontalRecipeScroll
                  recipes={sweetToothRecipes}
                  title="Für den süßen Hunger"
                />
              </div>
            </div>

            <div className={css({ lg: { gridColumn: "span 4" } })}>
              <TrendingTags />
              <div
                className={css({
                  marginTop: "5",
                })}
              >
                <ChefSpotlight />
              </div>
              <div
                className={css({
                  marginTop: "5",
                })}
              >
                <QuickTips />
              </div>
              <div
                className={css({
                  marginTop: "5",
                })}
              >
                <ActivitySidebar />
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer
        className={css({
          py: "10",
          marginTop: "8",
          background: "linear-gradient(180deg, #faf9f7 0%, #fff5f0 100%)",
          borderTop: "2px solid",
          borderColor: "rgba(224,123,83,0.15)",
          textAlign: "center",
          fontFamily: "body",
          fontSize: "sm",
          color: "text-muted",
        })}
      >
        <div
          className={css({
            maxWidth: "600px",
            margin: "0 auto",
            padding: "0 4",
          })}
        >
          <div
            className={css({
              fontSize: "2xl",
              marginBottom: "3",
            })}
          >
            🍳
          </div>
          <div
            className={css({
              fontWeight: "600",
              color: "text",
              marginBottom: "2",
            })}
          >
            KüchenTakt
          </div>
          <div>
            © 2026 KüchenTakt · Produkte mit Gefühl entdecken
          </div>
        </div>
      </footer>
    </div>
  );
}
