import { createNavigation } from "next-intl/navigation"

import { routing } from "./routing"

/** Locale-aware Link/redirect/router — always import these, never next/link directly. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
