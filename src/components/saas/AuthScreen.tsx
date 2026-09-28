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
          {(mode === "login" || mode === "register") && (
            <>
              <div className="auth-divider">ou continue com Google</div>
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
                <svg
                  className="google-icon"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
                  <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
                  <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
                </svg>
                Continuar com Google
              </button>
              {!google && (
                <small className="muted">
                  Login Google aguardando configuração do administrador.
                </small>
              )}
            </>
          )}
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
