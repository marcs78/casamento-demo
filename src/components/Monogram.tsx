import Image from "next/image";
import { COUPLE } from "@/lib/wedding";

interface MonogramProps {
  size?: number;
  width?: number;
  variant?: "auto" | "icon" | "astromelias";
}

/** Monograma oficial: Lacre de cera com florais de astromélias autênticos */
export default function Monogram({
  size = 72,
  width,
  variant = "auto",
}: MonogramProps) {
  const isAstromelias = variant === "astromelias" || (variant === "auto" && size >= 60);

  if (isAstromelias) {
    const finalWidth = width || Math.min(320, Math.max(240, size * 3));
    const finalHeight = Math.round(finalWidth * (175 / 385));

    return (
      <div className="relative mx-auto flex items-center justify-center transition-transform duration-300 hover:scale-102 select-none">
        <Image
          src="/assets/seal-with-astromelias.png"
          alt={`Lacre de cera com astromélias — ${COUPLE.bride} & ${COUPLE.groom}`}
          width={finalWidth}
          height={finalHeight}
          priority
          className="h-auto w-auto max-w-full object-contain drop-shadow-sm"
        />
      </div>
    );
  }

  // Ícone circular limpo para a barra de navegação superior
  return (
    <div
      className="relative inline-flex items-center justify-center transition-transform duration-200 hover:scale-108 active:scale-95 drop-shadow-xs select-none cursor-pointer"
      style={{ width: size, height: size }}
    >
      <Image
        src="/assets/seal-circular-icon.png"
        alt={`Lacre oficial ${COUPLE.bride} & ${COUPLE.groom}`}
        width={size}
        height={size}
        priority
        className="h-full w-full object-contain"
      />
    </div>
  );
}
