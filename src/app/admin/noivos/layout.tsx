import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel dos Noivos · Anita & Giuseppe (Demo)",
  robots: { index: false, follow: false },
  description:
    "Área exclusiva dos noivos (Demo): confirmações de presença (RSVP), mural de fotos & recados e gestão dos presentes.",
  openGraph: {
    title: "Painel dos Noivos · Anita & Giuseppe (Demo)",
    description: "Área exclusiva dos noivos: confirmações (RSVP), recados e presentes Pix taxa zero.",
    siteName: "Casamento Anita & Giuseppe · Demo",
    images: [{ url: "/assets/og-painel-noivos.jpg", width: 1200, height: 630, alt: "Painel dos Noivos · Demo", type: "image/jpeg" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Painel dos Noivos · Anita & Giuseppe (Demo)",
    description: "Área exclusiva dos noivos: presenças, recados e presentes.",
    images: ["/assets/og-painel-noivos.jpg"],
  },
};

export default function NoivosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
