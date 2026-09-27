# Validação da entrega — BizPeek SaaS

Data: 27/09/2026.

## Verificado

- Build de produção Next.js com Webpack: aprovado.
- TypeScript em modo estrito: aprovado.
- ESLint do código-fonte: sem erros (resultado final registrado ao empacotar).
- Migrations aplicadas em um PostgreSQL local vazio: aprovado, 14 tabelas criadas.
- Script de demonstração: executado com sucesso em banco local, criando conta e registros fictícios.
- 40 verificações de integração e segurança: aprovadas. Resultados individuais em `docs/security-test-results.json`.

As verificações usaram os handlers compilados do Next.js com o contexto de requisição do framework, Better Auth e um PostgreSQL local. Não foram mocks do banco nem apenas inspeções de código. O modo de execução foi direto, sem porta HTTP. As credenciais usadas pertencem exclusivamente ao ambiente de teste.

Cobertura: bloqueio sem sessão; rejeição de senha incorreta; cookies HttpOnly; tentativa de definir papel de administrador no cadastro; isolamento de leitura/edição/exclusão; ignorar dono enviado pelo cliente; origem inválida; validação de campos; proteção do admin; vínculo de eventos ao lead do dono; registro de contato e histórico no calendário; perfil; suspensão e invalidação de sessão; acesso ativo/vencido/inadimplente; recuperação de senha, uso único do token e invalidação das sessões antigas; rejeição de webhook não autenticado; logout.

## Não validado ponta a ponta

- Navegação, responsividade, acessibilidade e aparência em um navegador conectado ao aplicativo. A revisão automática bloqueou a inicialização do servidor nesta sessão e a porta 3147 informada permaneceu sem conexão. A tentativa pelo navegador do app retornou ERR_CONNECTION_REFUSED. Portanto, não há alegação de aprovação visual ou E2E das telas.
- Google OAuth com uma conta real: faltam GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.
- Envio/recebimento de e-mail: faltam Resend e domínio de envio. O fluxo de redefinição foi testado com token inserido no banco de testes, sem envio real de e-mail.
- Checkout, renovação, cancelamento, reenvio/ordenação de webhooks e portal Stripe com um ambiente do provedor: faltam chaves, preço e webhook. A autorização por status de assinatura foi testada por estados controlados no banco; isso não equivale a uma transação Stripe completa.
- Busca Google Places com chave e faturamento reais.

## Antes de vender acesso

Execute a conferência no navegador, conecte as integrações em modo de teste e percorra uma assinatura completa. Em seguida, configure domínio HTTPS, chaves de produção, verificação de e-mail e BILLING_ENABLED=true. As instruções estão no README.md.

Não há cobrança real ativada no `.env` entregue. Nenhum dado real do usuário foi usado nos testes.
