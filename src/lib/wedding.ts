// Conteúdo completo da Versão Demo Comercial — Casal Histórico (Anita & Giuseppe)
// 100% personalizável para cerimônias clássicas, religiosas, no campo ou na praia.

export const COUPLE = {
  bride: "Anita",
  groom: "Giuseppe",
  initials: ["A", "G"] as const,
  dateLabel: "18.09.2027",
  weekday: "Sábado",
  time: "19h30",
  dateISO: "2027-09-18T19:30:00-03:00",
  rsvpDeadline: "10/08/2027",
  motto: "Dois corações. Uma história que atravessou o tempo.",
  verse: { text: "O amor é paciente, o amor é bondoso; tudo crê, tudo espera, tudo suporta.", ref: "1 Coríntios 13:4-7" },
};

// Citações e versos oficiais de cada capítulo (universais e elegantes)
export const PAGE_VERSES: Record<number, { text: string; ref: string }> = {
  0: { text: "O amor é paciente, o amor é bondoso; tudo crê, tudo espera, tudo suporta.", ref: "1 Coríntios 13:4-7" },
  1: { text: "O verdadeiro amor não conhece distâncias nem fronteiras quando dois destinos se reconhecem.", ref: "História & Aliança" },
  2: { text: "A alegria multiplicada é aquela que compartilhamos à mesa com quem caminhou ao nosso lado.", ref: "Boas-Vindas" },
  3: { text: "Cada gesto de carinho ajuda a construir as primeiras memórias do nosso novo lar.", ref: "Gratidão" },
  4: { text: "Vista-se de alegria, elegância e leveza para celebrar esta noite inesquecível.", ref: "Dress Code" },
  5: { text: "A música guarda o compasso das lembranças que permanecem para sempre no coração.", ref: "Trilha Sonora" },
  6: { text: "Caminhar juntos é transformar cada detalhe do caminho em eternidade.", ref: "Informações" },
};

export const VENUE = {
  name: "Villa Imperial das Hortênsias",
  phone: "(24) 99900-1840",
  address: "Estrada Imperial das Flores, 1840 - Jardim Belvedere",
  city: "Petrópolis - RJ, 25680-000",
  get query() {
    return `${this.name}, Petrópolis - RJ`;
  },
  get mapsUrl() {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(this.query)}`;
  },
  get embedUrl() {
    return `https://www.google.com/maps?q=${encodeURIComponent("Palácio Quitandinha Petrópolis RJ")}&output=embed`;
  },
};

export const CHAPTERS = [
  { id: 1, title: "O Grande Dia", shortTitle: "O Grande Dia", icon: "Calendar" },
  { id: 2, title: "Confirmar Presença", shortTitle: "Presença", icon: "CheckCircle" },
  { id: 3, title: "Lista de Presentes", shortTitle: "Presentes", icon: "Gift" },
  { id: 4, title: "Dress Code & Trajes", shortTitle: "Dress Code", icon: "Shirt" },
  { id: 5, title: "Trilha Sonora & Playlist", shortTitle: "Playlist", icon: "Music" },
  { id: 6, title: "Informações Úteis & Dúvidas", shortTitle: "Dúvidas & Info", icon: "HelpCircle" },
] as const;

export const pad = (n: number) => String(n).padStart(2, "0");

export interface Milestone {
  id: string;
  label: string;
  title: string;
  verse: string;
  text: string;
  image: string;
  caption: string;
  objectPosition?: string;
}

