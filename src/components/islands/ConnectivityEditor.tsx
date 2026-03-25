interface Props {
  value: Record<string, boolean>
  onChange: (caps: Record<string, boolean>) => void
}

const PROTOCOLS = [
  { key: 'wifi',     label: 'WiFi',     active: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'ble',      label: 'BLE',      active: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'lora',     label: 'LoRa',     active: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'zigbee',   label: 'Zigbee',   active: 'bg-teal-50 text-teal-700 border-teal-200' },
  { key: 'thread',   label: 'Thread',   active: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'ethernet', label: 'Ethernet', active: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
]

export default function ConnectivityEditor({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2">Conectividad</p>
      <div className="flex flex-wrap gap-2">
        {PROTOCOLS.map((p) => {
          const isActive = !!value[p.key]
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange({ ...value, [p.key]: !value[p.key] })}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                isActive
                  ? p.active
                  : 'bg-slate-100 text-slate-400 border border-transparent'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
