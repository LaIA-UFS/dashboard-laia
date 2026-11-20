import type { Member } from "@/lib/types";

const PHOTO_ENTRIES = [
  { label: "Arthur Felipe Dantas Melo", src: "/members/arthur-felipe-dantas-melo.jpeg" },
  { label: "Arthur Vinícius Costa Barreto", src: "/members/arthur-vinicius-costa-barreto.jpeg" },
  { label: "Artur Vinícius Santos de Lima", src: "/members/artur-vinicius-santos-de-lima.jpeg" },
  { label: "Bruno Carvalho Santana Rocha", src: "/members/bruno-carvalho-santana-rocha.jpeg" },
  { label: "Bruno Lopes dos Santos", src: "/members/bruno-lopes-dos-santos.jpeg" },
  { label: "Caio Mendonça Barreto de Brito", src: "/members/caio-mendonca-barreto-de-brito.jpeg" },
  { label: "Danilo Campos Deichmann", src: "/members/danilo-campos-deichmann.jpeg" },
  { label: "Dimitri Martins Oliveira", src: "/members/dimitri-martins-oliveira.jpeg" },
  { label: "Filipe Ciríaco Marcelino do Nascimento", src: "/members/filipe-ciriaco-marcelino-do-nascimento.jpeg" },
  { label: "Gustavo César Barreto Santana", src: "/members/gustavo-cesar-barreto-santana.jpeg" },
  { label: "Helen da Silva Bispo", src: "/members/helen-da-silva-bispo.jpeg" },
  { label: "João Pedro Ferreira da Cruz", src: "/members/joao-pedro-ferreira-da-cruz.jpeg" },
  { label: "João Vitor Viana Felix", src: "/members/joao-vitor-viana-felix.jpeg" },
  { label: "José Marcos Prado Bittenccourt", src: "/members/jose-marcos-prado-bittenccourt.jpeg" },
  { label: "Luan Amaro dos Santos Aragão", src: "/members/luan-amaro-dos-santos-aragao.jpeg" },
  { label: "Nayara Oliveira Santos", src: "/members/nayara-oliveira-santos.jpeg" },
  { label: "Péricles dos Santos Leite", src: "/members/pericles-dos-santos-leite.jpeg" },
  { label: "Raíssa Cavalcante de Albuquerque Bitencurte", src: "/members/raissa-cavalcante-de-albuquerque-bitencurte.jpeg" },
  { label: "Sidnei Silva Gonçalves Júnior", src: "/members/sidnei-silva-goncalves-junior.jpeg" },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value).split(" ").filter(Boolean);
}

export function getMemberPhoto(member: Pick<Member, "nome" | "nomeOriginal">) {
  const memberTokens = new Set(tokenize(member.nomeOriginal || member.nome));

  let selected: string | null = null;
  let bestScore = 0;

  for (const entry of PHOTO_ENTRIES) {
    const entryTokens = tokenize(entry.label);
    const score = entryTokens.filter((token) => memberTokens.has(token)).length;

    if (score === entryTokens.length && score > bestScore) {
      selected = entry.src;
      bestScore = score;
    }
  }

  return selected ?? "/placeholder-user.jpg";
}
