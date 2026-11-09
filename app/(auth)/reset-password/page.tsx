import Link from 'next/link'
import { AlertTriangle, KeyRound, Phone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './ResetPasswordForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Réinitialisation du mot de passe',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10 sm:px-8">
      <div className="w-full max-w-[400px]">
        <div className="mb-9 flex items-center gap-3">
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

        <div className="mb-7 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Nouveau mot de passe
            </h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Choisissez un mot de passe sécurisé pour votre compte.
            </p>
          </div>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-4">
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Ce lien de réinitialisation est invalide ou expiré. Demandez un
                nouveau lien depuis la page de connexion.
              </span>
            </div>
            <Link href="/login" className="btn-primary h-11 w-full">
              Retour à la connexion
            </Link>
          </div>
        )}

        <p className="mt-10 text-center text-[11px] text-gray-400">
          © {new Date().getFullYear()} Otoclic — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
