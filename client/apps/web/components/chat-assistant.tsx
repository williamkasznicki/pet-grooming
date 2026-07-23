"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { RiCloseLine, RiRobot2Line, RiSendPlane2Fill, RiSparkling2Fill } from "@remixicon/react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

import { useAxios } from "@/hooks/useAxios"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"

type ChatMessage = { role: "user" | "assistant"; content: string }

/**
 * Booking assistant chat (docs/DESIGN.md). Talks to the server AiModule, which
 * reads real services/availability and answers in plain language — it never
 * books. Renders only for signed-in users when the server has the assistant
 * configured (GET /ai/status); otherwise it stays hidden.
 */
export function ChatAssistant() {
  const t = useTranslations("assistant")
  const { user } = useAuth()
  // Probe only when logged in (the endpoint is authenticated)
  const { data: status } = useAxios<{ configured: boolean }>(user ? "/ai/status" : null)

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, busy])

  if (!user || !status?.configured) return null

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const next = [...messages, { role: "user" as const, content: text }]
    setMessages(next)
    setInput("")
    setBusy(true)
    setError(null)
    try {
      // Free models can take a while with tool round-trips — allow 90s
      const res = await api.post<{ reply: string }>("/ai/chat", { messages: next }, { timeout: 90_000 })
      setMessages([...next, { role: "assistant", content: res.data.reply }])
    } catch (err) {
      setError(apiErrorMessage(err, t("error")))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Launcher */}
      {!open && (
        <Button
          size="icon-lg"
          aria-label={t("open")}
          className="fixed right-4 bottom-4 z-50 size-14 rounded-full shadow-lg"
          onClick={() => setOpen(true)}
        >
          <RiRobot2Line className="size-6" />
        </Button>
      )}

      {/* Panel */}
      {open && (
        <div className="bg-card fixed right-4 bottom-4 z-50 flex h-[32rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl">
          <header className="bg-primary text-primary-foreground flex items-center justify-between gap-2 px-4 py-3">
            <span className="flex items-center gap-2 font-semibold">
              <RiSparkling2Fill className="size-4" />
              {t("title")}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("close")}
              className="text-primary-foreground hover:bg-primary-foreground/15"
              onClick={() => setOpen(false)}
            >
              <RiCloseLine />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && <p className="text-muted-foreground">{t("greeting")}</p>}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto"
                    : "bg-muted text-foreground",
                )}
              >
                {message.content}
              </div>
            ))}
            {busy && <p className="text-muted-foreground animate-pulse">{t("thinking")}</p>}
            {error && <p className="text-destructive">{error}</p>}
          </div>

          <form
            className="flex items-center gap-2 border-t p-3"
            onSubmit={(event) => {
              event.preventDefault()
              void send()
            }}
          >
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t("placeholder")}
              maxLength={2000}
              aria-label={t("placeholder")}
            />
            <Button type="submit" size="icon" aria-label={t("send")} disabled={busy || !input.trim()}>
              <RiSendPlane2Fill />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
