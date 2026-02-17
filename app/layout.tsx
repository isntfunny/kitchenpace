import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KüchenTakt - Deine Rezepte im Takt",
  description: "Entdecke, erstelle und teile köstliche Rezepte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${playfair.variable} ${inter.variable}`} style={{ 
        background: `
          radial-gradient(ellipse 900px 800px at 20% 15%, rgba(248,181,0,0.5) 0%, transparent 50%),
          radial-gradient(ellipse 800px 700px at 85% 85%, rgba(224,123,83,0.5) 0%, transparent 50%),
          radial-gradient(ellipse 700px 600px at 80% 10%, rgba(108,92,231,0.35) 0%, transparent 50%),
          radial-gradient(ellipse 600px 700px at 15% 85%, rgba(253,121,168,0.4) 0%, transparent 50%),
          radial-gradient(ellipse 500px 500px at 50% 50%, rgba(0,184,148,0.3) 0%, transparent 60%),
          linear-gradient(180deg, #e8dcd0 0%, #dccfb8 50%, #d0c0a0 100%)
        `,
        margin: 0,
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
