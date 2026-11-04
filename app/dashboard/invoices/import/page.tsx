'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { ImportPresets } from '@/components/dashboard/import-presets'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { requestJsonWithDeadline, RequestDeadlineError } from '@/lib/request-with-deadline'
import {
  parseCSVFile,
  applyColumnMapping,
  suggestColumnMapping,
  type CSVRow,
  type ColumnMapping,
  type ParsedInvoice,
  type ValidationError,
} from '@/lib/csv-parser'
import type { InvoiceInput } from '@/lib/invoice-input'
import { applyInvoiceActionInBatches } from '@/lib/invoice-actions'
import { formatEuro, formatDate } from '@/lib/metrics'
import { OFFER } from '@/lib/plans'
import {
  Upload,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  FileText,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Step = 'upload' | 'mapping' | 'preview' | 'success'
type Quota = { limit: number; remaining: number; trial: boolean }
type AbsentInvoice = {
  id: string
  invoice_number: string
  client_name: string
  updated_at: string
}

const REQUIRED_FIELDS: (keyof ColumnMapping)[] = [
  'client_name',
  'invoice_number',
  'amount',
  'due_date',
]

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  remaining_amount: 'Reste à payer (actualise les règlements)',
  client_name: 'Nom du client *',
  client_email: 'Email du client (facultatif)',
  invoice_number: 'N° de facture *',
  amount: 'Montant TTC *',
  due_date: "Date d'échéance *",
  issued_date: "Date d'émission",
  client_address: 'Adresse client',
  client_siren: 'SIREN client',
}

