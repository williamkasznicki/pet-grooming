/** Streams immediately while server data (session, page fetches) resolves. */
export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="text-muted-foreground animate-pulse text-sm">🐾</div>
    </div>
  )
}
