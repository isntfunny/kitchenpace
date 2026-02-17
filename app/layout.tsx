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
          radial-gradient(circle 600px at 30% 20%, rgba(224,123,83,0.25) 0%, transparent 50%),
          linear-gradient(180deg, #f5ede3 0%, #e8ddd0 100%)
        `,
        margin: 0,
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
