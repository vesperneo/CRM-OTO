import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/profile'
import { getRoleHome } from '@/lib/demo-profile'

export default async function Home() {
  const { profile } = await getCurrentProfile()
  redirect(getRoleHome(profile?.role))
}
