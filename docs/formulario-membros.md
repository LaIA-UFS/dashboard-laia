# Atualização de membros

O notebook original (`notebooks/simmap_data_exploration.ipynb` na origem SimMAP) renomeava
perguntas de um CSV e unia respostas aos cadastros por semelhança de nome. Ele não atualizava
o Notion. O novo fluxo usa links individuais e o ID do cadastro para evitar associações incorretas.

| Informação | Destino |
| --- | --- |
| Nome completo | Notion: `Name` |
| E-mail | Notion: `Email` |
| Telefone | Notion: `Phone` |
| Tecnologias | Notion: opções existentes de `Techs` |
| Áreas de interesse | Notion: opções existentes de `Áreas de interesse` |
| Curso | Armazenamento privado do dashboard |
| Disponibilidade semanal | Armazenamento privado do dashboard |
| Data do envio confirmado | Armazenamento privado do dashboard |

`Cadastro` recebe `atualizado` somente se a propriedade e essa opção já existirem. Nenhuma
propriedade ou opção é criada. O payload do Notion não contém curso, disponibilidade ou data.
As demais perguntas antigas (maturidade, nota técnica, carreira, atributos etc.) ficam fora do
formulário; seus indicadores existentes permanecem sem dados até uma futura coleta autorizada.

## Fluxo

1. Administrador autenticado valida que a página pertence à base configurada e gera um link
   criptografado com validade de 7 dias e finalidade exclusiva de atualização de perfil.
2. O servidor valida o link, a base e o estado da página antes de exibir os cinco campos do Notion
   e lê apenas as respostas complementares do cadastro correspondente.
3. O envio verifica origem, tamanho, formato, confirmação, opções permitidas e revisão dos campos.
   O Notion fornece as opções de seleção; o formulário não cria novas opções indiretamente.
4. Um bloqueio Redis de 120 segundos serializa envios do mesmo membro. Um rascunho de curso e
   disponibilidade é salvo por 24 horas antes de atualizar os campos autorizados do Notion.
5. Depois do PATCH bem-sucedido, uma operação atômica no Redis publica a resposta complementar,
   remove o rascunho e libera o bloqueio. A resposta publicada não tem expiração.
6. O dashboard junta somente respostas publicadas com membros da base atual pelo ID estável,
   recalcula os gráficos de curso e disponibilidade e invalida os caches das duas fontes.

Não há transação distribuída entre os serviços: falha no segundo salvamento não é anunciada
como sucesso. O formulário permite recarregar os dados atualizados e recuperar o rascunho.
Uma mudança concorrente nos campos do Notion exige recarregar antes de sobrescrever.
O bloqueio protege envios pelo aplicativo; o Notion não oferece comparação-e-troca no PATCH,
portanto uma alteração direta durante a gravação ainda pode concorrer com o envio.

## Privacidade e operação

Os links são credenciais de acesso ao próprio cadastro: compartilhar apenas com o titular.
As páginas individuais são dinâmicas, sem indexação ou cache público, e usam `no-referrer`.
Os eventos de Analytics dessas rotas são descartados. Contatos não entram no payload do dashboard.
O armazenamento complementar contém apenas curso, disponibilidade e data, sem duplicar contatos.
Um membro removido/arquivado não pode usar o link e sua resposta não aparece nos gráficos.

O limite de cinco tentativas por minuto é por processo; instalações com alto tráfego devem
usar um limitador distribuído. As duas integrações externas precisam ser configuradas antes
de distribuir links. Não substitua essa persistência por arquivo local do servidor Vercel.

Referências: [atualizar página no Notion](https://developers.notion.com/reference/patch-page),
[opções de propriedades](https://developers.notion.com/reference/retrieve-a-data-source),
[REST e comandos Redis](https://upstash.com/docs/redis/features/restapi).
