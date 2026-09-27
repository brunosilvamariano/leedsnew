"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
export function AuthScreen({
  mode,
  google = false,
  token = "",
}: {
  mode: "login" | "register" | "forgot" | "reset";
  google?: boolean;
  token?: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [show, setShow] = useState(false);
  const titles = {
    login: "Seu próximo negócio\ncomeça aqui.",
    register: "Vamos criar\ngrandes conexões.",
    forgot: "Vamos recuperar\nseu acesso.",
    reset: "Um novo começo,\numa nova senha.",
  };
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget),
      email = String(data.get("email") || ""),
      password = String(data.get("password") || "");
    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              name: String(data.get("name")),
              email,
              password,
            })
          : mode === "login"
            ? await authClient.signIn.email({ email, password })
            : mode === "forgot"
              ? await authClient.requestPasswordReset({
                  email,
                  redirectTo: "/redefinir-senha",
                })
              : await authClient.resetPassword({
                  newPassword: password,
                  token,
                });
      if (result.error) {
        setMessage(
          mode === "login"
            ? "Não foi possível entrar. Confira e-mail e senha, ou confirme seu e-mail."
            : result.error.message ||
                "Não foi possível concluir. Tente novamente.",
        );
        return;
      }
      if (mode === "forgot")
        setMessage(
          "Se houver uma conta com esse e-mail, você receberá as instruções para redefinir a senha.",
        );
      else if (mode === "reset")
        setMessage("Senha atualizada. Você já pode entrar com a nova senha.");
      else if (
        mode === "register" &&
        !(result.data && "token" in result.data && result.data.token)
      )
        setMessage(
          "Conta criada! Confira seu e-mail para confirmar o cadastro e depois entre.",
        );
      else
        window.location.href = new URL(
          "/dashboard",
          window.location.origin,
        ).href;
    } catch {
      setMessage("Não foi possível conectar. Tente novamente em instantes.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-story">
        <Link className="wordmark" href="/login">
          <span>✳</span> bizpeek.
        </Link>
        <div>
          <span className="eyebrow">MENOS PLANILHAS. MAIS POSSIBILIDADES.</span>
          <h1>
            Conexões que
            <br />
            viram <em>negócios.</em>
          </h1>
          <p>
            Encontre oportunidades, cultive relacionamentos e acompanhe cada
            conquista em um só lugar.
          </p>
          <div className="auth-art">
            <div className="art-orbit" />
            <div className="art-card">
              <span>SEU POTENCIAL, ORGANIZADO</span>
              <strong>
                O próximo passo
                <br />
                faz a diferença.
              </strong>
              <div className="art-bars">
                {[25, 40, 33, 60, 50, 72, 85, 100].map((h, i) => (
                  <i key={i} style={{ height: h }} />
                ))}
              </div>
              <small>Prospecção · Relacionamento · Crescimento</small>
            </div>
            <span className="floating-pill">
              ✦ Uma visão mais clara do seu negócio
            </span>
          </div>
        </div>
        <small>Feito para quem transforma conversas em oportunidades.</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-box">
          <span className="eyebrow">SEU ESPAÇO PARA CRESCER</span>
          <h2 style={{ whiteSpace: "pre-line" }}>{titles[mode]}</h2>
          <p>
            {mode === "login"
              ? "Bem-vindo de volta. Vamos continuar de onde você parou?"
              : mode === "register"
                ? "Crie sua conta e conheça o BizPeek Pro por R$ 50/mês."
                : "A segurança da sua conta vem em primeiro lugar."}
          </p>
          {(mode === "login" || mode === "register") && (
            <>
              <button
                className="google-button"
                disabled={!google || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await authClient.signIn.social({
                      provider: "google",
                      callbackURL: "/dashboard",
                    });
                    if (r.error)
                      setMessage("Não foi possível conectar ao Google.");
                  } catch {
                    setMessage("Falha de conexão com o Google.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <b style={{ color: "#4285f4" }}>G</b> Continuar com Google
              </button>
              {!google && (
                <small className="muted">
                  Login Google aguardando configuração do administrador.
                </small>
              )}
              <div className="auth-divider">ou continue com e-mail</div>
            </>
          )}
          <form onSubmit={submit} className="form-stack">
            {mode === "register" && (
              <label>
                Seu nome
                <input
                  name="name"
                  placeholder="Como podemos te chamar?"
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                E-mail
                <input
                  type="email"
                  name="email"
                  placeholder="voce@empresa.com"
                  required
                  autoComplete="email"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                Senha
                <div className="password-field">
                  <input
                    type={show ? "text" : "password"}
                    name="password"
                    placeholder={
                      mode === "login"
                        ? "Sua senha"
                        : "Pelo menos 10 caracteres"
                    }
                    required
                    minLength={mode === "login" ? 1 : 10}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                  <button type="button" onClick={() => setShow(!show)}>
                    {show ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
            )}
            {mode === "login" && (
              <Link className="auth-forgot" href="/recuperar-senha">
                Esqueci minha senha
              </Link>
            )}
            {message && (
              <div className="form-message" role="status">
                {message}
              </div>
            )}
            <button
              className="primary"
              disabled={busy || (mode === "reset" && !token)}
            >
              {busy
                ? "Aguarde…"
                : mode === "login"
                  ? "Entrar no meu workspace →"
                  : mode === "register"
                    ? "Criar minha conta →"
                    : mode === "forgot"
                      ? "Enviar instruções"
                      : "Salvar nova senha"}
            </button>
          </form>
          <p className="auth-bottom">
            {mode === "login" ? (
              <>
                Ainda não tem conta? <Link href="/cadastro">Comece aqui</Link>
              </>
            ) : (
              <Link href="/login">← Voltar para entrar</Link>
            )}
          </p>
          <div className="auth-security">
            ◈ Seu workspace. Seus dados. Seu próximo passo.
          </div>
        </div>
      </section>
    </main>
  );
}
