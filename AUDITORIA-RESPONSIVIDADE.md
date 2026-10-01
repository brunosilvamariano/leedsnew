# Auditoria funcional e responsiva — BizPeek

Data: 01/10/2026.

## Escopo

Revisão do fluxo de busca de empresas e das telas públicas e autenticadas em quatro faixas: celular pequeno (até 390 px), celular (até 520/640 px), tablet (até 800/900 px) e desktop.

Rotas incluídas: entrada, login, cadastro, recuperação e redefinição de senha, dashboard, explorar empresas, leads, pipeline, agenda, anotações, favoritos, configurações, assinatura e administração.

## Falhas corrigidas

1. **Detalhe aberto automaticamente após pesquisar.** A busca, a restauração da última consulta e a paginação selecionavam a primeira empresa. Em celular, o painel de detalhes ocupa o viewport e escondia a lista. Agora a lista permanece visível e o detalhe só abre após toque explícito.
2. **Resultado cortado no celular.** A grade do card mantinha conteúdo maior que a coluna disponível. O card agora limita todas as colunas, reserva uma largura segura para o score e esconde apenas o texto auxiliar do score no menor breakpoint.
3. **Rolagem horizontal indisponível.** A regra mobile trocava o contêiner por `overflow: visible`. A rolagem por toque foi restaurada no viewport e na tabela, com contenção de overscroll.
4. **Agenda estreita.** Os três cartões auxiliares passam para uma coluna em celulares.
5. **Leads e favoritos com textos longos.** Nomes e descrições agora respeitam a largura; os chips mantêm uma faixa horizontal rolável.
6. **Pipeline no toque.** O kanban ganhou rolagem horizontal explícita, contenção de gesto e alinhamento por coluna.
7. **Modais no celular.** Passam a abrir pela base, respeitam `100dvh`, continuam roláveis com teclado virtual e usam campos de pelo menos 44 px.
8. **Estouro da página.** `html` e `body` impedem overflow global sem bloquear os contêineres que precisam rolar horizontalmente.

## Verificações automatizadas concluídas

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm run build`: aprovado; 28 rotas compiladas.
- Todas as rotas públicas responderam HTTP 200.
- Todas as rotas autenticadas redirecionaram corretamente para `/login` sem sessão.
- `git diff --check`: sem erro de whitespace.

## Matriz de comportamento esperado

| Área | Celular | Tablet | Desktop |
|---|---|---|---|
| Navegação | menu compacto/sobreposto | menu compacto | sidebar completa |
| Explorar — lista | 10 itens por página, cards ajustados | cards ajustados | lista com colunas |
| Explorar — tabela | rolagem horizontal por toque | rolagem horizontal | tabela completa |
| Detalhe da empresa | painel após toque, com scroll vertical | painel sobreposto | painel lateral |
| Pipeline | colunas em faixa horizontal | faixa horizontal | cinco colunas |
| Leads/favoritos | texto truncado e chips roláveis | lista adaptada | colunas completas |
| Agenda | cartões em uma coluna | layout empilhado | calendário + painel lateral |
| Modais/formulários | folha inferior rolável | diálogo central | diálogo central |

## Validação manual necessária antes do deploy

O navegador automatizado e o Docker Desktop não ficaram acessíveis ao processo desta auditoria. Por isso, após iniciar o ambiente, confirmar em dispositivo real:

1. Pesquisar um nicho e confirmar que a lista aparece primeiro.
2. Abrir e fechar uma empresa.
3. Trocar de página e confirmar que nenhum detalhe abre sozinho.
4. Alternar lista/tabela e arrastar a tabela horizontalmente.
5. Adicionar lead, favoritar e abrir o registro salvo.
6. Percorrer todas as rotas nas larguras 360, 390, 768, 1024 e 1440 px.
7. Confirmar que não existe conteúdo cortado à direita nem rolagem global involuntária.

## Critério de publicação

Publicar somente depois do teste manual acima e de nova execução de `npm run typecheck`, `npm run lint` e `npm run build` no mesmo commit.
