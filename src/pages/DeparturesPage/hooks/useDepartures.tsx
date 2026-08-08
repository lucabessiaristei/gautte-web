import { useState } from 'react'
import type { DepartingLine } from '../../../types/index'
import type { StopOption } from '../components/StopSearch'
import fetchDepartures from '../../../services/departuresService'
import { searchStops } from '../../../services/searchStops'

export function useDepartures() {
  const [selectedStop, setSelectedStop] = useState<StopOption | null>(null)
  const [departingLines, setDepartingLines] = useState<DepartingLine[]>([])
  const [displayLabel, setDisplayLabel] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const loadOptions = async (query: string): Promise<StopOption[]> => {
    const results = await searchStops(query)
    return results.map((stop) => ({
      value: stop.stopCode,
      label: stop.stopCode + ' – ' + stop.readableName,
    }))
  }

  const handleStopSelect = async (option: StopOption | null) => {
    if (!option) {
      setSelectedStop(null)
      setDepartingLines([])
      setDisplayLabel('')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setSelectedStop(option)
      setDisplayLabel(option.label)

      const result = await fetchDepartures(option.value)
      setDepartingLines(result)
    } catch (err) {
      setError('Si è verificato un errore nel caricamento delle partenze.')
      setDepartingLines([])
    } finally {
      setIsLoading(false)
    }
  }

  const clearSelection = () => setSelectedStop(null)

  return {
    selectedStop,
    departingLines,
    displayLabel,
    isLoading,
    error,
    loadOptions,
    handleStopSelect,
    clearSelection,
  }
}
