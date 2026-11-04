/** One attempt only: a timeout after a write is ambiguous, never auto-retry. */
export class RequestDeadlineError extends Error {
  constructor() { super('Délai de réponse dépassé.'); this.name = 'RequestDeadlineError' }
}
export async function requestJsonWithDeadline(input: RequestInfo | URL, init: RequestInit, timeoutMs = 25000, fetcher: typeof fetch = fetch) {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { reject(new RequestDeadlineError()); controller.abort() }, timeoutMs)
  })
  try {
    return await Promise.race([
      (async () => { const response = await fetcher(input, { ...init, signal: controller.signal }); return { response, data: await response.json() } })(),
      deadline,
    ])
  } finally { if (timer) clearTimeout(timer) }
}
