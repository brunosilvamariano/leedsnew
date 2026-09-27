import { Admin } from '@/components/saas/Admin';
import {requireUser} from '@/lib/access';
import {notFound} from 'next/navigation';
export default async function Page(){const u=await requireUser();if(u.role!=='ADMIN')notFound();return <Admin/>;}
