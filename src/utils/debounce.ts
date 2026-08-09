export function debouncePromise<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  delayMs: number
): (...args: Args) => Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (...args: Args) =>
    new Promise((resolve) => {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        resolve(fn(...args))
      }, delayMs)
    })
}
