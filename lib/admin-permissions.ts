/**
 * CueBoard – Admin rechten
 *
 * Beheerders ('beheerder') hebben altijd ALLE rechten.
 * Admins ('admin') krijgen alleen de rechten die in admin_permissions staan.
 */

import type { UserRole } from '@/lib/types/database'

// ── Permissie-definities ───────────────────────────────────────────────────

export const ADMIN_PERMISSION_DEFS = {
  change_plan:    { label: 'Plan wijzigen',           desc: 'Plan en bron aanpassen, inclusief bulk-wijziging' },
  extend_trial:   { label: 'Trial beheren',           desc: 'Trial verlengen of verwijderen' },
  edit_users:     { label: 'Gebruikers bewerken',     desc: 'Naam, e-mailadres en telefoon aanpassen' },
  admin_notes:    { label: 'Notities beheren',        desc: 'Admin-notities aanmaken en bewerken' },
  send_email:     { label: 'E-mail sturen',           desc: 'Direct een e-mail sturen naar een gebruiker' },
  delete_users:   { label: 'Gebruikers verwijderen',  desc: 'Account permanent verwijderen uit het systeem' },
  view_charts:    { label: 'Grafieken bekijken',      desc: 'Signup- en revenue-grafieken inzien' },
} as const

export type AdminPermission = keyof typeof ADMIN_PERMISSION_DEFS

export const ALL_PERMISSIONS = Object.keys(ADMIN_PERMISSION_DEFS) as AdminPermission[]

// Standaard rechten voor nieuwe admins
export const DEFAULT_ADMIN_PERMISSIONS: AdminPermission[] = [
  'extend_trial',
  'edit_users',
  'admin_notes',
]

// ── Hulpfuncties ───────────────────────────────────────────────────────────

/**
 * Geeft terug of een gebruiker een specifieke admin-actie mag uitvoeren.
 * Beheerders mogen altijd alles.
 */
export function hasAdminPermission(
  role: UserRole | string | null | undefined,
  permissions: string[] | null | undefined,
  permission: AdminPermission,
): boolean {
  if (role === 'beheerder') return true
  if (role !== 'admin') return false
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Geeft alle rechten terug als beheerder, anders de opgeslagen rechten.
 */
export function resolvePermissions(
  role: UserRole | string | null | undefined,
  permissions: string[] | null | undefined,
): AdminPermission[] {
  if (role === 'beheerder') return ALL_PERMISSIONS
  if (role !== 'admin') return []
  return (permissions ?? []).filter((p): p is AdminPermission => p in ADMIN_PERMISSION_DEFS)
}
