import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.brand}>P.</div>
      <section className={styles.card} aria-labelledby="login-title">
        <h1 id="login-title" className={styles.heading}>Bem-vindo de volta</h1>
        <p className={styles.subheading}>Continue de onde sua prospecção parou.</p>
        <LoginForm />
        <p className={styles.footer}><strong>Prospect</strong><br />Prospecção mais inteligente.</p>
      </section>
    </main>
  );
}
