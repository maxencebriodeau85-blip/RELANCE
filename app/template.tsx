// Route transition — this file re-mounts on every navigation (unlike
// layout.tsx), so the enter animation replays on each route change.
// CSS-only (250ms fade + 8px slide), no framer-motion dependency; disabled
// automatically under prefers-reduced-motion via globals.css.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-enter">{children}</div>
}
