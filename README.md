# SimMAP
Aplicação para contribuir no levantamento de dados de mapeamento de perfil.

Para rodar:

npm install<br>
npm run dev

## Notion

O dashboard utiliza as bases de [Membros](https://www.notion.so/2fcc2a812d0283af937001d7092f7d49)
e [Projetos](https://www.notion.so/41ec2a812d02818d9a2bd2f3881e5a9e) da LaIA.
A equipe de cada projeto determina os projetos exibidos no perfil dos membros.
Os dados e análises da liga usada como origem da cópia não são combinados com os da LaIA.

### Ativar a atualização automática

1. Abra [Minhas integrações do Notion](https://www.notion.so/profile/integrations)
   e crie uma integração interna para o workspace da LaIA. Habilite a leitura de conteúdo.
2. Nas páginas **Membros** e **Projetos**, abra **••• → Conexões** e adicione essa integração.
3. Copie o token da integração para `NOTION_TOKEN` em `.env.local`. Esse arquivo já contém
   os identificadores das duas bases e não é versionado. Não coloque o token em variáveis `NEXT_PUBLIC_*`.
4. Reinicie `npm run dev`. O dashboard passa a consultar o Notion no servidor e atualiza a tela
   a cada 30 segundos enquanto a aba está visível. Recarregar a página também consulta os dados atuais.

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
