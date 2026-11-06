import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: any = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*, team:teams(*)')
      .eq('id', user.id)
      .single()
    profile = data
  }

  // Fallback demo profile for local development / preview before Supabase is connected
  if (!profile) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      profile = {
        id: '00000000-0000-0000-0000-000000000001',
        nom: 'Alami',
        prenom: 'Karim',
        email: 'karim@otoclic.ma',
        role: 'agent_crc',
        team: { nom: 'CRC Casablanca' },
        avatar_url: null,
      }
    } else {
      redirect('/login')
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar profile={profile} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header profile={profile} />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 md:p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
