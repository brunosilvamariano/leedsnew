import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

async function sendMail(to: string, subject: string, url: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    throw new Error(
      "Configure RESEND_API_KEY e EMAIL_FROM para enviar e-mails.",
    );
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: `${subject}\n\nAcesse este link: ${url}\n\nSe você não solicitou esta ação, ignore esta mensagem.`,
    }),
  });
  if (!response.ok) throw new Error("Falha no envio do e-mail.");
}

export const auth = betterAuth({
  appName: "BizPeek",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    revokeSessionsOnPasswordReset: true,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    sendResetPassword: async ({ user, url }) =>
      sendMail(user.email, "Redefina sua senha do BizPeek", url),
  },
  emailVerification: {
    sendOnSignUp: process.env.REQUIRE_EMAIL_VERIFICATION === "true",
    sendVerificationEmail: async ({ user, url }) =>
      sendMail(user.email, "Confirme seu e-mail no BizPeek", url),
  },
  socialProviders:
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "USER", input: false },
      suspended: { type: "boolean", defaultValue: false, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
});
