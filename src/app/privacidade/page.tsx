import Link from "next/link";
import s from "../landing.module.css";
export const metadata = { title: "Política de privacidade" };
export default function Privacy() {
  return (
    <div className={s.page}>
      <main className={s.legal}>
        <Link href="/">← Voltar ao BizPeek</Link>
        <h1>Política de privacidade</h1>
        <p>Atualizado em 29 de setembro de 2026.</p>
        <h2>Dados utilizados pelo serviço</h2>
        <p>
          O BizPeek utiliza dados de cadastro, como nome e e-mail; informações
          de autenticação e sessão; registros inseridos no workspace, como
          leads, notas e compromissos; e identificadores e situação da
          assinatura. Registros técnicos de acesso podem incluir endereço IP e
          informações do navegador.
        </p>
        <h2>Finalidades</h2>
        <p>
          Essas informações permitem criar e autenticar sua conta, armazenar sua
          organização comercial, processar a assinatura, prestar suporte e
          proteger o serviço contra abuso. O tratamento deve observar as bases
          legais aplicáveis a cada finalidade, incluindo execução do contrato e
          cumprimento de obrigações legais.
        </p>
        <h2>Serviços utilizados</h2>
        <p>
          A aplicação é hospedada na Vercel e utiliza banco de dados na Neon. A
          Stripe processa pagamentos; os dados completos do cartão são
          informados no ambiente dela. A busca de empresas utiliza Google
          Places. Se você escolher entrar com Google, os dados autorizados nesse
          fluxo são usados para autenticar sua conta. E-mails transacionais
          podem ser enviados pela Resend quando esse recurso estiver
          configurado.
        </p>
        <p>
          Esses fornecedores podem processar informações em outros países,
          conforme suas operações e políticas. Compartilhamos as informações
          necessárias às funcionalidades utilizadas.
        </p>
        <h2>Sessões e armazenamento</h2>
        <p>
          O serviço utiliza cookies de autenticação para manter a sessão.
          Cancelar uma assinatura não equivale a excluir sua conta ou os
          registros do workspace. Pedidos de exclusão podem ser enviados ao
          contato abaixo; obrigações legais e necessidades de segurança podem
          exigir a conservação de determinados registros.
        </p>
        <h2>Seus direitos e contato</h2>
        <p>
          Você pode solicitar informações sobre o tratamento, acesso, correção e
          exclusão de dados, além dos demais direitos aplicáveis previstos na{" "}
          <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm">
            Lei Geral de Proteção de Dados
          </a>
          . A análise do pedido pode exigir confirmação de identidade para
          proteger sua conta.
        </p>
        <p>
          Canal do BizPeek para atendimento e privacidade:{" "}
          <a href="mailto:brunomariano.sv@gmail.com">
            brunomariano.sv@gmail.com
          </a>
          .
        </p>
        <p>
          Ao inserir dados de terceiros, respeite os direitos dessas pessoas e
          utilize informações adequadas à sua finalidade comercial.
        </p>
        <p>
          <Link href="/termos">Consultar os termos de uso</Link>
        </p>
      </main>
    </div>
  );
}
