# Dashboard LaIA
Dashboard administrativo de membros e projetos da Liga Acadêmica de Inteligência Artificial da UFS.

Para rodar:

Use Node.js 22, instale as dependências com `npm ci`, copie `.env.example` para
`.env.local`, configure o acesso administrativo e execute `npm run dev`.

## Publicação

- Repositório privado: [LaIA-UFS/dashboard-laia](https://github.com/LaIA-UFS/dashboard-laia).
- Projeto Vercel: [LaIA / dashboard-laia](https://vercel.com/la-ia/dashboard-laia).
- Endereço de produção: [dashboard-laia.vercel.app](https://dashboard-laia.vercel.app).

A publicação inicial utiliza os arquivos enviados ao Vercel. O repositório ainda precisa
ser conectado em **Settings → Git** para publicar automaticamente a cada alteração.
Para publicar manualmente, envie os arquivos versionados do projeto à página do projeto
no Vercel, sem incluir `.env.local`, `node_modules`, cópias de segurança ou credenciais.

O ambiente **Production** do Vercel contém `ADMIN_PASSWORD_HASH` e `SESSION_SECRET`
como segredos, além de `APP_URL` com o endereço HTTPS e dos identificadores das bases.
As credenciais não ficam no repositório. Alterações nessas variáveis exigem um novo deploy.

## Notion

O dashboard utiliza as bases de [Membros](https://www.notion.so/7057067de5d183eabcb9817fbdc94966)
e [Projetos](https://www.notion.so/e927067de5d182ff843b011f1ebd6bf8) da LaIA.
A equipe de cada projeto determina os projetos exibidos no perfil dos membros.
Os dados e análises da liga usada como origem da cópia não são combinados com os da LaIA.

### Ativar a atualização automática

1. Abra [Minhas integrações do Notion](https://www.notion.so/profile/integrations)
   e crie uma integração interna para o workspace da LaIA. Habilite a leitura de conteúdo.
2. Nas páginas **Membros** e **Projetos**, abra **••• → Conexões** e adicione essa integração.
3. Copie o token da integração para `NOTION_TOKEN` em `.env.local`. Esse arquivo já contém
   os identificadores das duas bases e não é versionado. Não coloque o token em variáveis `NEXT_PUBLIC_*`.
4. Reinicie `npm run dev`. O dashboard passa a consultar o Notion no servidor e atualiza a tela
   a cada 30 segundos enquanto a aba está visível, inclusive nos perfis e no organograma.
   A verificação é leve: a tela só é atualizada quando os dados mudam. Uma cache de 30 segundos
   compartilha consultas entre páginas; o botão Atualizar força uma nova consulta autenticada.

No site publicado, adicione `NOTION_TOKEN` como **Secret** no ambiente **Production** em
**Vercel → Environment Variables** e faça **Redeploy**. Os dois identificadores das bases
já estão configurados. Sem token, o site utiliza a última cópia salva das bases da LaIA.

Sem token, o dashboard mostra a última sincronização salva em `db/db.json`, com a data indicada
na tela. Essa cópia não recebe novas alterações do Notion automaticamente.
Com token configurado, falhas de autenticação ou de acesso são reportadas, sem recorrer aos dados da liga original.

### Salvar uma cópia atualizada

Com o token configurado, execute `npm run sync:notion` usando Node.js 22.17 ou mais recente.
O comando consulta as duas bases e atualiza `db/db.json` de forma atômica.
A versão anterior é preservada em `db/backups/`, pasta ignorada pelo Git.

`GET /api/notion/status` informa o modo (`live` ou `snapshot`), a data da sincronização
e as quantidades de membros e projetos, sem expor credenciais ou dados de contato.

Validação: `npm run test:notion`, `npm run test:auth`, `npx tsc --noEmit` e `npm run build`.

## Acesso administrativo

O dashboard exige login com a conta `laia@dcomp.ufs.br`.
O acesso protege as páginas, os perfis e a consulta de estado da integração com o Notion.
A opção **Sair** encerra a sessão no navegador. A sessão expira após 8 horas.

As configurações privadas ficam em `.env.local`:

- `ADMIN_PASSWORD_HASH`: senha armazenada com scrypt, nunca em texto aberto.
- `SESSION_SECRET`: segredo aleatório de pelo menos 32 caracteres para proteger a sessão.
- `APP_URL`: endereço completo da aplicação. Ao publicar, use a URL HTTPS definitiva para que o cookie seja enviado apenas por conexão segura.

Não existe cadastro público de contas. Alterar a senha configurada invalida as sessões anteriores.
Os limites de tentativas são mantidos pelo processo do servidor; em uma implantação com múltiplas
instâncias, utilize um armazenamento compartilhado para os contadores.

Referências: [autenticação](https://developers.notion.com/reference/authentication)
e [consulta de bases](https://developers.notion.com/reference/query-a-data-source).

## Navegação e fotos

O menu lateral pode ser recolhido no computador e abre como painel em telas pequenas.
A preferência de recolhimento é preservada durante a navegação. A seção Membros reúne
busca por nome, núcleo, tecnologia e projeto, filtros de núcleo/cargo e perfis completos.
Todos os indicadores e blocos existentes do dashboard foram mantidos no layout compacto.

As fotos em `public/members` têm miniaturas WebP para os cards e versões maiores para
os perfis. `lib/member-media.ts` associa os nomes e suas variantes aos arquivos, sem
confundir pessoas com nomes parecidos. Cadastros sem foto exibem as iniciais.

Os gráficos usam um único contêiner responsivo e não repetem animações a cada atualização.
