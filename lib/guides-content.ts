export interface GuideContent {
  slug: string
  title: string
  metaTitle: string
  metaDescription: string
  category: string
  readTime: string
  publishedAt: string
  intro: string
  sections: { heading: string; paragraphs: string[]; list?: string[] }[]
  conclusion: string
}

export const GUIDES: GuideContent[] = [
  {
    slug: 'mise-en-demeure-guide-complet',
    title: 'Mise en demeure : modèle, délais et effets juridiques — guide complet 2026',
    metaTitle: 'Mise en demeure : modèle légal et délais 2026 | RelanceFlow',
    metaDescription:
      "Tout sur la mise en demeure d'un client : forme obligatoire (art. 1344 C.civ.), délai légal, effets juridiques, modèle gratuit conforme et erreurs à éviter.",
    category: 'Procédure',
    readTime: '8 min',
    publishedAt: '2026-05-12',
    intro:
      "La mise en demeure est l'acte juridique qui marque la fin du recouvrement amiable et ouvre la voie aux procédures judiciaires. Contrairement à une relance commerciale, elle déclenche des effets de droit majeurs : intérêts moratoires automatiques, point de départ de la prescription, preuve probante pour le tribunal. Voici comment la rédiger correctement et l'utiliser sans erreur.",
    sections: [
      {
        heading: 'Qu\'est-ce qu\'une mise en demeure légalement ?',
        paragraphs: [
          "Depuis la réforme du droit des contrats de 2016, l'article 1344 du Code civil définit la mise en demeure comme une sommation formelle adressée à un débiteur de remplir son obligation. Sa portée dépasse celle d'une simple relance : elle constitue un acte juridique unilatéral qui produit des effets automatiques sans qu'aucune décision de justice ne soit nécessaire.",
          "Pour être valable, elle doit être adressée par écrit, comporter une demande non équivoque d'exécution, mentionner un délai raisonnable (généralement 8 jours), et faire référence à la créance précise concernée (numéro de facture, montant, date d'échéance).",
        ],
      },
      {
        heading: 'Les effets juridiques de la mise en demeure',
        paragraphs: ["Une mise en demeure correctement rédigée produit quatre effets principaux :"],
        list: [
          "Déclenchement des intérêts moratoires : à compter de la date de réception, les intérêts de retard courent automatiquement (taux BCE majoré de 10 points pour les créances B2B selon l'art. L441-10 du Code de commerce).",
          "Point de départ de la prescription de 5 ans pour les créances civiles et commerciales (art. 2224 C.civ.).",
          "Preuve probante en cas de procédure judiciaire : le juge constate que le créancier a tenté un règlement amiable avant d'engager une action.",
          "Indemnité forfaitaire de 40 € de plein droit pour frais de recouvrement (art. D441-5 C.com.) sur les créances entre professionnels.",
        ],
      },
      {
        heading: 'Forme et envoi : email ou lettre recommandée ?',
        paragraphs: [
          "La loi n'impose aucune forme particulière. Un email avec accusé de réception suffit juridiquement, mais la lettre recommandée avec accusé de réception (LRAR) reste la preuve la plus robuste devant un tribunal. Dans la pratique : envoyez d'abord par email pour la rapidité, puis doublez par LRAR si la créance dépasse quelques milliers d'euros.",
          "Notre conseil : si vous utilisez RelanceFlow, l'email de mise en demeure est généré automatiquement avec toutes les mentions légales requises et envoyé via Resend (preuve d'envoi horodatée). Vous pouvez ensuite télécharger le PDF pour l'envoyer en recommandé si nécessaire.",
        ],
      },
      {
        heading: 'Modèle de mise en demeure conforme',
        paragraphs: [
          "Voici la structure type d'une mise en demeure légalement valable :",
        ],
        list: [
          "Objet clair : « Mise en demeure de payer — Facture n°X »",
          "Identification précise des parties (créancier et débiteur, SIREN)",
          "Référence de la créance impayée (numéro, montant, date d'échéance)",
          "Rappel des relances antérieures déjà envoyées",
          "Demande explicite de paiement sous délai de 8 jours",
          "Mention des conséquences en cas de non-paiement (procédures judiciaires, frais à la charge du débiteur)",
          "Référence à l'article 1344 du Code civil pour la valeur juridique",
          "Date et signature",
        ],
      },
      {
        heading: 'Erreurs fréquentes à éviter',
        paragraphs: [
          "La principale erreur consiste à confondre relance et mise en demeure : un email cordial du type « pouvez-vous régulariser ? » ne constitue pas une mise en demeure et ne produit aucun effet juridique. Autre piège classique : ne pas mentionner explicitement le délai accordé (8 jours est standard) — sans délai, le débiteur peut contester la régularité de la sommation.",
          "Enfin, n'oubliez jamais de conserver une preuve de réception : sans cela, vous ne pourrez pas démontrer que la mise en demeure a bien été reçue, ce qui rendra inopposables les intérêts moratoires.",
        ],
      },
    ],
    conclusion:
      "La mise en demeure n'est pas un dernier recours symbolique : c'est un outil juridique puissant qui déclenche des intérêts et ouvre la porte à l'injonction de payer. Bien rédigée et bien envoyée, elle débloque la plupart des situations sans qu'il soit nécessaire d'aller en justice.",
  },
  {
    slug: 'recouvrement-amiable-vs-contentieux',
    title: 'Recouvrement amiable vs contentieux : quand passer le cap ?',
    metaTitle: 'Recouvrement amiable ou contentieux : quand agir ? | RelanceFlow',
    metaDescription:
      "Quand passer du recouvrement amiable à la procédure judiciaire ? Injonction de payer, référé-provision, procédure participative : comparaison des options.",
    category: 'Procédure',
    readTime: '9 min',
    publishedAt: '2026-04-22',
    intro:
      "Vos relances sont ignorées. La mise en demeure n'a rien donné. Vient le moment de la décision la plus difficile : poursuivre en justice ou abandonner ? Voici un cadre clair pour décider quand basculer et quelle procédure choisir selon le montant et le profil du débiteur.",
    sections: [
      {
        heading: 'Quand basculer du amiable au contentieux ?',
        paragraphs: [
          "La règle empirique : si 45 jours après la mise en demeure aucun paiement ni dialogue n'est intervenu, le passage au contentieux est justifié. Au-delà, plus vous attendez, plus le risque que le débiteur soit insolvable augmente.",
          "Trois signaux d'alerte doivent vous faire basculer immédiatement : silence radio persistant, changement de coordonnées du débiteur sans information, et toute mention publique de difficultés financières (procédure collective annoncée, par exemple).",
        ],
      },
      {
        heading: "L'injonction de payer : la voie rapide",
        paragraphs: [
          "L'injonction de payer (art. 1405 et suivants du Code de procédure civile) est la procédure la plus utilisée. Elle est rapide (4 à 8 semaines), peu coûteuse (35 € de frais de greffe au tribunal de commerce), et ne nécessite pas d'avocat sous 10 000 €.",
          "Limites : elle suppose une créance certaine, liquide et exigible (impossible si le débiteur conteste). Si le débiteur fait opposition dans le mois, l'affaire bascule en procédure classique au fond.",
        ],
      },
      {
        heading: 'Le référé-provision : quand c\'est urgent et incontestable',
        paragraphs: [
          "Le référé-provision permet d'obtenir le paiement d'une partie ou de la totalité de la créance en urgence (audience sous 4 à 6 semaines), à condition que la créance ne soit pas sérieusement contestable. Avantage : la décision est exécutoire immédiatement, sans attendre un jugement au fond.",
          "Coût : variable selon l'avocat (compter 800 à 1 500 € HT pour les créances jusqu'à 20 000 €).",
        ],
      },
      {
        heading: "La procédure participative : la voie négociée",
        paragraphs: [
          "Moins connue, la procédure participative (loi 2010-1609) permet aux parties de tenter un règlement amiable assisté par leurs avocats, avec valeur juridictionnelle. Si elle aboutit, l'accord a force exécutoire. Si elle échoue, la procédure judiciaire qui s'ensuit est accélérée.",
          "Recommandée quand le débiteur est de bonne foi mais en difficulté de trésorerie ponctuelle : permet d'aboutir à un échéancier sans rupture commerciale.",
        ],
      },
      {
        heading: 'Faut-il faire appel à une société de recouvrement ?',
        paragraphs: [
          "Les sociétés de recouvrement amiable prélèvent typiquement 10 à 30 % des sommes récupérées. Économiquement, c'est rentable au-delà de 5 000 € de créance. En dessous, le coût mange une grande partie de la créance.",
          "Pour les indépendants avec un volume modeste de factures impayées, un outil automatisé comme RelanceFlow (qui gère relances, mise en demeure et lien de paiement à un coût fixe mensuel) est généralement plus avantageux.",
        ],
      },
    ],
    conclusion:
      "Le recouvrement contentieux n'est pas une fatalité : bien préparé en amont avec un dossier solide (relances tracées, mise en demeure conforme, preuve de réception), il aboutit dans 80 % des cas à un règlement avant audience. La clé est la rigueur du process amiable.",
  },
  {
    slug: 'dso-tresorerie-comment-reduire',
    title: 'DSO : pourquoi 45 jours tuent votre trésorerie et comment le réduire',
    metaTitle: 'Réduire son DSO : 8 leviers concrets en 2026 | RelanceFlow',
    metaDescription:
      "DSO trop élevé ? 45 jours, c'est 12,5 % de votre CA annuel immobilisé. 8 leviers concrets pour passer sous 30 jours en moins de 6 mois.",
    category: 'Trésorerie',
    readTime: '7 min',
    publishedAt: '2026-03-14',
    intro:
      "Le DSO (Days Sales Outstanding) mesure le délai moyen entre l'émission d'une facture et son encaissement. Un DSO à 45 jours sur 100 000 € de CA mensuel représente 150 000 € immobilisés en permanence dans le besoin en fonds de roulement. La bonne nouvelle : il existe huit leviers actionnables qui font baisser le DSO de 15 à 25 jours en quelques mois.",
    sections: [
      {
        heading: 'Calculer son DSO correctement',
        paragraphs: [
          "Formule : DSO = (Encours clients TTC / CA TTC sur la période) × Nombre de jours de la période.",
          "Exemple : si vous avez 60 000 € de factures en attente fin juin et 360 000 € de CA sur les 6 premiers mois, votre DSO = (60 000 / 360 000) × 180 = 30 jours. Plus le chiffre est bas, plus vous encaissez vite.",
        ],
      },
      {
        heading: 'Lever 1 — Facturer le jour de la livraison',
        paragraphs: [
          "Chaque jour qui sépare la livraison de la facturation s'ajoute mécaniquement au DSO. Les indépendants qui facturent en fin de mois en groupe perdent en moyenne 12 jours de trésorerie. Facturez à chaque jalon atteint, pas en batch.",
        ],
      },
      {
        heading: 'Lever 2 — Inclure un lien de paiement en ligne',
        paragraphs: [
          "Une étude européenne de 2024 a montré que les factures incluant un lien de paiement direct (Stripe, PayPal) sont payées en moyenne 9 jours plus vite que celles sans. Le coût Stripe de 1,4 % + 0,25 € est largement compensé par le gain de trésorerie.",
        ],
      },
      {
        heading: 'Lever 3 — Automatiser les relances',
        paragraphs: [
          "70 % des factures impayées sont oubliées par négligence du client (pas par mauvaise foi). Une relance automatique à J+7, J+15 et J+30 récupère typiquement 80 % des impayés sans intervention humaine. C'est l'automatisme qui paye, pas l'agressivité.",
        ],
      },
      {
        heading: 'Lever 4 — Mentionner les pénalités sur la facture',
        paragraphs: [
          "L'article L441-9 du Code de commerce impose de mentionner les pénalités de retard sur toute facture B2B. Ce simple rappel a un effet dissuasif mesurable : les factures avec mention explicite sont payées 4 à 7 jours plus vite en moyenne.",
        ],
      },
      {
        heading: "Lever 5 — Raccourcir les délais contractuels",
        paragraphs: [
          "Le délai légal maximum est de 60 jours après émission ou 45 jours fin de mois. Mais rien ne vous oblige à proposer le maximum : un délai contractuel de 15 ou 30 jours est tout à fait légal et standard pour beaucoup d'indépendants. Modifiez vos CGV.",
        ],
      },
      {
        heading: "Lever 6 — Demander un acompte de 30 %",
        paragraphs: [
          "Sur les missions de plus de 3 000 €, un acompte à la commande de 30 % réduit le DSO d'environ 9 jours et filtre les clients à risque. Les mauvais payeurs refusent les acomptes : c'est un signal d'alerte précieux dès le départ.",
        ],
      },
      {
        heading: 'Lever 7 — Segmenter les clients par risque',
        paragraphs: [
          "Tous les clients ne se valent pas. Identifiez les 20 % qui génèrent 80 % de votre retard et appliquez-leur un traitement spécifique : escompte pour paiement comptant, demande de provision, refus de nouvelle commande tant que les anciennes sont impayées.",
        ],
      },
      {
        heading: "Lever 8 — Mesurer et publier le DSO en interne",
        paragraphs: [
          "On n'améliore que ce que l'on mesure. Un tableau de bord montrant l'évolution mensuelle du DSO (RelanceFlow le calcule automatiquement dans la page Statistiques) permet de détecter les dérives et de réagir avant qu'elles ne deviennent critiques.",
        ],
      },
    ],
    conclusion:
      "Passer un DSO de 45 à 30 jours sur 500 000 € de CA annuel libère 20 500 € de trésorerie de façon permanente. C'est un projet à très fort ROI : 3 mois d'effort pour des années de bénéfice.",
  },
]
