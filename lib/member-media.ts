import type { Member } from "@/lib/types";

const PHOTO_ENTRIES = [
  {
    "names": [
      "Arthur Vinícius Costa Barreto"
    ],
    "src": "/members/arthur-vinicius-costa-barreto-ef1c3ac5c5.jpeg"
  },
  {
    "names": [
      "Bruno Carvalho Santana Rocha"
    ],
    "src": "/members/bruno-carvalho-santana-rocha-9062886023.jpeg"
  },
  {
    "names": [
      "Danilo Campos Deichmann"
    ],
    "src": "/members/danilo-campos-deichmann-f6f9f87b3d.jpeg"
  },
  {
    "names": [
      "Raíssa Cavalcante de Albuquerque Bitencurte"
    ],
    "src": "/members/raissa-cavalcante-de-albuquerque-bitencurte-b2bf070d85.jpeg"
  },
  {
    "names": [
      "Nayara Oliveira Santos",
      "Nayara Oliveira"
    ],
    "src": "/members/nayara-oliveira-santos-14cbfaa169.jpeg"
  },
  {
    "names": [
      "Filipe Ciríaco Marcelino do Nascimento",
      "Filipe Ciríaco Marcelino de Nascimento"
    ],
    "src": "/members/filipe-ciriaco-marcelino-do-nascimento-106b5c4aab.jpeg"
  },
  {
    "names": [
      "João Vitor Viana Felix"
    ],
    "src": "/members/joao-vitor-viana-felix-af3b2bfe73.jpeg"
  },
  {
    "names": [
      "Gustavo César Barreto Santana"
    ],
    "src": "/members/gustavo-cesar-barreto-santana-cc4d0ec263.jpeg"
  },
  {
    "names": [
      "Luan Amaro dos Santos Aragão"
    ],
    "src": "/members/luan-amaro-dos-santos-aragao-a39ea2e2a4.jpeg"
  },
  {
    "names": [
      "Caio Mendonça Barreto de Brito"
    ],
    "src": "/members/caio-mendonca-barreto-de-brito-6f8eec0374.jpeg"
  },
  {
    "names": [
      "Artur Vinícius Santos de Lima"
    ],
    "src": "/members/artur-vinicius-santos-de-lima-4d5de176d6.jpeg"
  },
  {
    "names": [
      "Péricles dos Santos Leite",
      "Péricles Leite"
    ],
    "src": "/members/pericles-dos-santos-leite-f75c0c56dd.jpeg"
  }
];

function normalizeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

const PHOTO_BY_NAME = new Map(
  PHOTO_ENTRIES.flatMap(entry => entry.names.map(name => [normalizeName(name), entry.src] as const)),
);

const PHOTO_BY_ID = new Map([
  ["f5b7067de5d183438ff1811c6660558b", "/members/raissa-cavalcante-de-albuquerque-bitencurte-b2bf070d85.jpeg"],
  ["f507067de5d183909a8381cdd5b732d7", "/members/caio-mendonca-barreto-de-brito-6f8eec0374.jpeg"],
  ["4f77067de5d1827892b681ee2c83d8f6", "/members/danilo-campos-deichmann-f6f9f87b3d.jpeg"],
  ["cdc7067de5d182728035016769ee25a6", "/members/filipe-ciriaco-marcelino-do-nascimento-106b5c4aab.jpeg"],
  ["a7f7067de5d182d48141013a516b4b3a", "/members/gustavo-cesar-barreto-santana-cc4d0ec263.jpeg"],
  ["d6e7067de5d182e49bb1819ca7f9c8a0", "/members/joao-vitor-viana-felix-af3b2bfe73.jpeg"],
  ["0b47067de5d1838995fc011c9ee0c2aa", "/members/luan-amaro-dos-santos-aragao-a39ea2e2a4.jpeg"],
  ["e3f7067de5d1829e95d681bea68cd86b", "/members/bruno-carvalho-santana-rocha-9062886023.jpeg"],
  ["0907067de5d183969164019e926d3bc5", "/members/artur-vinicius-santos-de-lima-4d5de176d6.jpeg"],
  ["12a7067de5d182349560018b045c2043", "/members/nayara-oliveira-santos-14cbfaa169.jpeg"],
  ["48b7067de5d18386a8f9812a69cb7ed1", "/members/pericles-dos-santos-leite-f75c0c56dd.jpeg"],
  ]);

export function getMemberPhoto(member: Pick<Member, "nome" | "nomeOriginal" | "notionId">, size: "thumbnail" | "profile" = "profile") {
  const src = PHOTO_BY_ID.get(member.notionId?.replaceAll("-", "").toLowerCase() ?? "")
    ?? PHOTO_BY_NAME.get(normalizeName(member.nomeOriginal || ""))
    ?? PHOTO_BY_NAME.get(normalizeName(member.nome))
    ?? "/placeholder-user.jpg";
  return src.endsWith(".jpeg") ? src.replace(".jpeg", size === "thumbnail" ? "-thumb.webp" : "-profile.webp") : src;
}
