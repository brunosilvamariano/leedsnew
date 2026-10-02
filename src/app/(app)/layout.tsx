import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/access";
import { canWrite } from "@/lib/billing";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const now = new Date();
  const trial =
    user.trialStartsAt && user.trialEndsAt
      ? {
          startsAt: user.trialStartsAt.toISOString(),
          endsAt: user.trialEndsAt.toISOString(),
          status:
            user.trialStartsAt > now
              ? ("scheduled" as const)
              : user.trialEndsAt > now
                ? ("active" as const)
                : ("expired" as const),
        }
      : undefined;
  return (
    <AppShell
      readOnly={!(await canWrite(user))}
      trial={trial}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
