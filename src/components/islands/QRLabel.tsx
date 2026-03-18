import { qrImageUrl } from '../../lib/api'

interface Props {
  qrCode: string
  locationName: string
}

export default function QRLabel({ qrCode, locationName }: Props) {
  const imageUrl = qrImageUrl(qrCode)

  function handlePrint() {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <html><head><title>QR — ${locationName}</title>
      <style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#fff}
      img{max-width:400px;border:1px solid #e2e8f0;border-radius:8px}</style></head>
      <body><img src="${imageUrl}" onload="window.print();window.close()" /></body></html>
    `)
    w.document.close()
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-slate-700">Etiqueta QR</span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          🖨️ Imprimir
        </button>
      </div>
      <img
        src={imageUrl}
        alt={`QR de ${locationName}`}
        className="w-full rounded-xl border border-slate-100"
      />
      <p className="text-xs text-slate-400 text-center mt-2 font-mono truncate">{qrCode}</p>
    </div>
  )
}
