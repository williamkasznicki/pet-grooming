"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

/**
 * GSAP animation wrapper for the landing page. The page stays a server
 * component and just wraps its content in <LandingMotion>. Every tween is
 * scoped to gsap.context (React unmount reverts them) and driven by
 * data-attribute so the markup stays declarative:
 *
 *   data-anim="hero"     → staggered load-in of the block's direct children
 *   data-anim="hero-art" → hero image settles in from the side
 *   data-anim="reveal"   → fade/rise as it scrolls into view
 *   data-anim="pop"      → children scale/rise on scroll, staggered
 *
 * Fully skipped under prefers-reduced-motion (content is visible by default;
 * GSAP's from() only hides then reveals, and we never run it in that mode).
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      const hero = root.querySelector('[data-anim="hero"]')
      if (hero) {
        gsap.from(hero.children, { y: 24, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.12 })
      }
      const heroArt = root.querySelector('[data-anim="hero-art"]')
      if (heroArt) {
        gsap.from(heroArt, { x: 40, opacity: 0, duration: 0.9, ease: "power3.out", delay: 0.15 })
      }
      root.querySelectorAll('[data-anim="reveal"]').forEach((element) => {
        gsap.from(element, {
          y: 28,
          opacity: 0,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 85%" },
        })
      })
      root.querySelectorAll('[data-anim="pop"]').forEach((group) => {
        gsap.from(group.children, {
          y: 32,
          opacity: 0,
          scale: 0.96,
          duration: 0.55,
          ease: "back.out(1.4)",
          stagger: 0.1,
          scrollTrigger: { trigger: group, start: "top 80%" },
        })
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return <div ref={rootRef}>{children}</div>
}
