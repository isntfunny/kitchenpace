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
          radial-gradient(ellipse at 10% 90%, rgba(224,123,83,0.4) 0%, transparent 50%),
          radial-gradient(ellipse at 90% 10%, rgba(108,92,231,0.35) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(0,184,148,0.25) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, rgba(248,181,0,0.2) 0%, transparent 40%),
          linear-gradient(160deg, #e8e0d8 0%, #d4ccc4 50%, #c8c0b8 100%)
        `,
        margin: 0,
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
