import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Grenze_Gotisch, Montserrat, Pirata_One } from "next/font/google";
import DemoTourBar from "@/components/DemoTourBar";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const gothic = Grenze_Gotisch({
  variable: "--font-antique",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const pirata = Pirata_One({
  variable: "--font-pirata",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://casamento-anita-giuseppe-demo.vercel.app"),
  title: "Anita & Giuseppe · Casamento 18.09.2027 (Demo)",
  description:
    "Demonstração comercial do Ecossistema Digital para Casamentos: convite interativo, RSVP familiar, presentes via Pix taxa zero e portal completo de gestão.",
  manifest: "/manifest.json",
  icons: {
    icon: "/assets/seal-circular-icon.png",
    apple: "/assets/seal-circular-icon.png",
  },
  openGraph: {
    title: "Anita & Giuseppe · Casamento 18.09.2027 (Demo)",
    description:
      "Dois corações. Uma história que atravessou o tempo. Toque para abrir o convite de demonstração.",
    siteName: "Casamento Anita & Giuseppe · Demo",
    images: [
      {
        url: "/assets/og-convite.jpg",
        width: 1200,
        height: 630,
        alt: "Casamento Anita & Giuseppe · 18.09.2027 · Demonstração",
        type: "image/jpeg",
      },
    ],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anita & Giuseppe · Casamento 18.09.2027 (Demo)",
    description: "Demonstração completa de Convite Interativo + RSVP + Gestão de Cerimonial.",
    images: ["/assets/og-convite.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF7F0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${cormorant.variable} ${gothic.variable} ${pirata.variable} ${montserrat.variable}`}
        style={{ fontFamily: "var(--font-montserrat), sans-serif" }}
      >
        {children}
        <DemoTourBar />
      </body>
    </html>
  );
}
