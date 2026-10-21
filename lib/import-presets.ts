import { z } from 'zod'
import type { ColumnMapping } from './csv-parser'
const column = z.string().min(1).max(200)
export const importPresetSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    headers: z.array(column).min(4).max(100),
    mapping: z
      .object({
        client_name: column,
        invoice_number: column,
        amount: column,
        due_date: column,
        client_email: column.optional(),
        remaining_amount: column.optional(),
        issued_date: column.optional(),
        client_address: column.optional(),
        client_siren: column.optional(),
      })
      .strict(),
  })
  .strict()
  .refine(
    (p) =>
      new Set(p.headers).size === p.headers.length &&
      Object.values(p.mapping).every((c) => p.headers.includes(c)) &&
      new Set(Object.values(p.mapping)).size ===
        Object.values(p.mapping).length,
    'Chaque champ doit utiliser une colonne distincte du fichier.',
  )
export type ImportPreset = z.infer<typeof importPresetSchema>
export function compatiblePreset(preset: ImportPreset, headers: string[]) {
  // Added, removed or renamed columns require a fresh explicit mapping.
  return (
    preset.headers.length === headers.length &&
    preset.headers.every((h) => headers.includes(h))
  )
}
export function cleanMapping(mapping: Partial<ColumnMapping>) {
  return Object.fromEntries(
    Object.entries(mapping).filter(([, value]) => Boolean(value)),
  )
}
