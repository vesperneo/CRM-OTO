import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, Phone, ShieldCheck } from 'lucide-react'
import LoginForm from './LoginForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
}

const HIGHLIGHTS = [
  'File d’appels CRC priorisée par SLA',
  'Relances automatiques WhatsApp & email',
  'Rendez-vous showroom confirmés en J-1',
]

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams

  if (user) {
    redirect(params.redirect ?? '/dashboard')
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#1b0f13] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-600/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 right-0 h-[26rem] w-[26rem] rounded-full bg-brand-500/20 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 shadow-lg shadow-brand-900/30">
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Otoclic CRM</p>
            <p className="text-[11px] leading-tight text-white/40">
              CRC &amp; Showrooms
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-300">
            Pilotage commercial
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.15] tracking-tight">
            Chaque lead mérite une réponse rapide.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Qualifiez, relancez et transformez vos leads en rendez-vous
            showroom depuis un espace unique, pensé pour le terrain.
          </p>

          <ul className="mt-9 space-y-3.5">
            {HIGHLIGHTS.map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-white/35">
          <ShieldCheck className="h-4 w-4" />
          Données hébergées au Maroc · Conforme CNDP
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
              <Phone className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-gray-900">
                Otoclic CRM
              </p>
              <p className="text-[11px] leading-tight text-gray-400">
                Gestion des leads &amp; rendez-vous
              </p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Connexion à votre espace
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Utilisez vos identifiants professionnels pour continuer.
            </p>
          </div>

          {params.error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
            >
              {params.error === 'invalid_credentials'
                ? 'Email ou mot de passe incorrect.'
                : 'Une erreur est survenue. Veuillez réessayer.'}
            </div>
          )}

          <LoginForm redirectTo={params.redirect} />

          <p className="mt-10 text-center text-[11px] text-gray-400">
            © {new Date().getFullYear()} Otoclic — Tous droits réservés
          </p>
        </div>
      </main>
    </div>
  )
}
