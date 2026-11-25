import CortejoPage from "@/components/CortejoPage";

export default function AmigasDaNoivaPage() {
  return (
    <CortejoPage
      title="Amigas da Noiva"
      quote="Vocês foram escolhidas com todo carinho para estar ao meu lado no altar neste dia inesquecível."
      paletteTitle="Paleta das amigas da noiva"
      palette={[
        { name: "Rosa Canela", hex: "#D28C81" },
        { name: "Rosa Goiaba", hex: "#C76D63" },
        { name: "Rosa Antigo", hex: "#B36761" },
        { name: "Rosa Queimado", hex: "#9E544F" },
      ]}
      notesTitle="Estilo sugerido"
      notes={["Vestido longo elegante", "Tecidos fluidos e sofisticados", "Modelagem sóbria e discreta"]}
    />
  );
}
