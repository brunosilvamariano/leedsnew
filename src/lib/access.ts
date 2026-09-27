import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  return user && !user.suspended ? user : null;
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export function validOrigin(request: Request) {
  return (
    request.headers.get("origin") ===
    new URL(process.env.BETTER_AUTH_URL || request.url).origin
  );
}
