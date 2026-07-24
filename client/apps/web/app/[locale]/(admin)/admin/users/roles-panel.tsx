"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { api, apiErrorMessage } from "@/lib/api/client"

export type Role = { id: number; name: string; group: string | null; desc: string | null; permissions: string[] }
export type Permission = { id: number; name: string; displayName: string; group: string | null; desc: string | null }

/**
 * Role ↔ permission assignment, IAM-style (reference layout): role list with
 * permission counts on the left, grouped permission toggles on the right with
 * select-all / remove-all per group. Server invalidates permission caches on
 * every change, so grants apply on the holder's next request.
 */
export function RolesPanel ( {
  roles,
  permissions,
  refetchRoles,
}: {
  roles: Role[]
  permissions: Permission[]
  refetchRoles: () => void
} ) {
  const t = useTranslations( "admin.roles" )
  const tc = useTranslations( "common" )

  const [ search, setSearch ] = useState( "" )
  const [ selectedId, setSelectedId ] = useState<number | null>( roles[ 0 ]?.id ?? null )
  const [ busyNames, setBusyNames ] = useState<Set<string>>( new Set() )
  const [ error, setError ] = useState<string | null>( null )

  const selected = roles.find( ( role ) => role.id === selectedId ) ?? null

  const visibleRoles = useMemo( () => {
    const query = search.trim().toLowerCase()
    return query ? roles.filter( ( role ) => role.name.toLowerCase().includes( query ) ) : roles
  }, [ roles, search ] )

  const grouped = useMemo( () => {
    const groups = new Map<string, Permission[]>()
    for ( const permission of permissions ) {
      const key = permission.group ?? "Other"
      groups.set( key, [ ...( groups.get( key ) ?? [] ), permission ] )
    }
    return [ ...groups.entries() ].sort( ( [ a ], [ b ] ) => a.localeCompare( b ) )
  }, [ permissions ] )

  const setBusy = ( names: string[], busy: boolean ) =>
    setBusyNames( ( current ) => {
      const next = new Set( current )
      for ( const name of names ) {
        if ( busy ) next.add( name )
        else next.delete( name )
      }
      return next
    } )

  const toggle = async ( permission: Permission, assign: boolean ) => {
    if ( !selected ) return
    setError( null )
    setBusy( [ permission.name ], true )
    try {
      if ( assign ) {
        await api.post( `/roles/${ selected.id }/permissions`, { permissionId: permission.id } )
      } else {
        await api.delete( `/roles/${ selected.id }/permissions/${ permission.id }` )
      }
      refetchRoles()
    } catch ( err ) {
      setError( apiErrorMessage( err, tc( "error" ) ) )
    } finally {
      setBusy( [ permission.name ], false )
    }
  }

  const bulk = async ( group: Permission[], assign: boolean ) => {
    if ( !selected ) return
    setError( null )
    const targets = group.filter( ( permission ) => selected.permissions.includes( permission.name ) !== assign )
    setBusy( targets.map( ( permission ) => permission.name ), true )
    try {
      for ( const permission of targets ) {
        if ( assign ) {
          await api.post( `/roles/${ selected.id }/permissions`, { permissionId: permission.id } )
        } else {
          await api.delete( `/roles/${ selected.id }/permissions/${ permission.id }` )
        }
      }
      refetchRoles()
    } catch ( err ) {
      setError( apiErrorMessage( err, tc( "error" ) ) )
    } finally {
      setBusy( targets.map( ( permission ) => permission.name ), false )
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Role list */ }
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-72">
        <Input
          value={ search }
          onChange={ ( event ) => setSearch( event.target.value ) }
          placeholder={ t( "searchPlaceholder" ) }
          aria-label={ t( "searchPlaceholder" ) }
        />
        <div className="flex flex-col gap-1">
          { visibleRoles.map( ( role ) => (
            <button
              key={ role.id }
              type="button"
              onClick={ () => setSelectedId( role.id ) }
              className={ cn(
                "hover:bg-muted flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                selectedId === role.id && "border-primary bg-muted",
              ) }
            >
              <span>
                <span className="block font-medium">{ role.name }</span>
                { role.group && <span className="text-muted-foreground text-xs">{ role.group }</span> }
              </span>
              <span className="text-muted-foreground text-xs whitespace-nowrap">
                { t( "permissionsCount", { count: role.permissions.length } ) }
              </span>
            </button>
          ) ) }
        </div>
      </div>

      {/* Permission toggles */ }
      <div className="min-w-0 flex-1">
        { !selected ? (
          <p className="text-muted-foreground text-sm">{ t( "pickRole" ) }</p>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{ selected.name }</h2>
                <p className="text-muted-foreground text-sm">{ t( "hint" ) }</p>
              </div>
              <Badge variant="secondary">{ t( "permissionsCount", { count: selected.permissions.length } ) }</Badge>
            </div>

            { error && <p className="text-destructive text-sm">{ error }</p> }

            { grouped.map( ( [ groupName, groupPermissions ] ) => {
              const allOn = groupPermissions.every( ( permission ) => selected.permissions.includes( permission.name ) )
              return (
                <section key={ groupName }>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                      # { groupName }
                    </h3>
                    <Button variant="ghost" size="xs" onClick={ () => void bulk( groupPermissions, !allOn ) }>
                      { allOn ? t( "removeAll" ) : t( "selectAll" ) }
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]">
                    { groupPermissions.map( ( permission ) => {
                      const assigned = selected.permissions.includes( permission.name )
                      return (
                        <Card key={ permission.id } className={ cn( assigned && "border-primary/40 bg-primary/5" ) }>
                          <CardContent className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{ permission.displayName }</p>
                              <p className="text-muted-foreground truncate font-mono text-xs">{ permission.name }</p>
                            </div>
                            <Switch
                              checked={ assigned }
                              disabled={ busyNames.has( permission.name ) }
                              onCheckedChange={ ( checked ) => void toggle( permission, checked === true ) }
                              aria-label={ permission.displayName }
                            />
                          </CardContent>
                        </Card>
                      )
                    } ) }
                  </div>
                </section>
              )
            } ) }
          </div>
        ) }
      </div>
    </div>
  )
}
