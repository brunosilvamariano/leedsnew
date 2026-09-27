import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, validOrigin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (!validOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 600000)
      return NextResponse.json(
        { error: "Foto muito grande. Use até 400 KB." },
        { status: 413 },
      );
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        image: z
          .string()
          .max(560000)
          .nullable()
          .refine(
            (v) =>
              !v ||
              /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v) ||
              /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//i.test(v),
          ),
      })
      .parse(JSON.parse(raw));
    await prisma.user.update({ where: { id: user.id }, data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Confira o nome e use uma imagem PNG, JPEG ou WebP." },
      { status: 400 },
    );
  }
}