export const TIMELINE: Milestone[] = [
  {
    id: "encontro",
    label: "O Encontro",
    title: "Quando dois mundos se cruzaram",
    verse: "Bastou um olhar para saber que você sempre seria minha companheira.",
    text: "Inspirada no encontro histórico de Anita e Giuseppe em terras catarinenses, nossa história começou entre o mar, a brisa de fim de tarde e uma sintonia imediata que transformou amizade e admiração em amor para a vida inteira.",
    image: "/assets/dresscode-convidados-ia.jpg",
    caption: "Jardins ao entardecer · O início da nossa caminhada juntos",
    objectPosition: "center center",
  },
  {
    id: "primeiro-sim",
    label: "14.02.2026",
    title: "O Primeiro Sim",
    verse: "Onde quer que você vá, ali também estará o meu coração.",
    text: "Em uma manhã ensolarada cercada por astromélias e boas conversas, oficializamos a escolha de dividir sonhos, viagens e o cotidiano lado a lado — celebrando cada pequena conquista com gratidão.",
    image: "/assets/cota-cafe-hd.jpg",
    caption: "Manhã de celebração · Nosso primeiro sim em 14.02.2026",
    objectPosition: "center center",
  },
  {
    id: "noivado",
    label: "O Noivado",
    title: "Jantar & Pedido de Noivado",
    verse: "As muitas águas não podem apagar este amor, nem os rios afogá-lo. — Ct 8:7",
    text: "À luz de velas, celebramos o pedido de casamento que selou nossa aliança com leveza, emoção e brindes inesquecíveis. Desde então, planejamos cada detalhe desta noite para receber quem mais amamos.",
    image: "/assets/cota-paris-hd.jpg",
    caption: "Jantar de noivado · Aliança selada com carinho",
    objectPosition: "center center",
  },
  {
    id: "grandedia",
    label: "18.09.2027",
    title: "O Grande Dia",
    verse: "Celebraremos o amor cercados das nossas famílias e grandes amigos.",
    text: "O capítulo mais esperado da nossa história: nossa cerimônia e recepção na Villa Imperial das Hortênsias, na Serra Imperial de Petrópolis.",
    image: "/assets/venue-villa-imperial.jpg",
    caption: "Villa Imperial das Hortênsias · O cenário do nosso Grande Dia",
  },
];

export const DRESS_CODE = {
  summary: "Traje social / passeio completo elegante, perfeito para uma celebração clássica ao entardecer na serra.",
  women: [
    "Vestidos midi ou longos em tecidos fluidos",
    "Conjuntos ou macacões de alfaiataria sofisticada",
    "Tonalidades suaves, florais discretos ou pastel",
    "Recomendamos salto bloco ou anabela para áreas de jardim",
  ],
  men: [
    "Camisa social com corte alinhado",
    "Calça de alfaiataria bem ajustada",
    "Blazer ou terno clássico (gravata opcional)",
    "Sapato social ou mocassim elegante",
  ],
  palette: [
    { name: "Amarelo Manteiga", hex: "#F6EFA6" },
    { name: "Lavanda", hex: "#E3E1F5" },
    { name: "Salmão", hex: "#F8CDB0" },
    { name: "Azul Serenity", hex: "#C5D3E8" },
    { name: "Verde Menta", hex: "#D8F0DC" },
    { name: "Verde Sálvia", hex: "#C7D3C0" },
  ],
  avoid: [
    "Branco, off-white e marfim",
    "Champagne claro e nude",
    "Azul-marinho e tons muito escuros",
    "Terracota e vermelho",
    "Verde bandeira",
    "Preto",
  ],
};

// Chave Pix fictícia demonstrativa (gera QR Code válido EMV para demonstração)
export const PIX_KEY = "anita.giuseppe.demo@pix.com.br";
export const AMAZON_WISHLIST_URL = "https://www.amazon.com.br/wedding";

export const COTAS = [
  {
    id: "cozinha",
    title: "Nossa Cozinha Gourmet",
    text: "Para preparar jantares inesquecíveis em família.",
    value: 200,
    image: "/assets/cota-cozinha-hd.jpg",
  },
  {
    id: "quarto",
    title: "Clima Aconchegante no Lar",
    text: "Conforto térmico em todas as estações na serra.",
    value: 250,
    image: "/assets/cota-clima-quarto-hd.jpg",
  },
  {
    id: "paris",
    title: "Jantar Romântico na Lua de Mel",
    text: "Uma noite especial celebrando nossa viagem pela Itália e França.",
    value: 300,
    image: "/assets/cota-paris-hd.jpg",
  },
  {
    id: "casa",
    title: "Sala de Estar & Boas Conversas",
    text: "Um lar acolhedor para receber amigos e familiares.",
    value: 250,
    image: "/assets/cota-casa-hd.jpg",
  },
  {
    id: "cafe",
    title: "Café da Manhã dos Noivos",
    text: "Manhãs tranquilas com mesa posta e carinho.",
    value: 150,
    image: "/assets/cota-cafe-hd.jpg",
  },
  {
    id: "quarto-novo",
    title: "Enxoval dos Sonhos",
    text: "Detalhes especiais de linho e conforto para nossa casa.",
    value: 300,
    image: "/assets/cota-quarto-novo-hd.jpg",
  },
] as const;

export type Cota = (typeof COTAS)[number];

