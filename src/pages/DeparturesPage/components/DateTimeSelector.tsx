import { minutesBetween, RESET_TOLERANCE_MINUTES } from '../../../utils/timeHelpers'

interface DateTimeSelectorProps {
  value: Date
  onChange: (value: Date) => void
  onSubmit: () => void
  onReset: () => void
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function DateTimeSelector({ value, onChange, onSubmit, onReset }: DateTimeSelectorProps) {
  const isModified = minutesBetween(value, new Date()) > RESET_TOLERANCE_MINUTES

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <input
        type="datetime-local"
        value={toLocalInputValue(value)}
        onChange={(e) => {
          const parsed = new Date(e.target.value)
          if (!Number.isNaN(parsed.getTime())) onChange(parsed)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onSubmit()
          }
        }}
        aria-label="Data e ora"
        className="text-caption text-foreground bg-background border border-border rounded-md px-2 py-1.5 focus:outline-none focus:border-accent transition-colors duration-150"
      />
      {isModified && (
        <button
          type="button"
          onClick={onReset}
          className="animate-fade-in text-caption font-medium text-muted border border-border rounded-md px-3 py-1.5 cursor-pointer transition-all duration-150 hover:border-accent hover:text-accent hover:scale-105 active:scale-95"
        >
          Adesso
        </button>
      )}
    </div>
  )
}

export default DateTimeSelector
