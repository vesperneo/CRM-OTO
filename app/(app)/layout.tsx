import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/auth/profile'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, isDemo, demoRole } = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]
                   focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm
                   focus:font-semibold focus:text-gray-900 focus:shadow-lg focus:ring-2 focus:ring-brand-500"
      >
        Aller au contenu
      </a>

      <Sidebar profile={profile} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          profile={profile}
          demoMode={isDemo}
          demoRole={demoRole ?? undefined}
        />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto scrollbar-thin"
        >
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
