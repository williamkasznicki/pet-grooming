/**
 * Preset icon keys a service may use. The client maps each key to its icon
 * library (Remix Icon) — keep this list in sync with
 * client/apps/web/lib/service-icons.tsx.
 */
export const SERVICE_ICONS = [
  'scissors',
  'shower',
  'drop',
  'paw',
  'sparkle',
  'heart',
  'star',
  'brush',
] as const;

export type ServiceIconKey = (typeof SERVICE_ICONS)[number];
