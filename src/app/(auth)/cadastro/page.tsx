import { AuthScreen } from '@/components/saas/AuthScreen';
export default async function Page({searchParams}:{searchParams:Promise<{token?:string}>}) { const params=await searchParams; return <AuthScreen mode="register" google={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} token={params.token || ''}/>; }
