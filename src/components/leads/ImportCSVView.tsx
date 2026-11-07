'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { importLeadsBatch } from '@/features/leads/actions'

interface Props {
  sources?: { id: string; nom: string }[]
}

export default function ImportCSVView({ sources = [] }: Props) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({
    nom: -1,
    prenom: -1,
    telephone: -1,
    email: -1,
    ville: -1,
    budget: -1,
    interet_produit: -1,
  })
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setReport(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      if (!text) return

      // Détecter séparateur (virgule ou point-virgule)
      const firstLine = text.split('\n')[0]
      const sep = firstLine.includes(';') ? ';' : ','

      const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)

      if (lines.length > 0) {
        const fileHeaders = lines[0].split(sep).map(h => h.replace(/^["']|["']$/g, '').trim())
        const dataRows = lines.slice(1).map(line => line.split(sep).map(c => c.replace(/^["']|["']$/g, '').trim()))

        setHeaders(fileHeaders)
        setRawRows(dataRows)

        // Détection automatique intelligente des colonnes
        const autoMap: Record<string, number> = { ...mapping }
        fileHeaders.forEach((h, idx) => {
          const lower = h.toLowerCase()
          if (lower.includes('nom') && !lower.includes('prénom') && !lower.includes('prenom')) autoMap.nom = idx
          if (lower.includes('prenom') || lower.includes('prénom')) autoMap.prenom = idx
          if (lower.includes('tel') || lower.includes('phone') || lower.includes('gsm')) autoMap.telephone = idx
          if (lower.includes('mail')) autoMap.email = idx
          if (lower.includes('ville') || lower.includes('city')) autoMap.ville = idx
          if (lower.includes('budget') || lower.includes('prix')) autoMap.budget = idx
          if (lower.includes('modele') || lower.includes('modèle') || lower.includes('produit') || lower.includes('vehicule')) autoMap.interet_produit = idx
        })
        setMapping(autoMap)
      }
    }
    reader.readAsText(f)
  }

  async function handleImport() {
    if (mapping.nom === -1 || mapping.telephone === -1) {
      alert('Veuillez au minimum faire correspondre les colonnes "Nom" et "Téléphone".')
      return
    }

    setLoading(true)

    const payload = rawRows.map(row => ({
      nom: row[mapping.nom] ?? '',
      prenom: mapping.prenom !== -1 ? row[mapping.prenom] : undefined,
      telephone: row[mapping.telephone] ?? '',
      email: mapping.email !== -1 ? row[mapping.email] : undefined,
      ville: mapping.ville !== -1 ? row[mapping.ville] : undefined,
      budget: mapping.budget !== -1 && !isNaN(Number(row[mapping.budget])) ? Number(row[mapping.budget]) : undefined,
      interet_produit: mapping.interet_produit !== -1 ? row[mapping.interet_produit] : undefined,
      source_id: sourceId || undefined,
      consentement_contact: true,
    }))

    const res = await importLeadsBatch(payload)
    setLoading(false)

    if (res.success) {
      setReport(res.result)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux leads
        </Link>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Importation de leads (CSV)</h2>
          <p className="text-xs text-gray-500 mt-1">
            Normalisation automatique des numéros +212 et détection intelligente des doublons pour éviter les collisions en call center.
          </p>
        </div>

        {/* Zone de drop/upload */}
        {!file && (
          <div className="border-2 border-dashed border-gray-200 hover:border-brand-400 rounded-2xl p-8 text-center transition-colors">
            <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Glissez votre fichier CSV ici ou parcourez</p>
            <p className="text-xs text-gray-400 mt-1">Format standard séparateur virgule (,) ou point-virgule (;)</p>
            <label className="mt-4 inline-block px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg cursor-pointer shadow-sm">
              Sélectionner un fichier CSV
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        )}

        {/* Fichier chargé & Mapping */}
        {file && !report && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-brand-50/70 border border-brand-100 rounded-xl">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                <div>
                  <p className="text-xs font-bold text-brand-950">{file.name}</p>
                  <p className="text-[11px] text-brand-700">{rawRows.length} prospects détectés</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setRawRows([]); }}
                className="text-xs text-brand-700 hover:underline"
              >
                Changer de fichier
              </button>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
              <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Source de ces leads
              </label>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="w-full sm:w-80 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
              >
                <option value="">Non renseignée</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1.5">
                Tous les leads de ce fichier seront rattachés à cette source (Facebook Ads, TikTok Ads, Google Ads, formulaire site web, spontané…).
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Correspondance des colonnes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { field: 'nom', label: 'Nom *', req: true },
                  { field: 'prenom', label: 'Prénom', req: false },
                  { field: 'telephone', label: 'Téléphone * (+212)', req: true },
                  { field: 'email', label: 'Email', req: false },
                  { field: 'ville', label: 'Ville', req: false },
                  { field: 'budget', label: 'Budget envisagé (MAD)', req: false },
                  { field: 'interet_produit', label: 'Modèle / Intérêt', req: false },
                ].map(({ field, label }) => (
                  <div key={field} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                    <span className="font-medium text-gray-700">{label}</span>
                    <select
                      value={mapping[field] ?? -1}
                      onChange={e => setMapping({ ...mapping, [field]: Number(e.target.value) })}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value={-1}>-- Ignorer --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Aperçu des 3 premières lignes */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">
                Aperçu des premières lignes
              </h4>
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="p-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rawRows.slice(0, 3).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((col, cIdx) => (
                          <td key={cIdx} className="p-2 text-gray-700">{col}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
              >
                {loading ? 'Importation en cours…' : `Lancer l'import (${rawRows.length} leads)`}
              </button>
            </div>
          </div>
        )}

        {/* Rapport d'importation terminé */}
        {report && (
          <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-900">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div>
                <h3 className="font-bold text-base">Importation terminée avec succès !</h3>
                <p className="text-xs text-emerald-700">Tous les nouveaux prospects sont immédiatement disponibles dans la file CRC.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <p className="text-xl font-bold text-emerald-700">{report.imported}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Leads insérés</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <p className="text-xl font-bold text-amber-600">{report.duplicates}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Doublons ignorés</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 text-center">
                <p className="text-xl font-bold text-gray-700">{report.errors}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Lignes invalides</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                onClick={() => { setFile(null); setReport(null); }}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium"
              >
                Importer un autre fichier
              </button>
              <Link
                href="/leads"
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm"
              >
                Consulter les leads
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

