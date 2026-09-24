"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Company } from "@/data/companies";
import styles from "./LiveRadar.module.css";

type CanvasPoint = { company: Company; x: number; y: number };

export function LiveRadar({ companies }: { companies: Company[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState<CanvasPoint | null>(null);
  const positioned = useMemo(() => companies.filter((company) => typeof company.latitude === "number" && typeof company.longitude === "number"), [companies]);

  const strongest = useMemo(() => [...positioned].sort((a, b) => b.score - a.score)[0], [positioned]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let frame = 0;
    let points: CanvasPoint[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(280, rect.width);
      height = Math.max(240, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const project = () => {
      if (!positioned.length) return [];
      const lats = positioned.map((item) => item.latitude as number);
      const lngs = positioned.map((item) => item.longitude as number);
      let minLat = Math.min(...lats); let maxLat = Math.max(...lats);
      let minLng = Math.min(...lngs); let maxLng = Math.max(...lngs);
      if (minLat === maxLat) { minLat -= .01; maxLat += .01; }
      if (minLng === maxLng) { minLng -= .01; maxLng += .01; }
      const pad = Math.max(34, Math.min(width, height) * .11);
      return positioned.map((company) => ({
        company,
        x: pad + (((company.longitude as number) - minLng) / (maxLng - minLng)) * Math.max(1, width - pad * 2),
        y: pad + ((maxLat - (company.latitude as number)) / (maxLat - minLat)) * Math.max(1, height - pad * 2),
      }));
    };

    const draw = (time: number) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const root = getComputedStyle(document.documentElement);
      const brand = root.getPropertyValue("--brand-500").trim() || "#1677ff";
      const success = root.getPropertyValue("--brand-300").trim() || "#86c3ff";
      const warning = root.getPropertyValue("--brand-200").trim() || "#b9dcff";
      const grid = root.getPropertyValue("--border").trim() || "#e6e8ec";
      const text = root.getPropertyValue("--text-muted").trim() || "#98a0ad";

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.min(width, height) * .39;

      ctx.save();
      ctx.strokeStyle = grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      for (let ring = 1; ring <= 4; ring += 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, (maxRadius / 4) * ring, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy - maxRadius); ctx.lineTo(cx, cy + maxRadius);
      ctx.moveTo(cx - maxRadius, cy); ctx.lineTo(cx + maxRadius, cy);
      ctx.stroke();
      ctx.restore();

      const sweep = (time / 2400) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      const sweepGradient = ctx.createLinearGradient(0, 0, maxRadius, 0);
      sweepGradient.addColorStop(0, "rgba(22,119,255,0)");
      sweepGradient.addColorStop(.48, "rgba(22,119,255,.04)");
      sweepGradient.addColorStop(1, "rgba(22,119,255,.18)");
      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, maxRadius, -.22, .22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      points = project();
      points.forEach((point, index) => {
        const pulse = 1 + Math.sin(time / 540 + index * .7) * .16;
        const base = 3.7 + (point.company.score / 100) * 3.4;
        const radius = base * pulse;
        const pointColor = point.company.score >= 86 ? brand : point.company.score >= 70 ? success : warning;

        ctx.save();
        const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 3.5);
        glow.addColorStop(0, point.company.score >= 86 ? "rgba(22,119,255,.35)" : point.company.score >= 70 ? "rgba(75,165,255,.28)" : "rgba(134,195,255,.25)");
        glow.addColorStop(1, "rgba(22,119,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(point.x, point.y, radius * 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = pointColor;
        ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.96)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      ctx.fillStyle = text;
      ctx.font = "600 9px system-ui";
      ctx.fillText(`${positioned.length} empresas geolocalizadas`, 16, 20);
      frame = requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    frame = requestAnimationFrame(draw);

    const handleMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let nearest: CanvasPoint | null = null;
      let distance = 20;
      for (const point of points) {
        const candidateDistance = Math.hypot(point.x - x, point.y - y);
        if (candidateDistance < distance) { nearest = point; distance = candidateDistance; }
      }
      setHovered(nearest);
    };

    const handleLeave = () => setHovered(null);
    canvas.addEventListener("pointermove", handleMove);
    canvas.addEventListener("pointerleave", handleLeave);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", handleMove);
      canvas.removeEventListener("pointerleave", handleLeave);
    };
  }, [positioned]);

  return <div className={styles.host} ref={hostRef}>
    <canvas ref={canvasRef} className={styles.canvas} />
    {positioned.length > 0 && <div className={styles.radarSummary}>
      <span>Maior score</span><strong>{strongest?.score ?? 0}</strong><small>{strongest?.name ?? "—"}</small>
    </div>}
    {!positioned.length && <div className={styles.empty}><span>RADAR</span><strong>Sem coordenadas ainda</strong><p>Faça uma busca real para projetar as empresas encontradas.</p></div>}
    {hovered && <div className={styles.tooltip} style={{ left: hovered.x, top: hovered.y }}><strong>{hovered.company.name}</strong><span>{hovered.company.city} · {hovered.company.state}{hovered.company.country ? ` · ${hovered.company.country}` : ""}</span><small>Score {hovered.company.score}</small></div>}
  </div>;
}
