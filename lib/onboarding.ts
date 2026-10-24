/** Persist dismissal before hiding the guide or navigating to its next action. */
export async function completeOnboarding(fetcher: typeof fetch = fetch): Promise<void> {
  let response: Response
  try {
    response = await fetcher('/api/profile/onboarding', { method: 'POST', signal: AbortSignal.timeout(12000) })
  } catch {
    throw new Error('La connexion a été interrompue. Réessayez pour terminer le démarrage.')
  }
  if (response.status === 401) {
    throw new Error('Votre session a expiré. Reconnectez-vous puis réessayez.')
  }
  if (!response.ok) {
    throw new Error('Le démarrage n’a pas pu être enregistré. Réessayez dans un instant.')
  }
}
