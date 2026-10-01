import { createHmac, randomUUID } from "node:crypto";

export type BizPeekAutomationEvent = "lead.created" | "lead.updated";

export async function deliverN8nEvent(
  event: BizPeekAutomationEvent,
  actor: { id: string; email: string; name: string },
  record: unknown,
) {
  const url = process.env.N8N_WEBHOOK_URL?.trim();
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!url || !secret) return { delivered: false, reason: "not_configured" } as const;

  const payload = {
    event,
    occurredAt: new Date().toISOString(),
    deliveryId: randomUUID(),
    actor,
    record,
  };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "BizPeek-Automations/1.0",
        "X-BizPeek-Event": event,
        "X-BizPeek-Delivery": payload.deliveryId,
        "X-BizPeek-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn("n8n webhook rejected BizPeek event", {
        event,
        status: response.status,
        deliveryId: payload.deliveryId,
      });
      return { delivered: false, reason: `http_${response.status}` } as const;
    }
    return { delivered: true, deliveryId: payload.deliveryId } as const;
  } catch (error) {
    console.warn("n8n webhook unavailable", {
      event,
      deliveryId: payload.deliveryId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return { delivered: false, reason: "unavailable" } as const;
  }
}
