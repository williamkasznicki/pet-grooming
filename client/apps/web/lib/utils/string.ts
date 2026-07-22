/** Trimmed value or undefined — for optional API fields where "" means "not set". */
export function optionalString(value: string | undefined): string | undefined {
  return value?.trim() ? value.trim() : undefined
}
