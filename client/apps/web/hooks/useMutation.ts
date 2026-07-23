"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { apiErrorMessage } from "@/lib/api/client"

/**
 * One-shot mutation runner — the busy → call → toast → refetch pattern that
 * every page repeated by hand (docs/API-CONVENTIONS.md: queries via useAxios,
 * mutations via direct api.* calls in handlers; this wraps only the ceremony).
 *
 *   const save = useMutation()
 *   const onSave = () =>
 *     save.run(() => api.put(`/pets/${id}`, payload), {
 *       successMessage: t("saved"),
 *       onSuccess: () => { closeDialog(); refetch() },
 *     })
 *
 * `error` holds the translated backend message for inline display (dialogs);
 * `reset()` clears it when a dialog closes. Only one dialog is ever open at a
 * time, so a single error slot per page is enough.
 */
export function useMutation() {
  const tc = useTranslations("common")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (
    action: () => Promise<unknown>,
    options?: { successMessage?: string; onSuccess?: () => void },
  ): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      await action()
      if (options?.successMessage) toast.success(options.successMessage)
      options?.onSuccess?.()
      return true
    } catch (err) {
      setError(apiErrorMessage(err, tc("error")))
      return false
    } finally {
      setBusy(false)
    }
  }

  return { busy, error, run, reset: () => setError(null) }
}