export default function ImportPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<CSVRow[]>([])
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [validInvoices, setValidInvoices] = useState<ParsedInvoice[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [importing, setImporting] = useState(false)
  const [summary, setSummary] = useState({
    imported: 0,
    updated: 0,
    unchanged: 0,
  })
  const [reviewed, setReviewed] = useState<InvoiceInput[]>([])
  const [reviewing, setReviewing] = useState(false)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [absent, setAbsent] = useState<AbsentInvoice[]>([])
  const [pauseAbsent, setPauseAbsent] = useState(true)
  const [pausedAbsent, setPausedAbsent] = useState<number | null>(null)
  const [pauseFailed, setPauseFailed] = useState(false)
  const [skippedRows, setSkippedRows] = useState(0)
  const [notImported, setNotImported] = useState(0)
  const requestLock = useRef(false)

  // Nouvelles factures au-delà du quota du mois : on importe les actualisations
  // et les premières nouvelles factures, dans l'ordre du fichier.
  const overQuota = quota !== null && summary.imported > quota.remaining
  const toImport = (() => {
    if (!overQuota || !quota) return reviewed
    let newCount = 0
    return reviewed.filter((invoice) => {
      if (invoice.expected_updated_at) return true
      newCount++
      return newCount <= quota.remaining
    })
  })()
  const droppedForQuota = reviewed.length - toImport.length

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setFileName(file.name)
      const result = await parseCSVFile(file)

      if (result.error) {
        toast({
          title: 'Erreur de lecture',
          description: result.error,
          variant: 'destructive',
        })
        return
      }

      if (result.headers.length === 0 || result.rows.length === 0) {
        toast({
          title: 'Fichier vide',
          description: 'Le fichier CSV ne contient pas de données.',
          variant: 'destructive',
        })
        return
      }

      setHeaders(result.headers)
      setRows(result.rows)
      const suggested = suggestColumnMapping(result.headers)
      setMapping(suggested)
      setStep('mapping')
    },
    [toast],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    onDropRejected: () =>
      toast({
        title: 'Fichier refusé',
        description: 'Choisissez un seul fichier CSV ou TXT de 5 Mo maximum.',
        variant: 'destructive',
      }),
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
  })

  const handleApplyMapping = async () => {
    if (requestLock.current) return
    const result = applyColumnMapping(rows, mapping as ColumnMapping)
    setValidInvoices(result.valid)
    setErrors(result.errors)
    setReviewed([])
    setSkippedRows(0)
    setStep('preview')
    if (result.errors.length || !result.valid.length) return
    await runPreview(result.valid)
  }

  /** Écarte les lignes en erreur et vérifie le reste du fichier. */
  const handleSkipErrors = async () => {
    if (requestLock.current || !validInvoices.length) return
    setSkippedRows((n) => n + errors.length)
    setErrors([])
    await runPreview(validInvoices)
  }

  const runPreview = async (candidates: ParsedInvoice[]) => {
    requestLock.current = true
    setReviewing(true)
    setQuota(null)
    setAbsent([])
    setPauseAbsent(true)
    try {
      const { response, data } = await requestJsonWithDeadline('/api/invoices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: candidates, preview: true }),
      })
      if (!response.ok) {
        const conflicted = new Set<number>((data.errors || []).map((e: ValidationError) => e.row))
        setValidInvoices(response.status === 409 ? candidates.filter((_, index) => !conflicted.has(index + 2)) : [])
        setErrors(
          data.errors || [
            {
              row: 1,
              field: 'import',
              message: data.error || 'Vérification impossible.',
            },
          ],
        )
        return
      }
      setReviewed(data.invoices)
      setValidInvoices(data.invoices)
      setSummary(data.summary)
      setQuota(data.quota ?? null)
      // Une ligne écartée pour erreur reste « dans le fichier » : on ne propose
      // pas de mettre sa facture en pause.
      const refsInFile = new Set(
        rows.map((row) => (row[mapping.invoice_number as string] || '').trim()),
      )
      setAbsent(
        ((data.absent || []) as AbsentInvoice[]).filter(
          (invoice) => !refsInFile.has(invoice.invoice_number.trim()),
        ),
      )
    } catch (error) {
      setErrors([
        {
          row: 1,
          field: 'import',
          message:
            error instanceof RequestDeadlineError
              ? 'La vérification prend trop de temps. Aucune confirmation envoyée. Revenez à la correspondance pour réessayer.'
              : 'Connexion interrompue pendant la vérification. Revenez à la correspondance pour réessayer.',
        },
      ])
    } finally {
      setReviewing(false)
      requestLock.current = false
    }
  }

  const handleImport = async () => {
    if (requestLock.current || !toImport.length || errors.length) return
    requestLock.current = true
    setImporting(true)
    setPausedAbsent(null)
    setPauseFailed(false)
    setNotImported(0)
    try {
      const { response, data } = await requestJsonWithDeadline('/api/invoices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices: toImport }),
      })


      if (!response.ok) {
        toast({
          title: "Erreur lors de l'import",
          description: data.error || 'Une erreur est survenue',
          variant: 'destructive',
        })
        return
      }

      setNotImported(droppedForQuota)
      setSummary({
        imported: data.imported ?? 0,
        updated: data.updated ?? 0,
        unchanged: data.unchanged ?? 0,
      })
      if (pauseAbsent && absent.length) {
        try {
          const { affected } = await applyInvoiceActionInBatches('pause', absent)
          setPausedAbsent(affected)
        } catch {
          setPauseFailed(true)
        }
      }
      router.refresh()
      setStep('success')
    } catch (error) {
      toast({
        title: error instanceof RequestDeadlineError ? 'Délai dépassé — résultat à vérifier' : 'Import non confirmé',
        description:
          'La connexion a été interrompue. Vérifiez vos factures avant de réessayer.',
        variant: 'destructive',
      })
    } finally {
      requestLock.current = false
      setImporting(false)
    }
  }

  const canProceedToPreview = REQUIRED_FIELDS.every((field) => mapping[field])

  return (
    <div>
      <Header
        title="Importer des factures"
        description="Importez vos factures et actualisez les soldes. Les nouvelles factures restent en pause jusqu’à votre validation."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Link>
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6 max-w-4xl min-w-0">
        {/* Progress steps */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(['upload', 'mapping', 'preview', 'success'] as Step[]).map(
            (s, i) => {
              const stepLabels = [
                'Fichier',
                'Correspondance',
                'Aperçu',
                'Terminé',
              ]
              const stepIndex = [
                'upload',
                'mapping',
                'preview',
                'success',
              ].indexOf(step)
              const currentIndex = i
              const isDone = currentIndex < stepIndex
              const isCurrent = s === step

              return (
                <div key={s} className="flex items-center">
                  {i > 0 && (
                    <div className="hidden sm:block w-8 h-px bg-gray-200 mx-1" />
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                      isCurrent
                        ? 'bg-brand-100 text-brand-700'
                        : isDone
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border flex items-center justify-center text-xs">
                        {i + 1}
                      </span>
                    )}
                    {stepLabels[i]}
                  </div>
                </div>
              )
            },
          )}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Sélectionner un fichier CSV</CardTitle>
              <CardDescription>
                Glissez-déposez votre fichier CSV ou cliquez pour le
                sélectionner. Taille max : 5 Mo, 500 lignes. Les exports Excel
                CSV UTF-8 et Windows sont acceptés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} aria-label="Choisir le fichier CSV à importer" />
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-base font-medium text-gray-700">
                  {isDragActive
                    ? 'Déposez le fichier ici...'
                    : 'Glissez votre CSV ici'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  ou cliquez pour parcourir vos fichiers
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Formats acceptés : .csv, .txt
                </p>
              </div>

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Format attendu</AlertTitle>
                <AlertDescription>
                  Votre CSV doit contenir au minimum : nom du client, numéro de
                  facture, montant et date d&apos;échéance. La première ligne
                  doit être les en-têtes de colonne.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-500">
                Pendant l’essai, vous pouvez ajouter {OFFER.trialInvoiceLimit}{' '}
                nouvelles factures par mois ; l’offre Fondateur en permet{' '}
                {OFFER.invoiceLimit}. Les actualisations de factures déjà
                suivies ne comptent pas. L’aperçu vous indique combien il vous
                en reste avant d’importer.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Column mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Correspondance des colonnes</CardTitle>
                <CardDescription>
                  Fichier : <strong>{fileName}</strong> · {rows.length} ligne(s)
                  détectée(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ImportPresets headers={headers} mapping={mapping} onApply={setMapping} />
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <div
                    key={field}
                    className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="sm:w-48 text-sm font-medium text-gray-700 shrink-0">
                      {label}
                    </div>
                    <Select
                      value={mapping[field as keyof ColumnMapping] || 'none'}
                      onValueChange={(val) =>
                        setMapping((m) => ({
                          ...m,
                          [field]: val === 'none' ? undefined : val,
                        }))
                      }
                    >
                      <SelectTrigger
                        aria-label={label}
                        className="w-full min-w-0 sm:flex-1"
                      >
                        <SelectValue placeholder="Sélectionner une colonne..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">– Ignorer –</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Preview of first rows */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Aperçu du fichier (5 premières lignes)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHead key={h} className="text-xs">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          {headers.map((h) => (
                            <TableCell
                              key={h}
                              className="text-xs max-w-[150px] truncate"
                            >
                              {row[h] || '–'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={handleApplyMapping}
                disabled={!canProceedToPreview}
              >
                Valider la correspondance
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' &&
          reviewed.some((invoice) => !invoice.client_email) && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Emails à compléter</AlertTitle>
              <AlertDescription>
                {reviewed.filter((invoice) => !invoice.client_email).length}{' '}
                facture(s) sans email seront importées. Vous pourrez compléter
                les adresses dans leur fiche avant de relancer.
              </AlertDescription>
            </Alert>
          )}
        {step === 'preview' && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>
                {reviewing
                  ? 'Vérification des factures existantes…'
                  : 'Import après validation'}
              </AlertTitle>
              <AlertDescription>
                {reviewed.length > 0 &&
                  `${summary.imported} nouvelle(s), ${summary.updated} facture(s) à actualiser, ${summary.unchanged} inchangée(s). `}
                {skippedRows > 0 &&
                  `${skippedRows} ligne(s) en erreur écartée(s). `}
                {quota && !overQuota && reviewed.length > 0 &&
                  `Ce mois-ci, vous pouvez encore ajouter ${quota.remaining} nouvelle(s) facture(s) sur ${quota.limit}. `}
                Un solde vide conserve les règlements existants ; zéro
                signifie intégralement réglé. Un email vide conserve l’adresse
                déjà connue. Les nouvelles factures restent en pause : vous
                activerez leurs relances depuis la liste, en une fois.
              </AlertDescription>
            </Alert>

            {/* Quota du mois */}
            {overQuota && quota && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {quota.remaining === 0
                    ? 'Plus de nouvelles factures possibles ce mois-ci'
                    : `Encore ${quota.remaining} nouvelle(s) facture(s) possible(s) ce mois-ci`}
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    Le fichier contient {summary.imported} nouvelle(s)
                    facture(s).{' '}
                    {quota.remaining > 0
                      ? `Seules les ${quota.remaining} première(s) du fichier seront ajoutées`
                      : 'Aucune ne sera ajoutée'}
                    {summary.updated + summary.unchanged > 0 &&
                      ', les factures déjà suivies seront bien actualisées'}
                    . {quota.trial
                      ? `L’essai est limité à ${quota.limit} nouvelles factures par mois.`
                      : `Votre offre comprend ${quota.limit} nouvelles factures par mois.`}
                  </p>
                  {quota.trial && (
                    <p>
                      <Link href="/subscription" className="font-medium underline">
                        Passer à l’offre Fondateur ({OFFER.invoiceLimit} factures par mois)
                      </Link>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Factures suivies absentes du fichier */}
            {absent.length > 0 && !reviewing && errors.length === 0 && (
              <Card className="border-amber-200">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {absent.length} facture(s) suivie(s) absente(s) de ce fichier
                  </CardTitle>
                  <CardDescription>
                    Leurs relances sont actives, mais elles ne figurent pas
                    dans le fichier. Si votre export liste toutes vos factures
                    impayées, elles ont probablement été réglées.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="text-sm text-gray-700 space-y-1">
                    {absent.slice(0, 5).map((invoice) => (
                      <li key={invoice.id}>
                        <span className="font-mono">{invoice.invoice_number}</span>{' '}
                        · {invoice.client_name}
                      </li>
                    ))}
                    {absent.length > 5 && (
                      <li className="text-gray-400">
                        ...et {absent.length - 5} autre(s)
                      </li>
                    )}
                  </ul>
                  <label className="flex items-start gap-2 text-sm font-medium text-gray-800">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={pauseAbsent}
                      onChange={(event) => setPauseAbsent(event.target.checked)}
                    />
                    Mettre leurs relances en pause après l’import (vous pourrez
                    les réactiver depuis la liste)
                  </label>
                </CardContent>
              </Card>
            )}
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700">
                        {validInvoices.length}
                      </div>
                      <div className="text-sm text-gray-500">
                        Facture(s) valides
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-700">
                        {errors.length}
                      </div>
                      <div className="text-sm text-gray-500">
                        Erreur(s) de validation
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{errors.length} erreur(s) détectée(s)</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 space-y-1 text-sm">
                    {errors.slice(0, 10).map((err, i) => (
                      <li key={i}>
                        Ligne {err.row} · <strong>{FIELD_LABELS[err.field as keyof ColumnMapping]?.replace(' *', '') || (err.field === 'import' ? 'Import' : 'Ligne')}</strong> :{' '}
                        {err.message}
                        {err.value !== undefined &&
                          ` (valeur : "${err.value}")`}
                      </li>
                    ))}
                    {errors.length > 10 && (
                      <li className="text-gray-500">
                        ...et {errors.length - 10} autre(s) erreur(s)
                      </li>
                    )}
                  </ul>
                  {validInvoices.length > 0 && !reviewing && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleSkipErrors}>
                        Ignorer ces lignes et continuer avec les{' '}
                        {validInvoices.length} autre(s)
                      </Button>
                      <span className="text-xs">
                        ou corrigez le fichier puis revenez à l’étape 1.
                      </span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Valid invoices preview */}
            {validInvoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Aperçu des factures à importer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>N° Facture</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Échéance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validInvoices.slice(0, 10).map((inv, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="text-sm font-medium">
                              {inv.client_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {inv.client_email || 'Email à compléter'}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {inv.invoice_number}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatEuro(inv.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(inv.due_date)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {validInvoices.length > 10 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center text-sm text-gray-400 py-2"
                          >
                            ...et {validInvoices.length - 10} autre(s)
                            facture(s)
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                disabled={reviewing || importing}
                onClick={() => setStep('mapping')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  !toImport.length ||
                  errors.length > 0 ||
                  reviewing ||
                  importing
                }
              >
                {importing
                  ? 'Import en cours...'
                  : `Importer ${reviewed.length ? toImport.length : validInvoices.length} facture(s)`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <Card>
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Import réussi !
                </h2>
                <p className="text-gray-500 mt-1">
                  {summary.imported} nouvelle(s) facture(s), {summary.updated}{' '}
                  solde(s) actualisé(s), {summary.unchanged} facture(s)
                  inchangée(s).
                </p>
                {notImported > 0 && (
                  <p className="text-sm text-amber-700 mt-2">
                    {notImported} nouvelle(s) facture(s) non ajoutée(s) :
                    quota du mois atteint.
                  </p>
                )}
                {pausedAbsent !== null && pausedAbsent > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Relances mises en pause pour {pausedAbsent} facture(s)
                    absente(s) du fichier.
                  </p>
                )}
                {pauseFailed && (
                  <p className="text-sm text-red-700 mt-2">
                    La mise en pause des factures absentes du fichier n’a pas
                    abouti. Vérifiez-les dans la liste avant le prochain envoi.
                  </p>
                )}
                {summary.imported > 0 && (
                  <p className="text-sm text-gray-600 mt-2">
                    Les nouvelles factures sont en pause. Dans la liste,
                    sélectionnez-les puis cliquez sur « Activer les relances ».
                  </p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Importer un autre fichier
                </Button>
                <Button asChild>
                  <Link href="/dashboard/invoices">Voir les factures</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
