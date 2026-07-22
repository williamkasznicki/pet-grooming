import "server-only"
import axios from "axios"

/**
 * BFF → NestJS axios instance (server-side only; the browser never talks to
 * NestJS directly — docs/DESIGN.md BFF pattern). Status is passed through so
 * route handlers can relay backend errors verbatim.
 */
export const nestApi = axios.create({
  baseURL: process.env.API_URL ?? "http://localhost:4000",
  timeout: 15_000,
  validateStatus: () => true,
})
