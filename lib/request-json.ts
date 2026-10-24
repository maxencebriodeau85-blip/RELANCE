/** Bound the bytes actually read, including requests without Content-Length. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<
  { ok: true; value: unknown } | { ok: false; status: 400 | 413; error: string }
> {
  const tooLarge = { ok: false as const, status: 413 as const, error: 'Requête trop volumineuse.' }
  const length = request.headers.get('content-length')
  if (length && Number(length) > maxBytes) return tooLarge
  if (!request.body) return { ok: false, status: 400, error: 'Corps JSON requis.' }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel().catch(() => {})
        return tooLarge
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
    return { ok: true, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }
  } catch {
    return { ok: false, status: 400, error: 'Corps JSON invalide.' }
  } finally {
    reader.releaseLock()
  }
}
