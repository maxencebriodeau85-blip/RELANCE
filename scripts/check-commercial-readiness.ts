import { missingPublisherFields } from '../lib/legal'
const missing = missingPublisherFields()
// Report names only, never actual addresses, phone numbers, keys or connection strings.
if (missing.length) {
  console.error(`Ouverture commerciale non prête : renseigner ${missing.join(', ')}.`)
  process.exitCode=1
} else console.log('Champs éditeur présents. Identité, régime fiscal et documents restent à vérifier ; ceci ne constitue pas une validation juridique.')
