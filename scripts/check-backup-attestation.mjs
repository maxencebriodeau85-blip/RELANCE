import { pathToFileURL } from 'node:url';
/** Manual isolated restore proof, not a claim that the provider API was checked. */
export function recentRestoreAttestation(timestamp, now=Date.now()) {
  if (typeof timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(timestamp)) return false;
  const value=Date.parse(timestamp);
  return Number.isFinite(value) && value <= now && now-value <= 30*86400000;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!recentRestoreAttestation(process.env.BACKUP_RESTORE_VERIFIED_AT)) {
    console.error('Sauvegarde gérée : attestation de restauration isolée absente, invalide ou de plus de 30 jours. Aucune restauration attestée.');
    process.exitCode=1;
  } else console.log('Attestation manuelle de restauration isolée récente présente. Les sauvegardes fournisseur ne sont pas contrôlées par cette sonde.');
}
