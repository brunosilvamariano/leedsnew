import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export function Button({ variant = "primary", full = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; full?: boolean }) {
  return <button className={`${styles.button} ${styles[variant]} ${full ? styles.full : ""} ${className}`} {...props} />;
}
