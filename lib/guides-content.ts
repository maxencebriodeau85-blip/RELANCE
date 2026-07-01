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
  {
    slug: 'indemnite-forfaitaire-40-euros',
    title: "L'indemnité forfaitaire de 40 € : comment l'appliquer sans casser la relation client",
    metaTitle: "Indemnité forfaitaire 40 € : comment l'appliquer | RelanceFlow",
    metaDescription:
      "Depuis 2012, toute facture B2B impayée ouvre droit à 40 € d'indemnité forfaitaire de recouvrement. Comment la réclamer, comment la formuler, comment ne pas fâcher.",
    category: 'Droit commercial',
    readTime: '5 min',
    publishedAt: '2026-04-08',
    intro:
      "Le décret du 2 octobre 2012 a instauré l'indemnité forfaitaire de recouvrement de 40 € (art. D441-5 du Code de commerce). Cette somme est due de plein droit sur toute facture B2B impayée à l'échéance, en plus des pénalités de retard. Presque personne ne la réclame — par méconnaissance ou par peur d'abîmer la relation. Voici comment le faire proprement.",
    sections: [
      {
        heading: "Qui doit, qui reçoit, quand",
        paragraphs: [
          "L'indemnité de 40 € est due exclusivement dans les relations B2B (professionnel à professionnel). Elle ne s'applique pas aux clients particuliers.",
          "Elle est due dès le premier jour de retard, sans mise en demeure préalable, sans négociation. Le débiteur ne peut pas la refuser ni la négocier.",
          "Elle s'applique par facture, pas par débiteur. Si un client vous doit 5 factures échues, ce sont 5 × 40 € = 200 € qui s'ajoutent.",
        ],
      },
      {
        heading: "La mention légale obligatoire sur vos factures",
        paragraphs: [
          "L'article L441-9 du Code de commerce impose de mentionner l'indemnité sur toute facture B2B. Sans cette mention, vous pouvez toujours la réclamer, mais l'oubli fragilise votre position.",
        ],
        list: [
          "Formulation type : « Tout retard de paiement entraîne l'application de pénalités de retard au taux de la BCE majoré de 10 points, ainsi qu'une indemnité forfaitaire de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce). »",
          "À placer dans les mentions légales de la facture, généralement en pied de page.",
          "RelanceFlow ajoute automatiquement cette mention à chaque PDF de facture généré.",
        ],
      },
      {
        heading: "Comment la réclamer sans casser la relation",
        paragraphs: [
          "La règle : ne jamais la mentionner dans la première relance cordiale (J+7). C'est une escalade. Réservez-la à la deuxième ou troisième relance, quand le silence du client devient un signal.",
          "Formulation qui marche : « Conformément à l'article L441-10 du Code de commerce, une indemnité forfaitaire de 40 € par facture est due dès le premier jour de retard. Nous ne l'avons pas encore appliquée par égard pour notre relation, mais elle deviendra automatique si le règlement n'intervient pas sous 8 jours. »",
          "Effet observé : dans la majorité des cas, la simple mention de la loi débloque le paiement — vos clients ne veulent pas payer 40 € de plus pour rien.",
        ],
      },
      {
        heading: "Cas particuliers",
        paragraphs: [
          "Le débiteur est en procédure collective (redressement, liquidation) : l'indemnité de 40 € est due mais devient une créance chirographaire — vous la déclarez au mandataire mais son recouvrement effectif est incertain.",
          "Frais réels supérieurs à 40 € : l'article D441-5 permet de réclamer, en plus des 40 €, les frais de recouvrement réellement engagés (huissier, avocat, société de recouvrement) sur présentation de justificatifs.",
        ],
      },
    ],
    conclusion:
      "40 € par facture, ce n'est pas énorme sur une créance de 200 € — mais sur 10 factures oubliées, c'est 400 € de plus dans votre trésorerie sans effort supplémentaire. La loi est de votre côté ; il faut juste oser la citer.",
  },
  {
    slug: 'penalites-retard-calcul',
    title: 'Pénalités de retard légales : calcul, taux BCE et mise en œuvre en 2026',
    metaTitle: 'Pénalités de retard : calcul taux BCE +10 points | RelanceFlow',
    metaDescription:
      "Calcul exact des pénalités de retard B2B en France : taux BCE + 10 points (art. L441-10 C.com.), méthode, exemples chiffrés, comment les réclamer sans procédure judiciaire.",
    category: 'Droit commercial',
    readTime: '7 min',
    publishedAt: '2026-04-15',
    intro:
      "Les pénalités de retard sont dues automatiquement dès qu'une facture B2B est impayée à l'échéance. Le taux légal n'est pas anodin : taux BCE majoré de 10 points, soit environ 14,5 % annuel en 2026. Sur une facture de 5 000 € impayée 60 jours, ça fait 119 €. Voici comment les calculer proprement et les faire payer.",
    sections: [
      {
        heading: 'Le taux applicable en 2026',
        paragraphs: [
          "Le taux par défaut (art. L441-10 C.com.) est le taux de refinancement de la BCE au 1er janvier de l'année, majoré de 10 points de pourcentage.",
          "Au 1er janvier 2026 : taux BCE ≈ 4,5 % → taux légal des pénalités = 14,5 % annuel.",
          "Vos CGV peuvent prévoir un taux différent (souvent 3 × le taux d'intérêt légal, soit ≈ 12 % en 2026) mais jamais inférieur à 3 × le taux d'intérêt légal, plancher fixé par la loi.",
        ],
      },
      {
        heading: "La formule de calcul",
        paragraphs: [
          "Pénalités = Montant TTC × Taux annuel × (Nombre de jours de retard / 365)",
          "Exemple : facture de 5 000 € TTC, 60 jours de retard, taux 14,5 % → 5 000 × 0,145 × (60 / 365) = 119,18 €",
          "Le calcul se fait sur le montant TTC, pas HT. Et sur le nombre de jours réels, pas ouvrés. RelanceFlow inclut un calculateur public gratuit qui automatise tout ça.",
        ],
      },
      {
        heading: 'Point de départ des pénalités',
        paragraphs: [
          "Contrairement à ce que beaucoup croient, les pénalités courent dès le premier jour de retard, sans mise en demeure préalable. Le débiteur est en défaut par la seule échéance du terme (art. L441-10 al. 1).",
          "Pas besoin d'attendre 8 jours, 30 jours, ou d'envoyer un courrier recommandé pour que le compteur démarre. Il tourne dès J+1.",
        ],
      },
      {
        heading: 'La mention obligatoire sur la facture',
        paragraphs: [
          "L'article L441-9 impose de faire figurer les modalités de calcul des pénalités sur la facture elle-même. À défaut, vous risquez une amende administrative jusqu'à 75 000 € (personne physique) ou 375 000 € (personne morale).",
        ],
        list: [
          "« Pénalités de retard applicables en cas de non-paiement à l'échéance : taux d'intérêt appliqué par la BCE à son opération de refinancement la plus récente majoré de 10 points de pourcentage. »",
          "« Indemnité forfaitaire pour frais de recouvrement : 40 € (art. D441-5 C.com.). »",
          "Bonus : citer l'article L441-10 directement — ça donne un poids juridique immédiat quand vous relancez.",
        ],
      },
      {
        heading: 'Comment les réclamer',
        paragraphs: [
          "Les pénalités ne se réclament efficacement qu'à partir de la deuxième relance. Dans un email cordial, ça passe pour un accroc gratuit. Dans une relance ferme ou une mise en demeure, elles font partie du calcul du dû total.",
          "Format qui marche : présenter le détail — « Facture 1200 € + pénalités depuis le 15 mars (43 jours × 14,5 % / 365) = 20,49 € + indemnité forfaitaire 40 € = TOTAL 1260,49 € ».",
          "Le débiteur voit un calcul, pas une somme arbitraire. C'est incontestable et ça déclenche souvent le paiement immédiat de la facture principale (les 60 € de rab restent souvent négligés — mais c'est votre choix commercial).",
        ],
      },
    ],
    conclusion:
      "Réclamer les pénalités de retard, ce n'est pas être procédurier — c'est appliquer la loi. Le taux est punitif volontairement (14,5 %), pour dissuader le retard. Un client qui reçoit une facture avec « + 60 € de pénalités » calculées comprend très vite qu'il a intérêt à payer.",
  },
  {
    slug: 'conditions-generales-vente-recouvrement',
    title: 'CGV et recouvrement : les 5 clauses obligatoires qui vous protègent',
    metaTitle: 'CGV recouvrement : 5 clauses obligatoires 2026 | RelanceFlow',
    metaDescription:
      "5 clauses essentielles à faire figurer dans vos CGV pour recouvrer plus vite et plus sereinement : pénalités, réserve de propriété, résiliation, compétence, protection données.",
    category: 'Droit commercial',
    readTime: '6 min',
    publishedAt: '2026-03-28',
    intro:
      "Des CGV bien rédigées sont votre première ligne de défense en cas d'impayé. Elles définissent les règles du jeu et donnent une base juridique solide à vos relances. Sans elles, vous êtes réduit à invoquer le droit commun — plus faible, plus lent, plus contestable. Voici les 5 clauses non négociables.",
    sections: [
      {
        heading: '1. Pénalités de retard et indemnité forfaitaire',
        paragraphs: [
          "Contenu type : « Tout retard de paiement entraîne, de plein droit et sans mise en demeure préalable, l'application de pénalités de retard au taux de la BCE majoré de 10 points de pourcentage, ainsi qu'une indemnité forfaitaire de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce). »",
          "Sans cette mention explicite, vos relances perdent 50 % de leur poids juridique. Elle doit figurer dans vos CGV ET sur chaque facture émise.",
        ],
      },
      {
        heading: '2. Clause résolutoire',
        paragraphs: [
          "Elle vous permet de suspendre ou annuler unilatéralement la prestation en cas d'impayé, sans attendre une décision de justice.",
          "Contenu type : « En cas de non-paiement à l'échéance et 8 jours après une mise en demeure restée infructueuse, la présente convention pourra être résolue de plein droit, sans intervention judiciaire, à la seule initiative du prestataire. »",
          "Effet dissuasif majeur : le client sait qu'il perd son accès (à un logiciel, une prestation en cours, un abonnement) sans procédure. Ça accélère nettement les paiements.",
        ],
      },
      {
        heading: '3. Clause de réserve de propriété (pour les ventes de biens)',
        paragraphs: [
          "Si vous vendez des biens matériels (marchandises, matériel, matériaux), cette clause vous permet d'en rester propriétaire jusqu'au paiement intégral, même si le bien est déjà chez le client.",
          "Contenu type : « Les biens livrés demeurent la propriété exclusive du vendeur jusqu'au paiement intégral de leur prix par le client (art. L624-16 C.com.). »",
          "En cas de dépôt de bilan du client, vous pouvez revendiquer votre bien avant qu'il ne soit inclus dans la liquidation. Sans cette clause : vous devenez un créancier ordinaire, rang très bas.",
        ],
      },
      {
        heading: '4. Compétence juridictionnelle',
        paragraphs: [
          "Fixez à l'avance le tribunal compétent en cas de litige. Sans clause, la loi désigne le tribunal du siège du défendeur — souvent loin de chez vous, avec des coûts et délais aggravés.",
          "Contenu type : « En cas de litige, compétence exclusive est attribuée au Tribunal de commerce de [votre ville de rattachement]. »",
          "Attention : cette clause n'est valable qu'entre commerçants (B2B). Elle est nulle contre un consommateur.",
        ],
      },
      {
        heading: '5. Protection des données (RGPD)',
        paragraphs: [
          "Depuis 2018, vos CGV doivent mentionner comment vous traitez les données personnelles de vos clients (contacts, coordonnées, historique) — même en B2B, dès qu'il y a des personnes physiques.",
          "Contenu type : « Le prestataire collecte et traite les données du client conformément au RGPD. Les données sont conservées pour la durée de la relation contractuelle + 5 ans (obligations comptables). Droits d'accès, rectification et opposition exercés à [email]. »",
          "L'absence de mention peut déclencher une plainte CNIL — beaucoup plus coûteux que 5 minutes de rédaction.",
        ],
      },
    ],
    conclusion:
      "Vos CGV ne sont pas un document légal poussiéreux : c'est votre bouclier juridique. Ces 5 clauses, correctement formulées, transforment vos relances d'un « s'il vous plaît » en un rappel de règles convenues. Faites-les relire par un avocat une fois — pas par CGV Générateur d'un site gratuit.",
  },
  {
    slug: 'injonction-payer-mode-emploi',
    title: "Injonction de payer : mode d'emploi complet (Cerfa, délais, coûts) — 2026",
    metaTitle: "Injonction de payer 2026 : Cerfa, délais, coûts | RelanceFlow",
    metaDescription:
      "Guide pas à pas pour obtenir une injonction de payer sans avocat : compétence tribunal, formulaire Cerfa 12946, délais réels, coûts, exécution du titre.",
    category: 'Procédure',
    readTime: '10 min',
    publishedAt: '2026-04-02',
    intro:
      "L'injonction de payer est la procédure de recouvrement la plus rapide et la moins coûteuse du droit français. Elle permet d'obtenir un titre exécutoire (l'équivalent d'un jugement) en 4 à 8 semaines, sans avocat sous 10 000 €, pour 35 € de frais. Voici comment la déclencher pas à pas.",
    sections: [
      {
        heading: "Quand utiliser l'injonction de payer",
        paragraphs: [
          "Trois conditions cumulatives (art. 1405 CPC) : la créance doit être certaine (existence non contestable), liquide (montant chiffré précisément), et exigible (échéance dépassée).",
          "Cas idéal : une facture émise, échue, avec accusé de réception ou preuve de livraison, et un client qui ne conteste pas mais qui ne paie pas. Si le client conteste la créance, l'injonction n'est pas la bonne voie — il fera opposition et vous basculerez en procédure au fond, plus longue.",
        ],
      },
      {
        heading: 'Compétence : où déposer',
        paragraphs: [
          "Pour une créance B2B (commerçant → commerçant) : Tribunal de commerce du lieu de résidence du débiteur, ou du lieu d'exécution du contrat si votre CGV le prévoit.",
          "Pour une créance civile ou mixte : Tribunal judiciaire (anciennement TI/TGI) du lieu de résidence du débiteur.",
          "Une erreur de compétence = requête rejetée et à refaire. Vérifiez d'abord sur le site du greffe.",
        ],
      },
      {
        heading: 'Le formulaire Cerfa',
        paragraphs: [
          "Formulaire n° 12946*02 (« Requête aux fins d'injonction de payer ») téléchargeable gratuitement sur service-public.fr.",
        ],
        list: [
          "Identité complète du créancier (vous) : nom, SIREN, adresse, forme juridique",
          "Identité complète du débiteur : nom/raison sociale, SIREN, adresse — indispensable, une erreur = rejet",
          "Objet et montant précis de la créance (principal + intérêts + indemnité 40 € + frais éventuels)",
          "Fondement juridique : « facture n°X du [date], échue le [date], non payée »",
          "Liste des pièces jointes annexées",
        ],
      },
      {
        heading: 'Les pièces à joindre',
        paragraphs: [
          "La qualité de votre dossier détermine directement le taux d'acceptation.",
        ],
        list: [
          "Copie de la facture impayée (avec mention des pénalités de retard)",
          "Preuve de livraison ou d'exécution (bon de livraison signé, PV de recette, mail de validation)",
          "CGV signées ou acceptées par le client (bon de commande accepté, email de confirmation)",
          "Copie des relances envoyées (les emails horodatés RelanceFlow font parfaitement l'affaire)",
          "Mise en demeure et accusé de réception (recommandé conseillé pour renforcer)",
        ],
      },
      {
        heading: 'Délais réels et coûts',
        paragraphs: [
          "Coût : 35,21 € de frais de greffe au Tribunal de commerce (gratuit au Tribunal judiciaire pour les particuliers).",
          "Délai typique jusqu'à obtention de l'ordonnance : 4 à 8 semaines selon l'engorgement du tribunal.",
          "Si le juge accepte, vous recevez une « ordonnance portant injonction de payer ». Vous avez alors 6 mois pour la faire signifier au débiteur par huissier (compter 50-150 €).",
        ],
      },
      {
        heading: "Après la signification : opposition ou exécution",
        paragraphs: [
          "À compter de la signification, le débiteur a 1 mois pour former opposition. S'il oppose : l'affaire est renvoyée en procédure ordinaire au fond, plus longue, où il pourra contester.",
          "S'il n'oppose pas dans le délai : vous demandez au greffe l'apposition de la formule exécutoire. L'ordonnance devient alors un titre exécutoire — équivalent à un jugement — que vous pouvez faire exécuter par huissier (saisie sur compte bancaire, saisie de biens, etc.).",
        ],
      },
    ],
    conclusion:
      "L'injonction de payer est sous-utilisée par les indépendants qui pensent (à tort) qu'il faut un avocat et beaucoup de temps. C'est le contraire : rapide, peu chère, et redoutablement efficace sur les créances non contestées. Si vous avez un impayé de plus de 500 € et un dossier solide, faites-la. Le seul risque est de ne pas la faire.",
  },
  {
    slug: 'prescription-creances-commerciales',
    title: 'Prescription des créances commerciales : les délais à ne surtout pas rater',
    metaTitle: 'Prescription créances commerciales : 2, 5, 10 ans | RelanceFlow',
    metaDescription:
      "Délais de prescription des créances : 5 ans commerciales, 2 ans consommateurs, cas particuliers. Comment interrompre la prescription pour ne rien perdre.",
    category: 'Droit commercial',
    readTime: '5 min',
    publishedAt: '2026-03-20',
    intro:
      "Une créance non recouvrée n'est pas éternellement récupérable : elle s'éteint par prescription. Passer à côté du délai, c'est perdre définitivement le droit d'exiger le paiement — même si la dette est incontestable. Voici les délais à connaître et comment stopper le compteur avant qu'il ne soit trop tard.",
    sections: [
      {
        heading: 'Le délai de droit commun : 5 ans',
        paragraphs: [
          "L'article 2224 du Code civil fixe le délai de droit commun à 5 ans à compter du jour où le titulaire d'un droit a connu ou aurait dû connaître les faits lui permettant de l'exercer.",
          "Pour une facture impayée : le compteur démarre à la date d'exigibilité (date d'échéance). Une facture émise le 1er janvier 2026 avec échéance le 31 janvier 2026 se prescrit le 31 janvier 2031.",
        ],
      },
      {
        heading: 'Le délai raccourci : 2 ans en B2C',
        paragraphs: [
          "L'article L218-2 du Code de la consommation raccourcit le délai à 2 ans pour les biens ou services fournis à un consommateur.",
          "Concrètement : si votre client est un particulier (pas une entreprise), vous n'avez que 2 ans à partir de l'échéance pour agir. Passé ce délai, la créance est éteinte, même si le client reconnaît la devoir.",
          "Ce délai concerne : coaching, formation, prestations de service, ventes en ligne, abonnements, etc. dès que le destinataire est un particulier.",
        ],
      },
      {
        heading: 'Les cas particuliers plus courts',
        paragraphs: [
          "Certaines créances ont des délais spécifiques encore plus courts. Vérifiez toujours si votre secteur en fait partie.",
        ],
        list: [
          "Honoraires d'avocats : 5 ans (art. 2225 C.civ.)",
          "Factures d'énergie (électricité/gaz) : 2 ans pour les particuliers",
          "Factures de télécommunications : 1 an (L34-2 CPCE)",
          "Créances hôtelières / restauration : 6 mois",
          "Salaires impayés : 3 ans",
        ],
      },
      {
        heading: 'Interrompre la prescription',
        paragraphs: [
          "Bonne nouvelle : le compteur peut être remis à zéro (interrompu) par certains actes, qui repartent alors pour un nouveau délai complet.",
        ],
        list: [
          "Reconnaissance de dette écrite du débiteur (email, courrier, aveu)",
          "Assignation en justice ou requête en injonction de payer",
          "Commandement de payer par huissier",
          "Demande en justice, même incomplète ou devant un tribunal incompétent",
          "Attention : une simple relance ou mise en demeure n'interrompt PAS la prescription en droit commun. Elle la SUSPEND parfois, mais ne la remet pas à zéro.",
        ],
      },
      {
        heading: 'La suspension de prescription',
        paragraphs: [
          "Différent de l'interruption : la suspension arrête le compteur, sans repartir de zéro. Elle joue notamment pendant une médiation conventionnelle ou une procédure participative.",
          "Cas fréquent : un client vous demande un délai de paiement par écrit. Ce n'est pas une reconnaissance de dette au sens strict, mais ça peut être qualifié de suspension si les termes sont clairs (« je m'engage à payer avant le [date] »).",
        ],
      },
    ],
    conclusion:
      "Ne laissez jamais une créance atteindre 4 ans et 11 mois. Si vous approchez du délai de prescription et que le client ne paie pas : déclenchez immédiatement une injonction de payer, même minimaliste — le seul dépôt de la requête interrompt la prescription et vous donne 5 ans de plus.",
  },
  {
    slug: 'relance-clients-ton-progressif',
    title: "Comment relancer sans abîmer la relation : le protocole en 4 étapes",
    metaTitle: 'Relance client : protocole 4 étapes efficace | RelanceFlow',
    metaDescription:
      "Le protocole de relance progressive qui récupère vos créances sans détruire vos relations commerciales : cordial → ferme → pré-contentieux → mise en demeure.",
    category: 'Pratique',
    readTime: '5 min',
    publishedAt: '2026-03-10',
    intro:
      "Trop doux, vous passez pour le banquier gratuit du client. Trop agressif, vous perdez le contrat pour 800 € de retard. Le protocole progressif — utilisé par les credit managers depuis des décennies — trouve le point d'équilibre : fermeté croissante, pied de porte permanent, chaque étape justifiée par l'échec de la précédente. Voici les 4 palettes.",
    sections: [
      {
        heading: 'Étape 1 — Rappel cordial (J+7 après échéance)',
        paragraphs: [
          "Objectif : réveiller un oubli, pas confronter. 70 % des impayés sont récupérés à ce stade.",
          "Ton : « Je pars du principe que c'est un oubli ». Aucune mention de pénalités. Le client garde la face.",
          "Formulation qui marche : « Bonjour [X], petit rappel amiable pour la facture [N°] de [montant], échue le [date]. Il est possible que le règlement soit déjà en cours — si c'est le cas, ignorez ce message. Sinon, un coup de fil ou un email me rassure. Cordialement. »",
        ],
      },
      {
        heading: 'Étape 2 — Relance ferme (J+15)',
        paragraphs: [
          "Objectif : signaler que l'oubli a assez duré. Introduire discrètement la loi.",
          "Ton : professionnel, précis. Rappel des faits, rappel des délais légaux, demande claire.",
          "Formulation qui marche : « Sans nouvelle de votre part suite à ma relance du [date], je me permets de revenir vers vous. La facture [N°] est désormais en retard de 15 jours. Conformément à l'art. L441-10 C.com., des pénalités de retard courent depuis le [date]. Merci de régulariser sous 8 jours ou de m'indiquer une date de règlement. »",
        ],
      },
      {
        heading: 'Étape 3 — Pré-contentieux (J+30)',
        paragraphs: [
          "Objectif : annoncer explicitement l'escalade. C'est le dernier avertissement amiable avant procédure.",
          "Ton : formel, factuel, avec échéance non négociable. Aucune menace, juste l'annonce de la suite mécanique.",
          "Formulation qui marche : « Malgré mes relances des [dates], la facture [N°] reste impayée. Je vous informe que sans règlement de [montant total incluant pénalités et indemnité 40 €] avant le [date + 8 jours], je serai contraint d'engager une procédure d'injonction de payer devant le tribunal compétent, avec mise à votre charge des frais et dépens. »",
        ],
      },
      {
        heading: 'Étape 4 — Mise en demeure formelle (J+45+)',
        paragraphs: [
          "Objectif : acte juridique qui déclenche les effets légaux (intérêts moratoires officiels, preuve devant tribunal).",
          "Forme : email + doublage par lettre recommandée avec accusé de réception (LRAR). Le recommandé n'est pas obligatoire mais renforce considérablement votre dossier.",
          "Contenu : citer explicitement « MISE EN DEMEURE » et l'article 1344 du Code civil. Voir le guide dédié pour le modèle exact.",
          "À ce stade, si le client ne répond pas ou refuse, le passage au contentieux est justifié et documenté.",
        ],
      },
      {
        heading: 'Les 3 erreurs à ne surtout pas commettre',
        paragraphs: [
          "1. Sauter des étapes. Une mise en demeure envoyée directement sans les relances préalables perd une partie de sa force probante devant le tribunal.",
          "2. Menacer sans exécuter. Si vous annoncez une procédure judiciaire à J+30 et que vous n'agissez pas, le client apprend que vos menaces sont creuses. Vos prochaines relances perdent tout poids.",
          "3. Personnaliser au négatif. Jamais d'attaque personnelle, jamais de reproche sur la personne. Toujours factuel : « la facture n'est pas réglée », pas « vous êtes mauvais payeur ».",
        ],
      },
    ],
    conclusion:
      "Le protocole en 4 étapes marche parce qu'il combine la patience commerciale et la rigueur juridique. Chaque relance est indépendante ET s'appuie sur la précédente. RelanceFlow automatise tout ce protocole avec des templates ajustables — vous conservez le contrôle du ton, la mécanique tourne toute seule.",
  },
  {
    slug: 'rapport-banquier-poste-client',
    title: "Comment présenter votre poste client à votre banquier pour décrocher une ligne de trésorerie",
    metaTitle: 'Poste client & banquier : le rapport qui décroche un prêt | RelanceFlow',
    metaDescription:
      "Une balance âgée saine et un DSO maîtrisé sont vos meilleurs arguments pour négocier une ligne de trésorerie. Comment structurer le rapport que votre banquier veut voir.",
    category: 'Trésorerie',
    readTime: '7 min',
    publishedAt: '2026-04-20',
    intro:
      "Votre banquier ne prête pas sur la promesse d'un CA futur — il prête sur la qualité de vos encours actuels. Un poste client bien géré, avec un DSO maîtrisé et une balance âgée propre, vaut plus qu'un business plan à 3 ans. Voici comment présenter cette donnée pour transformer une demande hésitante en accord signé.",
    sections: [
      {
        heading: 'Ce que le banquier regarde vraiment',
        paragraphs: [
          "Contrairement à ce que vous pensez, le banquier ne juge pas vos ventes futures — il évalue votre capacité à transformer ces ventes en cash rapidement. Trois indicateurs clés :",
        ],
        list: [
          "DSO (Days Sales Outstanding) : plus il est bas, mieux c'est. Sous 30 jours = excellent, 30-45 = bon, >60 = préoccupant",
          "Pourcentage de créances en retard : la part de votre encours qui dépasse l'échéance. Sous 10 % = confiance, >25 % = signal d'alarme",
          "Ancienneté maximale d'un impayé : si vous avez une créance de plus de 90 jours dans votre balance, le banquier vous demandera pourquoi",
        ],
      },
      {
        heading: "La balance âgée : le document central",
        paragraphs: [
          "La balance âgée décompose votre encours client par tranches d'ancienneté : à échoir, 0-30 jours, 30-60, 60-90, +90.",
          "Format attendu par le banquier : un tableau montrant pour chaque tranche le montant total, le nombre de factures, et idéalement les top 3 clients concernés.",
          "RelanceFlow calcule automatiquement cette balance dans la page Statistiques → Aging buckets. Exportable en un clic pour la joindre à votre dossier.",
        ],
      },
      {
        heading: "Le rapport type qui rassure",
        paragraphs: [
          "Une structure éprouvée pour votre annexe bancaire (2-3 pages max) :",
        ],
        list: [
          "Page 1 : Résumé exécutif — CA trailing 12 mois, DSO actuel + évolution 12 mois, taux de créances en retard, taux de recouvrement effectif",
          "Page 2 : Balance âgée détaillée + top 10 clients par encours",
          "Page 3 : Politique de recouvrement — cycle de relances (J+7/15/30/45), outils utilisés, procédure contentieuse déclenchée à quel seuil",
        ],
      },
      {
        heading: "Chiffres qui déclenchent un accord",
        paragraphs: [
          "Le banquier veut vérifier que vous ne bricolez pas. Les fourchettes rassurantes en 2026 pour un indépendant / TPE :",
        ],
        list: [
          "DSO < 40 jours",
          "Créances en retard < 15 % de l'encours total",
          "Aucune facture > 90 jours (ou justification claire : litige, procédure en cours)",
          "Ratio recouvrement effectif > 95 % (part du CA facturé effectivement encaissé sur 12 mois)",
          "Politique de relance formalisée (protocole écrit + outil de suivi)",
        ],
      },
      {
        heading: "Les 3 arguments qui font pencher la décision",
        paragraphs: [
          "1. « Nous avons automatisé nos relances — voici notre DSO qui est passé de X à Y en 6 mois. » Le progrès observable vaut plus qu'un chiffre statique.",
          "2. « Voici notre procédure écrite en cas d'impayé au-delà de 30 jours. » Le banquier voit que vous ne subissez pas — vous pilotez.",
          "3. « Nos 5 plus gros clients représentent Z % du CA et payent en moyenne à N jours. » La dépendance client + comportement de paiement des majeurs = deux paramètres critiques pour lui.",
        ],
      },
    ],
    conclusion:
      "Un banquier qui hésite entre 2 dossiers avec le même CA choisira celui qui présente une gestion de trésorerie explicite et documentée. La différence ne se joue pas sur le chiffre d'affaires — elle se joue sur ce que vous en encaissez, à quelle vitesse, et avec quelle discipline. La balance âgée saine, c'est votre meilleur CV bancaire.",
  },
]
