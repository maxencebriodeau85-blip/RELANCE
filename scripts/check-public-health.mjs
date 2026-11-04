import { pathToFileURL } from 'node:url';
export const REQUIRED_CONFIG = ['authReady','supabaseServiceRole','billingReady','commercialReady','resend','resendWebhook','emailSender','automationReady','cronSecret'];
/** @param {unknown} body */
export function publicHealthIssues(body) {
  if (!body || typeof body !== 'object') return ['Réponse de santé invalide.'];
  const data = /** @type {Record<string, any>} */ (body);
  if (data.service !== 'encair' || data.status !== 'ok' || data.checks !== 'configuration-presence-only') return ['Sonde Encair non reconnue.'];
  return REQUIRED_CONFIG.filter(key => data.config?.[key] !== true).map(key => `Configuration manquante : ${key}.`);
}
async function main() {
  try {
    const url = new URL(process.env.ENCAIR_BASE_URL || 'https://encair.fr');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw Error('Invalid origin');
    const response = await fetch(new URL('/api/health',url), {signal:AbortSignal.timeout(15000),redirect:'error'});
    if (!response.ok) throw Error('HTTP error');
    const issues = publicHealthIssues(await response.json());
    for (const issue of issues) console.error(issue);
    if (issues.length) process.exitCode=1;
    else console.log('HTTP et présence de configuration vérifiés. Ni base, ni cron, ni livraison, ni restauration attestés.');
  } catch { console.error('Sonde publique impossible : vérifier le domaine, HTTP et le format de réponse.'); process.exitCode=1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
