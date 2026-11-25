import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bem-vindos à Nossa Mesa · Anita & Giuseppe (Demo)",
  description:
    "Especial do Grande Dia: Conheça nossa história, deixe fotos e recados no mural ao vivo e participe da nossa lista de presentes.",
  openGraph: {
    title: "Bem-vindos à Nossa Mesa · Anita & Giuseppe (Demo)",
    description: "Nossa história, fotos e recados ao vivo e lista de presentes via Pix.",
    siteName: "Casamento Anita & Giuseppe · Demo",
    images: [{ url: "/assets/og-mesa-convidados.jpg", width: 1200, height: 630, alt: "Especial da Mesa · Demo", type: "image/jpeg" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bem-vindos à Nossa Mesa · Anita & Giuseppe (Demo)",
    description: "Nossa história, fotos & recados no mural ao vivo e lista de presentes.",
    images: ["/assets/og-mesa-convidados.jpg"],
  },
};

export default function MesaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
