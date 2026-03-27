interface Location {
  id: string
  name: string
}

interface StockComponent {
  stockId: string
  name: string
  quantity: number
}

interface Props {
  location: Location
  parent: Location | null
  subLocations?: Location[]
  components?: StockComponent[]
}

export default function LocationBreadcrumb({ location, parent, subLocations = [], components = [] }: Props) {
  return (
    <div>
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <a href="/locations" className="hover:text-slate-700">Ubicaciones</a>
        <span className="text-slate-300">›</span>
        {parent && (
          <>
            <a href={`/locations/${parent.id}`} className="hover:text-slate-700">{parent.name}</a>
            <span className="text-slate-300">›</span>
          </>
        )}
        <span className="font-semibold text-slate-900">{location.name}</span>
      </nav>

      {subLocations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Sub-ubicaciones</h3>
          <ul>
            {subLocations.map(sub => (
              <li key={sub.id}>
                <a href={`/locations/${sub.id}`} className="text-sm text-slate-700">
                  {sub.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {components.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Componentes</h3>
          <ul>
            {components.map(comp => (
              <li key={comp.stockId} className="flex items-center gap-2 text-sm text-slate-700">
                <span>{comp.name}</span>
                <span>{comp.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