export interface GiftItem {
  title: string;
  url: string;
  image: string;
  category: string;
}

export const GIFTS: GiftItem[] = [
  {
    title: "Fogão 4 Bocas Inox Mesa Vidro Tripla Chama Bivolt",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-fogao-electrolux.png",
    category: "Cozinha",
  },
  {
    title: "Depurador de Ar Slim 60cm Inox 3 Velocidades",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-depurador-suggar.jpg",
    category: "Cozinha",
  },
  {
    title: "Lava-Louças 8 Serviços Inox com Programa Inteligente",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-lava-loucas-electrolux.jpg",
    category: "Cozinha",
  },
  {
    title: "Panela de Pressão em Alumínio Polido 4,5L",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-panela-mbox.jpg",
    category: "Cozinha",
  },
  {
    title: "Kit 2 Frigideiras Cerâmicas Antiaderentes + Espátula",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-kit-frigideiras.jpg",
    category: "Cozinha",
  },
  {
    title: "Fervedor / Leiteira Cerâmica 1,9L Indução",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-leiteira-blackdecker.jpg",
    category: "Cozinha",
  },
  {
    title: "Faqueiro Aço Inox Clássico 36 Peças",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-faqueiro-tramontina.jpg",
    category: "Mesa posta",
  },
  {
    title: "Jogo de Utensílios Aço Inox 5 Peças",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-utensilios-tramontina.png",
    category: "Cozinha",
  },
  {
    title: "Batedeira Planetária Bowl Inox 12 Velocidades",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-batedeira-oster.jpg",
    category: "Eletroportáteis",
  },
  {
    title: "Liquidificador Alta Potência Jarra 3,1L",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-liquidificador-philco.jpg",
    category: "Eletroportáteis",
  },
  {
    title: "Vaporizador Portátil de Roupas 3 em 1",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-vaporizador-blackdecker.jpg",
    category: "Lavanderia",
  },
  {
    title: "Purificador de Água Painel Touch Bivolt",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-purificador-hd.png",
    category: "Cozinha",
  },
  {
    title: "Aspirador de Pó Vertical Sem Fio 2 em 1",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-aspirador-hd.png",
    category: "Limpeza",
  },
  {
    title: "Aparelho de Jantar 30 Peças Porcelana Off-White",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-aparelho-jantar-hd.jpg",
    category: "Mesa posta",
  },
  {
    title: "Garrafa Térmica Inox 1,5L Premium",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-garrafa-hd.jpg",
    category: "Cozinha",
  },
  {
    title: "Kit 2 Mesas de Cabeceira Madeira Retrô",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-mesas-hd.png",
    category: "Quarto",
  },
  {
    title: "Secadora de Roupas Compacta 8Kg",
    url: AMAZON_WISHLIST_URL,
    image: "/assets/presente-secadora-hd.jpg",
    category: "Lavanderia",
  },
];

// Link de exemplo para álbum colaborativo (pode ser configurado para Drive/iCloud/Dropbox do casal)
export const GOOGLE_DRIVE_PHOTOS_URL = "https://drive.google.com";

export type GuestMessage = { name: string; relation?: string; message: string; date: string };

export const INITIAL_MESSAGES: GuestMessage[] = [
  {
    name: "Helena & Antônio Garibaldi",
    relation: "Família do noivo",
    message: "Que a alegria e a cumplicidade de vocês sigam iluminando cada capítulo dessa nova família! Amamos vocês.",
    date: "12/08/2027",
  },
  {
    name: "Mariana Vasconcelos",
    relation: "Madrinha",
    message: "Contando os dias para vê-los no altar! Já separei o vestido da paleta e o coração cheio de emoção.",
    date: "14/08/2027",
  },
  {
    name: "Dr. Bento Alencar",
    relation: "Amigos",
    message: "Que história linda! Desejamos uma vida repleta de saúde, paz e grandes celebrações juntos.",
    date: "16/08/2027",
  },
];

// Playlist universal com faixas clássicas e românticas verificadas no YouTube
export type SongSuggestion = {
  id: string;
  title: string;
  artist?: string;
  link?: string;
  date: string;
};

const sp = (q: string) => `https://open.spotify.com/search/${encodeURIComponent(q)}`;

