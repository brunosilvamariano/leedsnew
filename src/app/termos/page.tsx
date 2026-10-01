import Link from "next/link";
import s from "../landing.module.css";
export const metadata = { title: "Termos de uso" };
export default function Terms() {
  return (
    <div className={s.page}>
      <main className={s.legal}>
        <Link href="/">← Voltar ao BizPeek</Link>
        <h1>Termos de uso</h1>
        <p>Atualizado em 29 de setembro de 2026.</p>
        <h2>O serviço</h2>
        <p>
          O BizPeek oferece ferramentas online de prospecção e organização
          comercial: busca de empresas, leads, pipeline, calendário e anotações.
          Resultados de busca dependem das fontes disponíveis e não representam
          garantia de vendas ou de exatidão dos dados de terceiros.
        </p>
        <h2>Sua conta e o uso das informações</h2>
        <p>
          Forneça informações corretas, proteja suas credenciais e utilize
          apenas dados que você tenha autorização ou fundamento adequado para
          tratar. Não use o serviço para spam, fraude, acesso indevido ou
          violação de direitos de terceiros. Confira os dados de contato antes
          de utilizá-los.
        </p>
        <h2>Plano, pagamento e cancelamento</h2>
        <p>
          O plano inicial BizPeek Pro custa R$ 50 por mês, com renovação mensal
          e pagamento processado pela Stripe. Confira o valor e as condições no
          checkout antes de confirmar. A busca está sujeita à cota diária do
          plano. Recursos de busca e gravação dependem de uma assinatura ativa.
        </p>
        <p>
          Você pode solicitar o cancelamento em Meu plano → Gerenciar assinatura
          e faturas. Quando agendado para o fim do período, o acesso é mantido
          até a data informada na conta. Falhas de pagamento podem restringir
          recursos que exigem assinatura.
        </p>
        <p>
          Para dúvidas sobre cobrança, pedidos de reembolso ou exercício de
          direitos aplicáveis, entre em contato pelo e-mail abaixo. Estas
          informações não afastam direitos previstos na legislação aplicável.
        </p>
        <h2>Contato</h2>
        <p>
          Atendimento do BizPeek:{" "}
          <a href="mailto:brunomariano.sv@gmail.com">
            brunomariano.sv@gmail.com
          </a>
          .
        </p>
        <p>
          Veja também nossa{" "}
          <Link href="/privacidade">Política de privacidade</Link>.
        </p>
      </main>
    </div>
  );
}
