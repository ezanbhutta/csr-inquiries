// CEO-style summary PDF (mirrors CSR Pulse's jsPDF export, focused on inquiries).
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const INK = [11, 16, 32]
const ACCENT = [99, 102, 241]
const MUTED = [120, 130, 160]

export function exportSummaryPdf({ rangeLabel, kpis, profiles, shifts, csr, syncedAt }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const money = (n) => '$' + Math.round(n || 0).toLocaleString('en-US')

  // Header band
  doc.setFillColor(...INK)
  doc.rect(0, 0, W, 88, 'F')
  doc.setTextColor(...ACCENT)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('CSR INQUIRIES', 40, 34)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text('Daily Inquiry & Conversion Summary', 40, 58)
  doc.setTextColor(...MUTED)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(rangeLabel, 40, 76)

  // KPI strip
  const kpiRow = [
    ['Inquiries', kpis.inquiries.toLocaleString('en-US')],
    ['Converted', kpis.converted.toLocaleString('en-US')],
    ['Conversion', `${kpis.conversionRate}%`],
    ['Won value', money(kpis.convertedValue)],
  ]
  const colW = (W - 80) / kpiRow.length
  kpiRow.forEach(([label, value], i) => {
    const x = 40 + i * colW
    doc.setTextColor(...MUTED)
    doc.setFontSize(9)
    doc.text(label.toUpperCase(), x, 118)
    doc.setTextColor(20, 24, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(String(value), x, 140)
    doc.setFont('helvetica', 'normal')
  })

  const tableStyle = {
    headStyles: { fillColor: ACCENT, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 44, 60] },
    alternateRowStyles: { fillColor: [244, 245, 250] },
    margin: { left: 40, right: 40 },
  }

  autoTable(doc, {
    ...tableStyle,
    startY: 164,
    head: [['Profile', 'Inquiries', 'Converted', 'Conv %', 'Won value']],
    body: profiles.map((p) => [
      p.profile,
      p.inquiries,
      p.converted,
      `${p.conversionRate}%`,
      money(p.value),
    ]),
  })

  autoTable(doc, {
    ...tableStyle,
    startY: doc.lastAutoTable.finalY + 20,
    head: [['Shift', 'Inquiries', 'Converted', 'Conv %']],
    body: shifts.map((s) => [s.shift, s.inquiries, s.converted, `${s.conversionRate}%`]),
  })

  if (csr.leaderboard.length) {
    autoTable(doc, {
      ...tableStyle,
      startY: doc.lastAutoTable.finalY + 20,
      head: [[`CSR (logged on ${csr.total ? Math.round((csr.logged / csr.total) * 100) : 0}% of inquiries)`, 'Inquiries', 'Converted', 'Conv %']],
      body: csr.leaderboard.map((r) => [r.csr, r.inquiries, r.converted, `${r.conversionRate}%`]),
    })
  }

  const foot = `Source: Client Daily Inquiries sheet · Synced ${new Date(
    syncedAt,
  ).toLocaleString()} · Converted = Placed + Direct Order`
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text(foot, 40, doc.internal.pageSize.getHeight() - 24)

  doc.save(`csr-inquiries-${new Date().toISOString().slice(0, 10)}.pdf`)
}
