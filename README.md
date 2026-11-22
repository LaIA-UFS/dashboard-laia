# Dashboard LaIA
Dashboard administrativo de membros e projetos da Liga Acadêmica de Inteligência Artificial da UFS.

Para rodar:

Use Node.js 22, instale as dependências com `npm ci`, copie `.env.example` para
`.env.local`, configure o acesso administrativo e execute `npm run dev`.

## Publicação

- Repositório privado: [LaIA-UFS/dashboard-laia](https://github.com/LaIA-UFS/dashboard-laia).
- Projeto Vercel: [LaIA / dashboard-laia](https://vercel.com/la-ia/dashboard-laia).
- Endereço de produção: [dashboard-laia.vercel.app](https://dashboard-laia.vercel.app).

Com o repositório conectado em **Settings → Git**, os commits enviados à branch de produção
iniciam uma nova publicação. Confira o commit em **Deployments**; alterações locais não
publicam o site. Nunca envie `.env.local`, `node_modules`, cópias de segurança ou credenciais.

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

Validação: `npm run test:notion`, `npm run test:auth`, `npm run test:forms`, `npx tsc --noEmit` e `npm run build`.

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

## Formulário individual de membros

Abra **Formulários** no menu administrativo, procure o membro e gere seu link.
O membro abre o link sem login administrativo, confere o cadastro e envia as respostas.
Os links são criptografados, específicos de um cadastro, duram 7 dias e não são enviados
automaticamente. Gerar outro link não revoga o anterior; trocar `MEMBER_FORM_SECRET`
(ou `SESSION_SECRET` quando não há chave separada) revoga todos os links anteriores.

Nome, e-mail, telefone, tecnologias e áreas de interesse atualizam apenas as propriedades
existentes no Notion. Curso, disponibilidade e data da resposta ficam exclusivamente no
armazenamento privado do dashboard, associados ao ID estável do membro. Alimentam os perfis,
filtros e gráficos sem criar campos ou escrever esses dados no conteúdo das páginas do Notion.
Cargos, núcleos e projetos continuam sendo definidos pela diretoria no Notion.

Para ativar o recebimento:

1. Crie uma integração interna separada no workspace da LaIA com **leitura e atualização de
   conteúdo**. Conecte-a somente à base **Membros**; não habilite inserção nem alteração de esquema.
   Cadastre o token como segredo `NOTION_FORM_TOKEN`, mantendo `NOTION_TOKEN` somente para leitura.
2. No projeto correto do Vercel, conecte **Upstash Redis** em **Storage / Marketplace**.
   O Marketplace pode criar `KV_REST_API_URL` e `KV_REST_API_TOKEN`. A conexão direta
   usa `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`. O token deve permitir escrita.
   Configure a persistência sem despejo automático de chaves; não use um banco de cache descartável.
   Separe o banco de Preview do banco de Production para testes não alterarem respostas reais.
3. Confira `APP_URL=https://dashboard-laia.vercel.app` em Production e faça um novo deploy.
   Para desenvolver, use as mesmas variáveis no `.env.local`, com o endereço local correto.
   Nenhuma dessas credenciais deve ser publicada ou enviada pelo chat.

Sem essas conexões, a prévia funciona e o envio fica desabilitado. O dashboard atual continua
funcionando. Se o armazenamento ficar indisponível, o painel mostra um aviso e preserva a consulta
ao Notion. Após um envio completo, os gráficos e perfis recebem os dados na atualização automática
da página (30 segundos) ou pelo botão Atualizar, sem redeploy.

O sistema só confirma sucesso depois dos dois salvamentos. Um rascunho privado de curso e
disponibilidade dura 24 horas para recuperar um envio interrompido; o dashboard usa somente
respostas confirmadas. Falhas após a atualização do Notion exibem uma mensagem específica e
permitem reabrir o formulário para recuperar as respostas. Não existe transação única entre
os dois serviços. Os limites por processo são uma proteção básica; o bloqueio por membro é
compartilhado no Redis para evitar envios simultâneos.

Detalhes do fluxo e dos campos: [formulario-membros.md](docs/formulario-membros.md).
