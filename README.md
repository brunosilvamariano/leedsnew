# BizPeek — SaaS de prospecção e relacionamento

Esta versão transforma a base enviada em um aplicativo multiusuário com login real, dados no PostgreSQL, perfil individual, CRM, agenda, anotações e assinatura de R$ 50/mês.

## Rodar no seu computador

Pré-requisitos: Node.js 22 ou superior e Docker Desktop iniciado (ou um PostgreSQL existente).

1. Extraia o ZIP e abra o terminal na pasta do projeto.
2. Execute `npm ci`.
3. Execute `npm run setup:env`. O comando preserva um `.env` existente. O ZIP já inclui um `.env` apenas para uso local, com segredos gerados para esta entrega.
4. Execute `docker compose up -d` e aguarde o banco ficar saudável.
5. Execute `npm run db:deploy`.
6. Execute `npm run dev` e abra http://localhost:3000.
7. Crie sua conta na tela de cadastro.
8. Para tornar essa conta administradora, execute `npm run admin -- seu-email@exemplo.com`. Saia e entre novamente.

Se a porta 3000 estiver ocupada, altere BETTER_AUTH_URL no `.env` para `http://localhost:3001` e execute `npm run dev -- -p 3001`. Não use um endereço de autenticação diferente do endereço aberto no navegador.

Para testar a versão de produção: `npm run build` e depois `npm start`.

## O que está implementado

- Cadastro com e-mail e senha, sessões HttpOnly, logout, Google OAuth, verificação de e-mail configurável e recuperação de senha com token temporário de uso único.
- Rotas autenticadas e autorização no servidor. A API obtém o dono pela sessão, nunca por um `userId` enviado pelo navegador.
- Dashboard individual com indicadores reais, gráfico por período e distribuição do pipeline.
- Leads manuais e vindos da busca, pesquisa, edição, exclusão, valor potencial, estágio comercial e registro de contatos.
- Pipeline com mudança de etapa. Não há arrastar e soltar; a mudança é feita pelo seletor de cada cartão.
- Calendário mensal com navegação, compromissos vinculados a leads, observações, edição e conclusão.
- “Contatei hoje” registra um evento concluído no calendário e atualiza o último contato do lead.
- Anotações persistentes com categorias livres, busca, cinco cores e fixação.
- Perfil com nome, foto por upload e alteração de senha. Contas Google recebem a foto do provedor.
- Busca existente do Google Places preservada e protegida por login, assinatura e cota diária.
- Administração em `/admin`: contas, assinaturas, receita mensal estimada, integrações e suspensão/reativação de usuários. O admin não recebe o conteúdo privado dos leads e anotações dos clientes.
- Stripe Checkout de assinatura, portal de faturas/cancelamento, webhook assinado e autorização baseada no status e prazo da assinatura.

## Google: login e busca são integrações diferentes

Para login, configure um cliente OAuth de aplicação Web no Google Cloud:

- Origem local: `http://localhost:3000`.
- Callback local: `http://localhost:3000/api/auth/callback/google`.
- Em produção, use o mesmo caminho no seu domínio HTTPS.
- Configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
- Durante testes, autorize os usuários de teste na tela de consentimento. Publique o aplicativo quando estiver pronto.

Para pesquisar empresas, habilite Places API (New) e faturamento no Google Cloud. Configure `GOOGLE_PLACES_API_KEY` no servidor. O limite padrão é 20 buscas por usuário/dia UTC; ajuste `SEARCH_DAILY_LIMIT` conforme seus custos. Cada busca pode consultar mais de uma página do provedor. A mensalidade de R$ 50 não elimina os custos cobrados pelo Google.

## E-mails e recuperação de senha

Configure um domínio de envio validado no Resend, `RESEND_API_KEY` e `EMAIL_FROM`.

Em produção, use `REQUIRE_EMAIL_VERIFICATION=true`. O cadastro envia confirmação de e-mail. A tela de recuperação envia um link temporário; redefinir a senha invalida as sessões antigas. Não são exibidos links de recuperação nem tokens na interface.

Sem Resend configurado, o envio de e-mails não funciona. A avaliação local usa verificação de e-mail desativada para permitir testar cadastro e CRM.

## Assinatura de R$ 50 por mês

1. Comece no modo de teste da Stripe.
2. Crie um produto BizPeek Pro e um preço recorrente mensal de **BRL 50,00**, sem outro intervalo ou quantidade. Copie o ID `price_...` para `STRIPE_PRICE_ID`.
3. Configure `STRIPE_SECRET_KEY` com uma chave de teste.
4. Ative o Customer Portal no painel Stripe para permitir cancelamento e atualização de pagamento. Não disponibilize planos alternativos pelo portal sem revisar a lógica do produto.
5. Crie o webhook `/api/webhooks/stripe` e configure `STRIPE_WEBHOOK_SECRET`.
6. Assine os eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` e `invoice.payment_failed`.
7. Para testar eventos localmente, use a Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` e copie o segredo temporário exibido para `.env`.
8. Use `BILLING_ENABLED=true` para exigir assinatura. Reinicie o servidor após alterar variáveis.

