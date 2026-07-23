/** Minutes-from-midnight → "HH:mm" (shop-local wall time, e.g. openMin 540 → "09:00"). */
export function formatMinutesOfDay(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

/** yyyy-MM-dd in the browser's local calendar (shop-timezone math stays server-side). */
export function toDateParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
