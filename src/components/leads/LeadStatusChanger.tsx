'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { LEAD_STATUSES } from '@/lib/constants'
import { updateLeadStatus } from '@/features/leads/actions'

interface Props {
  leadId: string
  currentStatus: string
}

export default function LeadStatusChanger({ leadId, currentStatus }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const activeObj = LEAD_STATUSES.find(s => s.value === status) ?? LEAD_STATUSES[0]

  async function handleSelect(newStatus: string) {
    setStatus(newStatus)
    setIsOpen(false)
    setLoading(true)
    await updateLeadStatus(leadId, newStatus)
    setLoading(false)
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${activeObj.bgColor} ${activeObj.textColor} hover:opacity-90 transition-opacity`}
      >
        <span>{activeObj.icon}</span>
        <span>{activeObj.label}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-gray-100 py-1.5 z-50">
          <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Changer le statut pipeline
          </div>
          <div className="max-h-60 overflow-y-auto">
            {LEAD_STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => handleSelect(s.value)}
                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <span>{s.icon}</span>
                <span className={s.value === status ? 'font-bold text-brand-600' : 'text-gray-700'}>
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

