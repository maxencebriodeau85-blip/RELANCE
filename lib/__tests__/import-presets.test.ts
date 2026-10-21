import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { importPresetSchema, compatiblePreset } from '../import-presets'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
const preset = {
  name: 'EBP',
  headers: ['Client', 'Référence', 'Total', 'Échéance'],
  mapping: {
    client_name: 'Client',
    invoice_number: 'Référence',
    amount: 'Total',
    due_date: 'Échéance',
  },
}
it('accepts an optional email and reordering, rejects changed columns and duplicate mappings', () => {
  expect(importPresetSchema.safeParse(preset).success).toBe(true)
  expect(compatiblePreset(preset, [...preset.headers].reverse())).toBe(true)
  expect(compatiblePreset(preset, [...preset.headers, 'Email'])).toBe(false)
  expect(
    importPresetSchema.safeParse({ ...preset, user_id: 'other' }).success,
  ).toBe(false)
  expect(
    importPresetSchema.safeParse({
      ...preset,
      mapping: { ...preset.mapping, amount: 'Client' },
    }).success,
  ).toBe(false)
  expect(
    importPresetSchema.safeParse({
      ...preset,
      mapping: { ...preset.mapping, client_email: 'Email' },
    }).success,
  ).toBe(false)
})
let db: PGlite
const owner = '00000000-0000-4000-8000-000000000001',
  other = '00000000-0000-4000-8000-000000000002'
beforeAll(async () => {
  db = new PGlite()
  await db.exec(
    `create role authenticated; create role anon; create schema auth; create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; create table profiles(id uuid primary key); insert into profiles values ('${owner}'),('${other}'); grant usage on schema public,auth to authenticated;`,
  )
  await db.exec(
    readFileSync(
      'supabase/migrations/20261018153639_import_presets.sql',
      'utf8',
    ),
  )
  await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`)
}, 30000)
afterAll(async () => db?.close())
describe('Saved formats security and persistence', () => {
  it('round trips settings and prevents access and reassignment across accounts', async () => {
    await db.query(
      'insert into import_presets(user_id,name,headers,mapping) values($1,$2,$3,$4)',
      [
        owner,
        preset.name,
        JSON.stringify(preset.headers),
        JSON.stringify(preset.mapping),
      ],
    )
    expect((await db.query('select * from import_presets')).rows).toHaveLength(
      1,
    )
    await expect(
      db.query('update import_presets set user_id=$1', [other]),
    ).rejects.toThrow()
    await db.exec(`set request.jwt.claim.sub='${other}'`)
    expect((await db.query('select * from import_presets')).rows).toHaveLength(
      0,
    )
    await expect(
      db.query(
        'insert into import_presets(user_id,name,headers,mapping) values($1,$2,$3,$4)',
        [owner, 'stolen', JSON.stringify(preset.headers), '{}'],
      ),
    ).rejects.toThrow()
    await db.exec(`set request.jwt.claim.sub='${owner}'`)
  })
  it('limits new formats atomically while permitting replacement and deletion', async () => {
    await db.query(
      "insert into import_presets(user_id,name,headers,mapping) select $1,'format-' || n,$2::jsonb,'{}'::jsonb from generate_series(1,99) n",
      [owner, JSON.stringify(preset.headers)],
    )
    await expect(
      db.query(
        'insert into import_presets(user_id,name,headers,mapping) values($1,$2,$3,$4)',
        [owner, 'overflow', JSON.stringify(preset.headers), '{}'],
      ),
    ).rejects.toThrow('100 formats')
    await db.query(
      'insert into import_presets(user_id,name,headers,mapping) values($1,$2,$3,$4) on conflict(user_id,name) do update set mapping=excluded.mapping',
      [
        owner,
        preset.name,
        JSON.stringify(preset.headers),
        JSON.stringify(preset.mapping),
      ],
    )
    await db.query('delete from import_presets where name=$1', [preset.name])
    expect(
      (
        await db.query('select * from import_presets where name=$1', [
          preset.name,
        ])
      ).rows,
    ).toHaveLength(0)
  })
  it('does not grant anonymous access', async () => {
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_table_privilege('anon','import_presets','SELECT') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false)
  })
})
