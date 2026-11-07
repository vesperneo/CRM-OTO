// ============================================================
// OTOCLIC CRM — Export CSV / Excel / PDF (impression)
// ============================================================

export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsv).join(';'),
    ...rows.map((row) => row.map(escapeCsv).join(';')),
  ]
  return lines.join('\r\n')
}

function triggerDownload(content: string, filename: string, mime: string) {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** CSV UTF-8 avec BOM : ouverture directe dans Excel sans accents cassés. */
export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const content = '\uFEFF' + buildCsv(headers, rows)
  triggerDownload(content, ensureExtension(filename, 'csv'), 'text/csv;charset=utf-8;')
}

/** Tableau HTML compatible Excel (.xls). */
export function downloadExcel(filename: string, title: string, headers: string[], rows: unknown[][]) {
  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; }
    h1 { font-size: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
    th { background: #fff0f3; text-align: left; }
  </style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <p>Export du ${new Date().toLocaleString('fr-FR')}</p>
  <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('')}</tbody></table></body></html>`

  triggerDownload(html, ensureExtension(filename, 'xls'), 'application/vnd.ms-excel')
}

/** Impression navigateur : l'utilisateur choisit « Enregistrer au format PDF ». */
export function printReport(title: string, headers: string[], rows: unknown[][]) {
  if (typeof window === 'undefined') return

  const escapeHtml = (value: unknown) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  const win = window.open('', '_blank', 'width=1024,height=768')
  if (!win) return

  win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; border-bottom: 2px solid #da3655; padding-bottom: 12px; }
    h1 { font-size: 20px; margin: 0; }
    .meta { font-size: 12px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; text-align: left; }
    th { background: #fff0f3; color: #7b2434; text-transform: uppercase; letter-spacing: .04em; }
    tr:nth-child(even) td { background: #f9fafb; }
    footer { margin-top: 24px; font-size: 11px; color: #9ca3af; }
    @media print { body { padding: 0; } }
  </style></head><body>
  <header><div><h1>${escapeHtml(title)}</h1><div class="meta">Otoclic CRM</div></div>
  <div class="meta">Généré le ${new Date().toLocaleString('fr-FR')}</div></header>
  <table><thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('')}</tbody></table>
  <footer>Document interne Otoclic CRM — données confidentielles.</footer>
  </body></html>`)

  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

function ensureExtension(filename: string, extension: string): string {
  return filename.toLowerCase().endsWith(`.${extension}`)
    ? filename
    : `${filename}.${extension}`
}

export function todaySlug(): string {
  return new Date().toISOString().slice(0, 10)
}