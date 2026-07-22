"use client"

import { useEffect, useMemo, useReducer, useState } from "react"
import { useFormatter, useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { api, apiErrorMessage } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/auth-context"
import type { Availability, MasterDataItem, Pet, Service, StaffPublic } from "@/lib/types/api"
import { initialWizardState, STEP_ORDER, wizardReducer } from "./wizard-state"

const MAX_DAYS_AHEAD = 30

// Module scope: evaluated once at load, outside render (react-hooks/purity).
// Staleness is irrelevant — the server enforces min-notice on every request.
const DATE_BOUNDS = {
  before: new Date(),
  after: new Date( Date.now() + MAX_DAYS_AHEAD * 86_400_000 ),
}

/** yyyy-MM-dd in the browser's local calendar (shop timezone differences are handled server-side). */
function toDateParam ( date: Date ): string {
  return `${ date.getFullYear() }-${ String( date.getMonth() + 1 ).padStart( 2, "0" ) }-${ String( date.getDate() ).padStart( 2, "0" ) }`
}

/** Static reference data the wizard renders from (loaded once). */
type Catalog = { services: Service[]; sizes: MasterDataItem[]; staff: StaffPublic[] }

export default function BookPage () {
  const t = useTranslations( "book" )
  const tc = useTranslations( "common" )
  const tn = useTranslations( "nav" )
  const format = useFormatter()
  const { user } = useAuth()

  const [ state, dispatch ] = useReducer( wizardReducer, initialWizardState )
  const [ catalog, setCatalog ] = useState<Catalog | null>( null )
  const [ pets, setPets ] = useState<Pet[] | null>( null )

  useEffect( () => {
    void Promise.all( [
      api.get<Service[]>( "/services" ),
      api.get<MasterDataItem[]>( "/master-data/pet-sizes" ),
      api.get<StaffPublic[]>( "/staff" ),
    ] ).then( ( [ services, sizes, staff ] ) =>
      setCatalog( { services: services.data, sizes: sizes.data, staff: staff.data } ),
    )
  }, [] )

  useEffect( () => {
    if ( user ) void api.get<Pet[]>( "/pets" ).then( ( res ) => setPets( res.data ) )
  }, [ user ] )

  // Event-driven (called from handlers, never an effect): keeps loading state
  // out of render and satisfies react-hooks/set-state-in-effect.
  const loadAvailability = async ( forDate: Date, forStaff: string ) => {
    if ( !state.service || !state.pet ) return
    dispatch( { type: "slotsLoading" } )
    try {
      const params = new URLSearchParams( {
        serviceId: state.service.id,
        sizeId: String( state.pet.sizeId ),
        date: toDateParam( forDate ),
      } )
      if ( forStaff !== "any" ) params.set( "staffId", forStaff )
      const res = await api.get<Availability>( `/availability?${ params.toString() }` )
      dispatch( { type: "slotsLoaded", availability: res.data } )
    } catch ( err ) {
      dispatch( { type: "slotsFailed", message: apiErrorMessage( err, tc( "error" ) ) } )
    }
  }

  const confirmBooking = async () => {
    if ( !state.service || !state.pet || !state.slot ) return
    const { service, pet, slot, staffFilter, date } = state
    dispatch( { type: "submitStart" } )
    try {
      const res = await api.post<{ id: string }>( "/bookings", {
        serviceId: service.id,
        petId: pet.id,
        startsAt: slot.start,
        ...( staffFilter !== "any" ? { staffId: staffFilter } : {} ),
      } )
      dispatch( { type: "submitSucceeded", bookingId: res.data.id } )
    } catch ( err ) {
      const status = ( err as { response?: { status?: number } } ).response?.status
      if ( status === 409 ) {
        dispatch( { type: "submitConflicted", message: t( "slotTaken" ) } )
        if ( date ) void loadAvailability( date, staffFilter )
      } else {
        dispatch( { type: "submitFailed", message: apiErrorMessage( err, tc( "error" ) ) } )
      }
    }
  }

  const tier = useMemo(
    () =>
      state.service && state.pet
        ? state.service.tiers.find( ( candidate ) => candidate.sizeId === state.pet?.sizeId )
        : undefined,
    [ state.service, state.pet ],
  )
  const sizeOf = ( sizeId: number ) => catalog?.sizes.find( ( size ) => size.id === sizeId )

  if ( state.bookedId ) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-3xl">🎉</p>
        <h1 className="text-2xl font-semibold text-balance">{ t( "success" ) }</h1>
        <Button render={ <Link href="/bookings" /> }>{ t( "viewBookings" ) }</Button>
      </div>
    )
  }

  const stepIndex = STEP_ORDER.indexOf( state.step )

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold">{ t( "title" ) }</h1>

      {/* Step indicator */ }
      <ol className="mb-8 flex gap-2 text-xs">
        { STEP_ORDER.map( ( name, index ) => (
          <li
            key={ name }
            className={ cn(
              "flex-1 border-b-2 pb-2 font-medium",
              index <= stepIndex ? "border-primary text-foreground" : "border-border text-muted-foreground",
            ) }
          >
            { index + 1 }. { t( `step${ name.charAt( 0 ).toUpperCase() }${ name.slice( 1 ) }` as Parameters<typeof t>[ 0 ] ) }
          </li>
        ) ) }
      </ol>

      { state.error && <p className="text-destructive mb-4 text-sm">{ state.error }</p> }

      {/* Step 1 — service */ }
      { state.step === "service" && (
        <div className="grid gap-3 sm:grid-cols-2">
          { catalog === null
            ? Array.from( { length: 4 } ).map( ( _, index ) => <Skeleton key={ index } className="h-28" /> )
            : catalog.services.map( ( candidate ) => (
              <Card
                key={ candidate.id }
                className={ cn(
                  "cursor-pointer transition-colors",
                  state.service?.id === candidate.id && "border-primary",
                ) }
                onClick={ () => dispatch( { type: "selectService", service: candidate } ) }
              >
                <CardHeader>
                  <CardTitle className="text-base">{ candidate.name }</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  { candidate.description }
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    { candidate.tiers.map( ( tierOption ) => {
                      const size = sizeOf( tierOption.sizeId )
                      return (
                        <Badge
                          key={ tierOption.id }
                          variant="secondary"
                          style={
                            size?.hexBgColorCode
                              ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                              : undefined
                          }
                        >
                          { size?.code } ฿{ Number( tierOption.priceThb ) }
                        </Badge>
                      )
                    } ) }
                  </div>
                </CardContent>
              </Card>
            ) ) }
        </div>
      ) }

      {/* Step 2 — pet */ }
      { state.step === "pet" && (
        <div className="flex flex-col gap-3">
          { !user && (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <p>{ t( "loginRequired" ) }</p>
                <Button render={ <Link href="/login?next=/book" /> }>{ tn( "login" ) }</Button>
              </CardContent>
            </Card>
          ) }
          { user && pets !== null && pets.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-start gap-3 pt-6">
                <p>{ t( "noPets" ) }</p>
                <Button render={ <Link href="/pets" /> }>{ t( "addPet" ) }</Button>
              </CardContent>
            </Card>
          ) }
          { user &&
            ( pets ?? [] ).map( ( candidate ) => {
              const size = sizeOf( candidate.sizeId )
              return (
                <Card
                  key={ candidate.id }
                  className={ cn(
                    "cursor-pointer transition-colors",
                    state.pet?.id === candidate.id && "border-primary",
                  ) }
                  onClick={ () => dispatch( { type: "selectPet", pet: candidate } ) }
                >
                  <CardContent className="flex items-center justify-between gap-3 pt-6">
                    <div>
                      <p className="font-medium">{ candidate.name }</p>
                      { candidate.breed && <p className="text-muted-foreground text-sm">{ candidate.breed }</p> }
                    </div>
                    { size && (
                      <Badge
                        style={
                          size.hexBgColorCode
                            ? { backgroundColor: size.hexBgColorCode, color: size.hexTextColorCode ?? undefined }
                            : undefined
                        }
                      >
                        { size.code }
                      </Badge>
                    ) }
                  </CardContent>
                </Card>
              )
            } ) }
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={ () => dispatch( { type: "back", to: "service" } ) }
          >
            ← { tc( "back" ) }
          </Button>
        </div>
      ) }

      {/* Step 3 — date & slot */ }
      { state.step === "time" && state.service && state.pet && (
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={ state.date }
              onSelect={ ( selected ) => {
                dispatch( { type: "pickDate", date: selected } )
                if ( selected ) void loadAvailability( selected, state.staffFilter )
              } }
              disabled={ DATE_BOUNDS }
            />
            <Select
              value={ state.staffFilter }
              onValueChange={ ( value ) => {
                const nextStaff = ( value as string | null ) ?? "any"
                dispatch( { type: "setStaffFilter", staffId: nextStaff } )
                if ( state.date ) void loadAvailability( state.date, nextStaff )
              } }
            >
              <SelectTrigger aria-label={ t( "groomer" ) }>
                {/* Explicit label: Base UI only learns item labels after the popup first mounts */ }
                <SelectValue>
                  { state.staffFilter === "any"
                    ? t( "anyGroomer" )
                    : ( catalog?.staff.find( ( member ) => member.id === state.staffFilter )?.displayName ?? t( "groomer" ) ) }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">{ t( "anyGroomer" ) }</SelectItem>
                { ( catalog?.staff ?? [] ).map( ( member ) => (
                  <SelectItem key={ member.id } value={ member.id }>
                    { member.displayName }
                  </SelectItem>
                ) ) }
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            { tier && (
              <p className="text-muted-foreground mb-3 text-sm">
                { state.service.name } · { t( "duration", { minutes: tier.durationMin } ) } · ฿{ Number( tier.priceThb ) }
              </p>
            ) }
            { state.loadingSlots && <Skeleton className="h-40" /> }
            { !state.loadingSlots && state.date && state.availability && state.availability.slots.length === 0 && (
              <p className="text-muted-foreground text-sm">{ t( "noSlots" ) }</p>
            ) }
            { !state.loadingSlots && state.availability && state.availability.slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                { state.availability.slots.map( ( candidate ) => (
                  <Button
                    key={ candidate.start }
                    variant={ state.slot?.start === candidate.start ? "default" : "outline" }
                    onClick={ () => dispatch( { type: "selectSlot", slot: candidate } ) }
                  >
                    { format.dateTime( new Date( candidate.start ), { hour: "2-digit", minute: "2-digit" } ) }
                  </Button>
                ) ) }
              </div>
            ) }
          </div>
        </div>
      ) }
      { state.step === "time" && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={ () => dispatch( { type: "back", to: "pet" } ) }>
          ← { tc( "back" ) }
        </Button>
      ) }

      {/* Step 4 — confirm */ }
      { state.step === "confirm" && state.service && state.pet && state.slot && tier && (
        <Card>
          <CardHeader>
            <CardTitle>{ t( "confirmTitle" ) }</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="font-medium">
              { state.service.name } — { state.pet.name }
            </p>
            <p>{ format.dateTime( new Date( state.slot.start ), { dateStyle: "full", timeStyle: "short" } ) }</p>
            <p className="text-muted-foreground">
              { t( "duration", { minutes: tier.durationMin } ) } · ฿{ Number( tier.priceThb ) } ·{ " " }
              { state.staffFilter === "any"
                ? t( "anyGroomer" )
                : ( catalog?.staff.find( ( member ) => member.id === state.staffFilter )?.displayName ?? t( "groomer" ) ) }
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={ () => void confirmBooking() } disabled={ state.submitting }>
                { state.submitting ? tc( "loading" ) : t( "confirmCta" ) }
              </Button>
              <Button
                variant="ghost"
                onClick={ () => dispatch( { type: "back", to: "time" } ) }
                disabled={ state.submitting }
              >
                ← { tc( "back" ) }
              </Button>
            </div>
          </CardContent>
        </Card>
      ) }
    </div>
  )
}
