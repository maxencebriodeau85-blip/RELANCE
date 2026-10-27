'use client'
import { useState } from 'react'
import { Database, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// Référence littérale : seule une variable NEXT_PUBLIC_ écrite en entier est
// injectée côté navigateur.
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null

export function AccountData({ accountEmail }: { accountEmail: string | null }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function exportData() {
    setBusy(true)
    setError('')
    setDone(false)
    try {
      const response = await fetch('/api/account/export', { cache: 'no-store' })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || 'Export impossible. Réessayez dans un instant.')
      }
      const blob = await response.blob()
      const name = /filename="([^"]+)"/.exec(response.headers.get('content-disposition') || '')?.[1] || 'encair-mes-donnees.json'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export impossible.')
    } finally {
      setBusy(false)
    }
  }

  const subject = encodeURIComponent('Suppression de mon compte Encair')
  const body = encodeURIComponent(
    `Bonjour,\n\nJe demande la suppression de mon compte Encair${accountEmail ? ` (${accountEmail})` : ''} et de toutes ses données.\n\nMerci.`,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Vos données
        </CardTitle>
        <CardDescription>
          Récupérez tout ce que contient votre compte, ou demandez sa suppression.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <Button type="button" variant="outline" onClick={exportData} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {busy ? 'Préparation de l’export…' : 'Exporter toutes mes données'}
          </Button>
          <p className="text-xs text-gray-500">
            Un fichier JSON avec votre profil, vos factures, l’historique des relances, vos modèles,
            scénarios et formats d’import. Les secrets (clés, jetons) n’y figurent pas.
          </p>
          {done && (
            <p role="status" className="text-xs text-green-700">
              Export téléchargé.
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
        <div className="rounded-lg border bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-800">Supprimer votre compte</p>
          <p>
            {CONTACT ? (
              <>
                Écrivez à{' '}
                <a className="underline" href={`mailto:${CONTACT}?subject=${subject}&body=${body}`}>
                  {CONTACT}
                </a>{' '}
                depuis l’adresse de votre compte.
              </>
            ) : (
              <>Écrivez-nous depuis la page Contact, avec l’adresse de votre compte.</>
            )}{' '}
            Nous résilions d’abord l’abonnement éventuel, puis supprimons le compte et toutes ses
            données sous 30 jours. Pensez à exporter vos données avant. Les factures d’abonnement
            restent conservées 10 ans, comme la loi l’impose.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