export const PLAYLIST = [
  {
    title: "Canon in D (Pachelbel)",
    artist: "Brooklyn Duo · Cello & Piano",
    tag: "Top 1 · Entrada Clássica",
    youtubeId: "Ptk_1Dc2iPY",
    featured: true,
    isTopOne: true,
  },
  {
    title: "A Thousand Years",
    artist: "The Piano Guys · Cello & Piano",
    tag: "Cerimônia",
    youtubeId: "QgaTQ5-XfMM",
    featured: true,
  },
  {
    title: "River Flows in You",
    artist: "Yiruma · Solo Piano",
    tag: "Recepção",
    youtubeId: "7maJOI3QMu0",
    featured: true,
  },
  {
    title: "Clair de Lune",
    artist: "Claude Debussy · Piano Clássico",
    tag: "Coquetel",
    youtubeId: "vG-vmVrHOGE",
    featured: true,
  },
  {
    title: "Perfect (Piano Solo)",
    artist: "The Piano Guys",
    tag: "Primeiro Brinde",
    youtubeId: "nfVKtd3lJpk",
    featured: true,
  },
  {
    title: "Rewrite the Stars",
    artist: "The Piano Guys · Piano & Cello",
    tag: "Celebração",
    youtubeId: "pqEHdoZBSwY",
    featured: true,
  },
].map((s) => ({
  ...s,
  youtube: `https://www.youtube.com/watch?v=${s.youtubeId}`,
  spotify: sp(`${s.title} ${s.artist}`),
}));

export interface FaqItem {
  q: string;
  a: string;
  action?: {
    label: string;
    chapter?: number;
    url?: string;
  };
}

export const FAQ: FaqItem[] = [
  {
    q: "O convite é nominal?",
    a: "Sim. Nossa lista de convidados é fechada e cada convite é pessoal por família, garantindo o conforto de todos os presentes na cerimônia e no jantar.",
  },
  {
    q: "Como confirmar presença?",
    a: `Pelo capítulo 02 deste convite (busque pelo sobrenome da família, ex.: "Borges" ou "Menezes" para testar na Demo), marcando quem vai até ${COUPLE.rsvpDeadline}.`,
    action: {
      label: "Confirmar Presença no Capítulo 02",
      chapter: 2,
    },
  },
  {
    q: "Qual o dress code?",
    a: "Traje social / passeio completo elegante, adequado a uma celebração clássica ao entardecer na serra. Veja a paleta no capítulo 04.",
    action: {
      label: "Ver Guia de Dress Code (Capítulo 04)",
      chapter: 4,
    },
  },
  {
    q: "Como chegar ao local?",
    a: `A celebração acontecerá na ${VENUE.name}, em Petrópolis - RJ. Você pode traçar sua rota diretamente no Google Maps ou conferir os detalhes no capítulo 01.`,
    action: {
      label: "Traçar Rota no Google Maps",
      url: VENUE.mapsUrl,
    },
  },
  {
    q: "Como funciona a lista de presentes?",
    a: "No capítulo 03 você encontra cotas simbólicas com QR Code Pix direto para os noivos (taxa zero) e sugestões de itens para o novo lar.",
    action: {
      label: "Acessar Lista de Presentes (Capítulo 03)",
      chapter: 3,
    },
  },
];

const maps = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

export const HOTELS = [
  { name: "Hotel Solar do Império", area: "Centro Histórico · Hotel Boutique", url: maps("Hotel Solar do Imperio Petropolis") },
  { name: "Pousada Tankamana", area: "Vale das Videiras · Natureza", url: maps("Pousada Tankamana Petropolis") },
  { name: "Castelo de Itaipava Hotel", area: "Itaipava · Clássico Imperial", url: maps("Castelo de Itaipava Hotel") },
  { name: "Hotel Pedra Bonita", area: "Serra · Conforto & Vista", url: maps("Hotel Pedra Bonita Petropolis") },
  { name: "Pousada Paraiso Açu", area: "Itaipava · Aconchegante", url: maps("Pousada Paraiso Acu Petropolis") },
  { name: "Grande Hotel Petrópolis", area: "Centro · Tradicional", url: maps("Grande Hotel Petropolis") },
];

export const DEFAULT_PLANNER_NAME = "Camila Vasconcelos";
export const DEFAULT_PLANNER_PHONE = "(24) 99900-2027";
export const PLANNER_PHONE = "(24) 99900-2027";
export const PLANNER_WHATSAPP = `https://wa.me/5524999002027?text=${encodeURIComponent(
  "Olá, Camila! Gostaria de tirar uma dúvida sobre o casamento de Anita & Giuseppe (Demo)."
)}`;
