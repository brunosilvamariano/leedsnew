"use client";
import { useEffect, useRef } from "react";
export const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
export function Heading({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">
          SEU NEGÓCIO, MAIS PERTO DO PRÓXIMO PASSO
        </span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </header>
  );
}
export function Empty({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">✧</span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current
      ?.querySelector<HTMLElement>("input,button,select,textarea")
      ?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-title">
          <h2>{title}</h2>
          <button onClick={close} aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
