"use client";
import { useState } from "react";
import { useUser, Avatar } from "@/components/layout/AppShell";
import { authClient } from "@/lib/auth-client";
import { Heading } from "./Shared";
export function Settings() {
  const user = useUser();
  const [name, setName] = useState(user.name),
    [image, setImage] = useState(user.image),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage("Perfil atualizado.");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function photo(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 400000
    ) {
      setMessage("Escolha uma imagem PNG, JPEG ou WebP de até 400 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }
  return (
    <>
      <Heading
        title="Do seu jeito."
        text="Cuide do seu perfil e mantenha sua conta segura."
      />
      <div className="profile-grid">
        <section className="panel">
          <div className="profile-intro">
            <Avatar user={{ name, image }} size={74} />
            <div>
              <h2>Seu perfil</h2>
              <p>Uma conexão começa com você.</p>
            </div>
          </div>
          <form className="form-stack" onSubmit={save}>
            <label>
              Foto do perfil
              <input
                aria-label="Enviar foto do perfil"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => void photo(e.target.files?.[0])}
              />
              <small className="muted">PNG, JPEG ou WebP, até 400 KB.</small>
            </label>
            {image && (
              <button
                className="secondary"
                type="button"
                onClick={() => setImage(null)}
              >
                Remover foto
              </button>
            )}
            <label>
              Seu nome
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={80}
                required
              />
            </label>
            <label>
              E-mail
              <input value={user.email} disabled />
            </label>
            <button className="primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar perfil"}
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Segurança da conta</h2>
              <p>Use uma senha exclusiva de pelo menos 10 caracteres.</p>
            </div>
          </div>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const form = e.currentTarget,
                f = new FormData(form);
              try {
                const r = await authClient.changePassword({
                  currentPassword: String(f.get("current")),
                  newPassword: String(f.get("next")),
                  revokeOtherSessions: true,
                });
                setMessage(
                  r.error
                    ? "Não foi possível alterar. Confira a senha atual. Se usa Google, utilize recuperar senha."
                    : "Senha atualizada. Outras sessões foram encerradas.",
                );
                if (!r.error) form.reset();
              } catch {
                setMessage("Falha ao alterar a senha.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Senha atual
              <input
                name="current"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              Nova senha
              <input
                name="next"
                type="password"
                minLength={10}
                maxLength={128}
                required
                autoComplete="new-password"
              />
            </label>
            <button className="secondary" disabled={busy}>
              Atualizar senha
            </button>
          </form>
          <div className="form-message" style={{ marginTop: 24 }}>
            Seu histórico, leads e anotações pertencem ao seu workspace e são
            protegidos pelo acesso da sua conta.
          </div>
        </section>
      </div>
      {message && (
        <div className="form-message" role="status" style={{ marginTop: 20 }}>
          {message}
        </div>
      )}
    </>
  );
}
