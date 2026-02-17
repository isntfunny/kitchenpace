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
          radial-gradient(ellipse 800px 600px at 20% 10%, rgba(224,123,83,0.5) 0%, transparent 50%),
          radial-gradient(ellipse 900px 700px at 80% 90%, rgba(108,92,231,0.45) 0%, transparent 50%),
          radial-gradient(ellipse 600px 800px at 10% 80%, rgba(253,121,168,0.4) 0%, transparent 50%),
          radial-gradient(ellipse 700px 500px at 90% 20%, rgba(248,181,0,0.4) 0%, transparent 50%),
          radial-gradient(ellipse 500px 600px at 50% 50%, rgba(0,184,148,0.35) 0%, transparent 60%),
          linear-gradient(135deg, #d8cfc5 0%, #cfc5ba 50%, #c7bdb0 100%)
        `,
        margin: 0,
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
