import type { Availability, AvailabilitySlot, Pet, Service } from "@/lib/types/api"

export type Step = "service" | "pet" | "time" | "confirm"
export const STEP_ORDER: Step[] = ["service", "pet", "time", "confirm"]

/**
 * Single source of truth for the booking wizard. A reducer instead of a dozen
 * useStates: every mutation is a named transition, related fields change
 * together, and stale combinations (slot without date, availability from a
 * previous pet) are cleared by construction.
 */
export type WizardState = {
  step: Step
  service: Service | null
  pet: Pet | null
  date: Date | undefined
  staffFilter: string
  availability: Availability | null
  loadingSlots: boolean
  slot: AvailabilitySlot | null
  submitting: boolean
  error: string | null
  bookedId: string | null
}

export const initialWizardState: WizardState = {
  step: "service",
  service: null,
  pet: null,
  date: undefined,
  staffFilter: "any",
  availability: null,
  loadingSlots: false,
  slot: null,
  submitting: false,
  error: null,
  bookedId: null,
}

export type WizardAction =
  | { type: "selectService"; service: Service }
  | { type: "selectPet"; pet: Pet }
  | { type: "back"; to: Step }
  | { type: "pickDate"; date: Date | undefined }
  | { type: "setStaffFilter"; staffId: string }
  | { type: "slotsLoading" }
  | { type: "slotsLoaded"; availability: Availability }
  | { type: "slotsFailed"; message: string }
  | { type: "selectSlot"; slot: AvailabilitySlot }
  | { type: "submitStart" }
  | { type: "submitSucceeded"; bookingId: string }
  | { type: "submitConflicted"; message: string }
  | { type: "submitFailed"; message: string }

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "selectService":
      // New service invalidates everything downstream of step 1.
      return {
        ...initialWizardState,
        step: "pet",
        service: action.service,
        pet: state.pet,
        staffFilter: state.staffFilter,
      }
    case "selectPet":
      // Size may differ → previous availability/slot are meaningless.
      return {
        ...state,
        step: "time",
        pet: action.pet,
        date: undefined,
        availability: null,
        slot: null,
        error: null,
      }
    case "back":
      return { ...state, step: action.to, error: null, ...(action.to !== "confirm" ? { slot: null } : {}) }
    case "pickDate":
      return { ...state, date: action.date, slot: null, error: null }
    case "setStaffFilter":
      return { ...state, staffFilter: action.staffId, slot: null }
    case "slotsLoading":
      return { ...state, loadingSlots: true, slot: null, error: null }
    case "slotsLoaded":
      return { ...state, loadingSlots: false, availability: action.availability }
    case "slotsFailed":
      return { ...state, loadingSlots: false, availability: null, error: action.message }
    case "selectSlot":
      return { ...state, step: "confirm", slot: action.slot, error: null }
    case "submitStart":
      return { ...state, submitting: true, error: null }
    case "submitSucceeded":
      return { ...state, submitting: false, bookedId: action.bookingId }
    case "submitConflicted":
      // Slot raced away — back to the slot grid with the message; caller refetches.
      return { ...state, submitting: false, step: "time", slot: null, error: action.message }
    case "submitFailed":
      return { ...state, submitting: false, error: action.message }
  }
}
