import { useState } from 'react'
import type { DepartingLine } from '../../types/index'
import fetchDepartures from '../../services/departuresService'
import { searchStops } from '../../services/searchStops'
import { getTransportIcon } from '../../utils/transportIcon'
import StopSearch from './components/StopSearch'
import type { StopOption } from './components/StopSearch'

function DeparturesPage() {
  const [selectedStop, setSelectedStop] = useState<StopOption | null>(null)
  const [departingLines, setDepartingLines] = useState<DepartingLine[]>([])
  const [displayLabel, setDisplayLabel] = useState<string>('')

  const loadOptions = async (query: string): Promise<StopOption[]> => {
    const results = await searchStops(query)
    return results.map((stop) => ({
      value: stop.stopCode,
      label: stop.stopCode + ' – ' + stop.readableName,
    }))
  }

  const handleStopSelect = async (option: StopOption | null) => {
    if (!option) return
    setSelectedStop(option)
    setDisplayLabel(option.label)
    const result = await fetchDepartures(option.value)
    setDepartingLines(result)
  }

  return (
    <div className="max-w-2xl mx-auto bg-surface px-4 py-8">
      <h1 className="text-header-md font-bold text-foreground mb-6">Prossime partenze</h1>
      <StopSearch
        value={selectedStop}
        onSelect={handleStopSelect}
        onMenuOpen={() => setSelectedStop(null)}
        loadOptions={loadOptions}
      />
      {departingLines.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {displayLabel && (
            <h2 className="text-header-sm font-semibold text-foreground">{displayLabel}</h2>
          )}
          {departingLines.map((line) => (
            <div
              key={`${line.name}-${line.headsign}`}
              className="bg-background border border-border rounded-lg p-4 transition-[border-color,box-shadow] duration-200 hover:border-accent hover:shadow-light"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 bg-primary text-background text-caption font-semibold px-2 py-1 rounded-md">
                  {getTransportIcon(line.routeType)}
                  {line.name}
                </span>
                <span className="text-caption font-medium text-muted">{line.headsign}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {line.departures.map((departure) => (
                  <span
                    key={departure.scheduledTime}
                    className={`text-caption font-medium px-2 py-1 rounded-md border ${
                      departure.realtimeTime
                        ? 'border-success text-success bg-transparent'
                        : 'border-border text-muted bg-surface'
                    }`}
                  >
                    {departure.realtimeTime
                      ? `${departure.realtimeTime}${departure.delayMin !== null ? ` (${departure.delayMin! > 0 ? '+' : ''}${departure.delayMin}min)` : ''}`
                      : departure.scheduledTime}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-caption text-muted">Nessuna partenza trovata</p>
      )}
    </div>
  )
}

export default DeparturesPage