Somente o webhook confirma o acesso. A URL `?success=1` não libera assinatura. O webhook consulta o estado atual no provedor para tratar reenvios e eventos fora de ordem. Uma trava no PostgreSQL evita checkouts simultâneos para a mesma conta. Uma sessão de checkout aberta é reutilizada.

Contas sem assinatura ativa ou com período expirado mantêm acesso de leitura aos próprios dados e ao gerenciamento do plano, mas não podem alterar o CRM nem fazer buscas pagas. O administrador possui acesso próprio sem assinatura.

A receita exibida no admin é estimativa: assinaturas ativas × R$ 50, antes de taxas, impostos, reembolsos ou disputas. Não substitui o relatório financeiro Stripe. Estornos/disputas exigem acompanhamento operacional no provedor; não existe automação fiscal ou emissão de nota fiscal nesta entrega.

## Colocar em produção

- Use PostgreSQL persistente com backup e uma URL adequada ao provedor. O Docker incluso é para desenvolvimento local.
- No Neon, configure `DATABASE_URL` com o endereço com pooler (host com `-pooler`) e `DIRECT_URL` com o endereço direto, usado pelas migrations. No ambiente local, as duas apontam para o mesmo banco do Docker.
- Defina BETTER_AUTH_URL com seu domínio HTTPS e gere um novo BETTER_AUTH_SECRET.
- Configure as integrações e use `BILLING_ENABLED=true` e `REQUIRE_EMAIL_VERIFICATION=true`.
- Execute `npm ci`, `npm run db:deploy` e `npm run build`; inicie com `npm start`.
- Não envie `.env` ao Git. Use o gerenciador de segredos da hospedagem.
- O proxy deve preservar o IP real do cliente e rejeitar cabeçalhos de encaminhamento forjados. Better Auth usa limitação de tentativas persistida no banco; sem IP confiável, o limite pode ser compartilhado entre clientes.
- O build usa Webpack e workers por threads para ser reproduzível no ambiente usado na entrega.

## Banco existente e dados da versão antiga

O schema original de Company, Lead e tabelas relacionadas foi preservado. As tabelas novas são User, Session, Account, Verification, RateLimit, Subscription e WorkspaceRecord.

Há duas migrations: `202609270000_legacy_baseline` (schema original) e `202609270001_saas_workspace` (tabelas novas).

Para um banco vazio, `npm run db:deploy` aplica ambas. Se o banco já contém exatamente o schema original, faça backup e confira as diferenças antes de registrar o baseline: `npx prisma migrate resolve --applied 202609270000_legacy_baseline`; depois aplique `npm run db:deploy`. Não execute o baseline sobre um banco incompatível.

Leads da versão antiga guardados em localStorage não são importados automaticamente: não havia um dono verificável para esses dados. Eles não são apagados pelo novo sistema. A migração deles deve identificar explicitamente a conta proprietária. Os dados das tabelas antigas também permanecem preservados e não são expostos pelas novas APIs.

## Verificação

Consulte `VALIDACAO.md` para os testes executados e as integrações ainda não validadas com credenciais reais.

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Os testes de segurança criam usuários e registros próprios. Execute apenas em banco local de testes, nunca em produção. Após compilar, no PowerShell:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://usuario:senha@localhost:5433/banco_de_testes'
$env:TEST_BASE_URL = 'http://localhost:3000'
$env:TEST_IN_PROCESS = 'true'
node --env-file=.env scripts/test-security.mjs
```

DATABASE_URL no `.env` deve apontar para o mesmo banco de testes. O modo direto executa os handlers compilados com o contexto de requisição do Next.js, sem precisar abrir uma porta HTTP. Para rodar contra o servidor, remova TEST_IN_PROCESS e inicie o aplicativo no endereço TEST_BASE_URL.

## Referências técnicas

- https://nextjs.org/docs/app/guides/authentication
- https://better-auth.com/docs/installation
- https://better-auth.com/docs/authentication/google
- https://better-auth.com/docs/authentication/email-password
- https://docs.stripe.com/billing/subscriptions/webhooks

## Explorar com dados de demonstração

Depois de configurar o banco local e aplicar as migrations, execute `npm run demo`. O script cria `demo@bizpeek.local` com uma senha aleatória mostrada apenas no terminal, além de empresas, contatos e anotações fictícias. Ele recusa execução em banco remoto ou NODE_ENV=production e não altera uma conta demo que já existe.

Use a conta demo para conhecer as telas e sua própria conta para receber acesso administrativo pelo comando `npm run admin -- seu-email@exemplo.com`.
