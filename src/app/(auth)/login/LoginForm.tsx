"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./login.module.css";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    window.localStorage.setItem("prospect.session", "active");
    // A full navigation is intentional here: it avoids the stalled client transition seen during local Turbopack development.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/dashboard");
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.field}>
        <span className={styles.label}>E-mail</span>
        <input className={styles.input} type="email" placeholder="nome@empresa.com" defaultValue="bruno@prospect.local" required />
      </label>

      <label className={styles.field}>
        <span className={styles.labelRow}>
          <span className={styles.label}>Senha</span>
          <a className={styles.link} href="#">Esqueci minha senha</a>
        </span>
        <span className={styles.inputWrap}>
          <input className={styles.input} type={showPassword ? "text" : "password"} placeholder="••••••••••" defaultValue="prospect" required />
          <button className={styles.passwordButton} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
            {showPassword ? "Ocultar" : "Mostrar"}
          </button>
        </span>
      </label>

      <Button type="submit" full disabled={loading}>{loading ? "Entrando…" : "Entrar →"}</Button>
    </form>
  );
}
