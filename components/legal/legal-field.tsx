/** Affiche une information légale, ou « à renseigner » si elle manque encore. */
export function LegalField({ value }: { value: string | null | undefined }) {
  if (value) return <>{value}</>
  return <span className="font-medium text-[#8c3f20]">[à renseigner]</span>
}

/** Lien email de contact, ou lien vers le formulaire si aucune adresse n'est configurée. */
export function ContactLink({ email }: { email: string | null }) {
  if (email) return <a href={`mailto:${email}`}>{email}</a>
  return <a href="/contact">formulaire de contact</a>
}
