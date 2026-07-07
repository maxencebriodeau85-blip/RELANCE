import { Skeleton } from '@/components/ui/skeleton'

// Mirrors the real /dashboard/stats layout (title, KPI row, chart panels,
// activity lists) — this page runs several parallel Supabase queries
// server-side, so a matching skeleton avoids a blank screen on load.
export default function StatsLoading() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Skeleton className="h-7 w-40" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white px-5 py-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 rounded-xl border bg-white p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="lg:col-span-2 rounded-xl border bg-white p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}
