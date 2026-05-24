/**
 * Script de setup Stripe pour RelanceFlow
 * Crée les produits et prix pour les 3 plans.
 *
 * Usage : npx tsx scripts/setup-stripe.ts
 *
 * Prérequis : STRIPE_SECRET_KEY dans .env.local
 */

import Stripe from 'stripe'
import * as fs from 'fs'
import * as path from 'path'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const PLANS = [
  {
    key: 'starter',
    envVar: 'STRIPE_STARTER_PRICE_ID',
    name: 'RelanceFlow Solo',
    description: 'Pour consultants et coaches indépendants — pipeline + relances + facturation',
    amount: 1500, // 15 € en centimes
    features: [
      "Pipeline kanban (contacts illimités)",
      "Journal d'activité",
      "Séquences relance prospects auto",
      "Facturation intégrée",
      "Relances factures auto",
      "Support email",
    ],
  },
  {
    key: 'pro',
    envVar: 'STRIPE_PRO_PRICE_ID',
    name: 'RelanceFlow Pro',
    description: 'Pour consultants avec un volume plus important ou des intégrations',
    amount: 2900, // 29 € en centimes
    features: [
      "Tout Solo, plus :",
      "Intégrations comptables",
      "Export CSV",
      "Scénarios personnalisables",
      "Support prioritaire",
    ],
  },
  {
    key: 'business',
    envVar: 'STRIPE_BUSINESS_PRICE_ID',
    name: 'RelanceFlow Business',
    description: "Jusqu'à 1000 factures/mois — pour TPE+ et petites PME",
    amount: 9900,
    features: [
      "1000 factures/mois",
      "Accès API",
      "Multi-utilisateurs",
      "Intégration comptable",
      "Account manager dédié",
      "SLA 99.9%",
    ],
  },
]

async function main() {
  console.log('🚀 Création des produits et prix Stripe pour RelanceFlow...\n')

  const priceIds: Record<string, string> = {}

  for (const plan of PLANS) {
    console.log(`📦 Création du plan ${plan.name}...`)

    // Créer le produit
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        plan_key: plan.key,
        features: plan.features.join(' | '),
      },
    })

    console.log(`   ✅ Produit créé : ${product.id}`)

    // Créer le prix récurrent mensuel
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: 'eur',
      recurring: {
        interval: 'month',
      },
      nickname: `${plan.name} — mensuel`,
      metadata: {
        plan_key: plan.key,
      },
    })

    console.log(`   ✅ Prix créé : ${price.id} (${plan.amount / 100}€/mois)\n`)

    priceIds[plan.envVar] = price.id
  }

  // Afficher les variables d'environnement à copier
  console.log('═'.repeat(60))
  console.log('✅ Setup terminé ! Copiez ces variables dans votre .env.local :')
  console.log('═'.repeat(60))
  console.log()
  for (const [key, value] of Object.entries(priceIds)) {
    console.log(`${key}=${value}`)
  }
  console.log()

  // Mise à jour automatique du .env.local si il existe
  const envPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8')

    for (const [key, value] of Object.entries(priceIds)) {
      const regex = new RegExp(`^${key}=.*$`, 'm')
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`)
      } else {
        envContent += `\n${key}=${value}`
      }
    }

    fs.writeFileSync(envPath, envContent)
    console.log(`📝 .env.local mis à jour automatiquement.`)
  } else {
    console.log(`ℹ️  Aucun .env.local trouvé. Créez-le et copiez les variables ci-dessus.`)
  }

  // Afficher aussi le webhook endpoint à configurer
  console.log()
  console.log('📌 Configurez maintenant le webhook Stripe :')
  console.log('   Dashboard Stripe → Developers → Webhooks → Add endpoint')
  console.log('   URL : https://votre-domaine.vercel.app/api/stripe/webhook')
  console.log('   Événements à écouter :')
  console.log('     - checkout.session.completed')
  console.log('     - customer.subscription.updated')
  console.log('     - customer.subscription.deleted')
  console.log('     - invoice.payment_failed')
  console.log()
  console.log('   Après création, copiez le webhook secret dans .env.local :')
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_...')
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message)
  process.exit(1)
})
