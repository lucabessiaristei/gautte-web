import { useMemo } from 'react'
import AsyncSelect from 'react-select/async'
import { debouncePromise } from '../../../utils/debounce'

const SEARCH_DEBOUNCE_MS = 300

export type StopOption = {
  value: string
  label: string
}

interface StopSearchProps {
  value: StopOption | null
  onSelect: (option: StopOption | null) => void
  onMenuOpen?: () => void
  loadOptions: (query: string) => Promise<StopOption[]>
  defaultOptions?: StopOption[]
}

function StopSearch({ value, onSelect, onMenuOpen, loadOptions, defaultOptions }: StopSearchProps) {
  const debouncedLoadOptions = useMemo(
    () => debouncePromise(loadOptions, SEARCH_DEBOUNCE_MS),
    [loadOptions]
  )

  return (
    <AsyncSelect
      value={value}
      loadOptions={debouncedLoadOptions}
      defaultOptions={defaultOptions}
      onChange={onSelect}
      onMenuOpen={onMenuOpen}
      placeholder="Cerca fermata per nome o numero..."
      menuPortalTarget={document.body}
      noOptionsMessage={() => 'Nessuna fermata trovata'}
      loadingMessage={() => 'Ricerca...'}
      unstyled
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        LoadingIndicator: () => null,
      }}
      styles={{
        control: (_, { isFocused }) => ({
          display: 'flex',
          alignItems: 'center',
          padding: `var(--spacing-xs) var(--spacing-sm)`,
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${isFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
          backgroundColor: 'var(--color-background)',
          cursor: 'text',
          transition: 'border-color 150ms ease',
          minHeight: '40px',
        }),
        valueContainer: () => ({
          position: 'relative' as const,
          display: 'flex',
          alignItems: 'center',
          flex: 1,
          flexWrap: 'wrap' as const,
          padding: 0,
          overflow: 'hidden',
        }),
        input: (base) => ({
          ...base,
          margin: 0,
          padding: 0,
          color: 'var(--color-foreground)',
          fontSize: 'var(--text-caption)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }),
        placeholder: () => ({
          position: 'absolute' as const,
          pointerEvents: 'none' as const,
          color: 'var(--color-muted)',
          fontSize: 'var(--text-caption)',
        }),
        singleValue: () => ({
          color: 'var(--color-foreground)',
          fontSize: 'var(--text-caption)',
          fontWeight: 500,
        }),
        indicatorsContainer: () => ({
          display: 'flex',
          alignItems: 'center',
        }),
        menu: (base) => ({
          ...base,
          marginTop: 'var(--spacing-xs)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid var(--color-border)`,
          boxShadow: 'var(--shadow-medium)',
          backgroundColor: 'var(--color-background)',
          overflow: 'hidden',
        }),
        menuPortal: (base) => ({
          ...base,
          zIndex: 9999,
        }),
        option: (_, { isFocused, isSelected }) => ({
          padding: `var(--spacing-xs) var(--spacing-md)`,
          fontSize: 'var(--text-caption)',
          cursor: 'pointer',
          backgroundColor: isSelected
            ? 'var(--color-accent)'
            : isFocused
            ? 'var(--color-surface)'
            : 'transparent',
          color: isSelected ? 'var(--color-background)' : 'var(--color-foreground)',
          transition: 'background-color 100ms ease',
        }),
        loadingMessage: () => ({
          padding: `var(--spacing-xs) var(--spacing-md)`,
          fontSize: 'var(--text-caption)',
          color: 'var(--color-muted)',
          textAlign: 'center' as const,
        }),
        noOptionsMessage: () => ({
          padding: `var(--spacing-xs) var(--spacing-md)`,
          fontSize: 'var(--text-caption)',
          color: 'var(--color-muted)',
          textAlign: 'center' as const,
        }),
      }}
    />
  )
}

export default StopSearch
