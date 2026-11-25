import CortejoPage from "@/components/CortejoPage";

export default function AmigosDoNoivoPage() {
  return (
    <CortejoPage
      title="Amigos do Noivo"
      quote="Grandes amigos são como irmãos de caminhada. É uma honra ter você no altar comigo neste momento tão especial."
      paletteTitle="Traje oficial · terno completo"
      palette={[
        { name: "Cinza Médio", hex: "#8E9297" },
        { name: "Cinza Alfaiataria", hex: "#737982" },
        { name: "Grafite Suave", hex: "#5D636B" },
        { name: "Chumbo Elegante", hex: "#464C54" },
      ]}
      notesTitle="Composição do cortejo"
      notes={[
        "Paletó e calça em alfaiataria cinza alinhada",
        "Camisa social clássica",
        "Gravata padronizada",
        "Sapato social bem polido",
      ]}
    />
  );
}
