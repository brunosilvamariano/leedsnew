# Calendário e recebimentos

As anotações ficam em `/agenda`. A rota antiga `/anotacoes` redireciona para a agenda. Notas existentes sem data explícita usam a data de criação no fuso do navegador; editar e salvar fixa a data escolhida. Nenhuma nota é excluída ou recriada. A opção de repetição anual serve para aniversários e datas locais. Uma nota de 29/02 reaparece em anos bissextos.

A base inclui feriados nacionais fixos, datas móveis e uma seleção de datas comemorativas e comerciais brasileiras. Não é um inventário de todas as datas municipais, estaduais, profissionais ou religiosas do país. Datas locais podem ser adicionadas pelo usuário. O calendário é calculado por ano, sem depender de uma API externa.

Carnaval, Cinzas e Corpus Christi não são apresentados como feriados nacionais. Pontos facultativos se referem ao calendário federal e podem ter expediente parcial; a aplicação local depende da legislação. Pontes extraordinárias e decisões anuais não são inferidas. A Sexta-feira da Paixão é identificada como feriado religioso local.

Fontes consultadas em 27/09/2026:
- https://agenciagov.ebc.com.br/noticias/202512/confira-o-calendario-oficial-de-feriados-nacionais-e-pontos-facultativos-em-2026
- https://cliente.sebraees.com.br/calendario-promocional
- https://digital.sebraers.com.br/blog/marketing-e-vendas/10-dicas-para-impulsionar-as-vendas-no-dia-dos-pais/
- https://bvsms.saude.gov.br/datas-da-saude/

No pipeline, negócios Ganhos podem receber um plano de até 60 parcelas mensais. Valores são armazenados em centavos e o resto da divisão é distribuído nas primeiras parcelas. Um vencimento no dia 31 é limitado ao último dia de meses menores. Cada parcela guarda vencimento e data de pagamento, pode ser estornada e tem situação derivada das datas. Não há cobrança, emissão de boleto ou integração com a assinatura do SaaS. Edições só são persistidas ao salvar.

Os campos novos são opcionais dentro dos registros JSON existentes. Não exige migração SQL adicional. A API mantém as verificações de sessão, assinatura, origem e proprietário e valida o plano antes de gravar.
