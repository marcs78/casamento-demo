import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal da Cerimonialista · Anita & Giuseppe (Demo)",
  robots: { index: false, follow: false },
  description:
    "Organização e cerimonial (Demo): checklist operacional do grande dia, mapa das mesas, recepção e relatórios PDF.",
  openGraph: {
    title: "Portal da Cerimonialista · Anita & Giuseppe (Demo)",
    description: "Checklist operacional, mapa das mesas, check-in e relatórios PDF para buffet e recepção.",
    siteName: "Casamento Anita & Giuseppe · Demo",
    images: [{ url: "/assets/og-painel-cerimonialista.jpg", width: 1200, height: 630, alt: "Portal da Cerimonialista · Demo", type: "image/jpeg" }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal da Cerimonialista · Anita & Giuseppe (Demo)",
    description: "Check-in em tempo real, mapa das mesas e relatórios PDF.",
    images: ["/assets/og-painel-cerimonialista.jpg"],
  },
};

export default function CerimonialistaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
