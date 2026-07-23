import { ChatAssistant } from "@/components/chat-assistant"
import { SiteHeader } from "@/components/site-header"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <ChatAssistant />
    </div>
  )
}
