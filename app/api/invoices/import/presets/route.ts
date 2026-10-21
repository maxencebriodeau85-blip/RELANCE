import { createClient } from '@/lib/supabase/server'
import { readJsonBody } from '@/lib/request-json'
import { importPresetSchema } from '@/lib/import-presets'
import { NextResponse } from 'next/server'
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
async function handle(request: Request, method: 'GET' | 'PUT' | 'DELETE') {
  try {
    const db = await createClient()
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser()
    if (authError || !user)
      return json({ error: 'Connectez-vous pour continuer.' }, 401)
    if (method === 'GET') {
      const { data, error } = await db
        .from('import_presets')
        .select('name,headers,mapping')
        .eq('user_id', user.id)
        .order('name')
        .limit(101)
      if (error) throw error
      if ((data?.length || 0) > 100)
        return json(
          { error: 'Trop de formats enregistrés. Contactez le support.' },
          409,
        )
      return json({ presets: data })
    }
    const body = await readJsonBody(request, 32768)
    if (!body.ok) return json({ error: body.error }, body.status)
    if (method === 'DELETE') {
      const name = (body.value as { name?: unknown } | null)?.name
      if (typeof name !== 'string' || !name.trim() || name.length > 80)
        return json({ error: 'Nom de format invalide.' }, 422)
      const { error } = await db
        .from('import_presets')
        .delete()
        .eq('user_id', user.id)
        .eq('name', name)
      if (error) throw error
      return json({ deleted: true })
    }
    const parsed = importPresetSchema.safeParse(body.value)
    if (!parsed.success)
      return json(
        {
          error: 'Vérifiez le nom du format et la correspondance des colonnes.',
        },
        422,
      )
    const { error } = await db.from('import_presets').upsert(
      {
        user_id: user.id,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,name' },
    )
    if (error?.code === '23514')
      return json(
        {
          error:
            '100 formats maximum. Supprimez un ancien format ou remplacez un format existant.',
        },
        422,
      )
    if (error) throw error
    return json({ preset: parsed.data })
  } catch {
    return json(
      {
        error:
          'Formats indisponibles. Votre import reste possible sans enregistrement.',
      },
      503,
    )
  }
}
export const GET = (request: Request) => handle(request, 'GET')
export const PUT = (request: Request) => handle(request, 'PUT')
export const DELETE = (request: Request) => handle(request, 'DELETE')
