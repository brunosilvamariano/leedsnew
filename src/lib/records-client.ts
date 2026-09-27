"use client";
import { useEffect, useState } from "react";
import type { RecordItem } from "./crm-types";
let records: RecordItem[] = [];
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;
export const allRecords = () => records;
function emit() {
  listeners.forEach((fn) => fn());
}
export function subscribeRecords(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function report(message: string) {
  window.dispatchEvent(new CustomEvent("bizpeek:message", { detail: message }));
}
export async function refreshRecords() {
  if (loading) return loading;
  loading = (async () => {
    const response = await fetch("/api/records", { cache: "no-store" });
    if (!response.ok)
      throw new Error("Não foi possível carregar seus dados. Tente novamente.");
    records = await response.json();
    emit();
  })().finally(() => {
    loading = null;
  });
  return loading;
}
export async function saveRecord(kind: string, data: unknown, id?: string) {
  try {
    const response = await fetch("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, data, id }),
    });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Não foi possível salvar.");
    records = id
      ? records.map((r) => (r.id === id ? result : r))
      : [...records, result];
    emit();
    if (kind === "event") void refreshRecords().catch(() => {});
    return result as RecordItem;
  } catch (error) {
    report(error instanceof Error ? error.message : "Falha de conexão.");
    throw error;
  }
}
export async function removeRecord(id: string) {
  const response = await fetch(`/api/records?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    report("Não foi possível excluir o registro.");
    throw new Error("Falha ao excluir.");
  }
  records = records.filter((r) => r.id !== id);
  emit();
}
export function useRecords<T>(kind: string): RecordItem<T>[] {
  const [items, setItems] = useState<RecordItem<T>[]>([]);
  useEffect(() => {
    const load = () =>
      setItems(
        records.filter((r) => r.kind === kind) as unknown as RecordItem<T>[],
      );
    load();
    return subscribeRecords(load);
  }, [kind]);
  return items;
}
