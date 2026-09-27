import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/access";
import { canWrite } from "@/lib/billing";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell readOnly={!await canWrite(user)} user={{ id: user.id, name: user.name, email: user.email, image: user.image, role: user.role }}>{children}</AppShell>;
}
