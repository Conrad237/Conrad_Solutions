/**
 * ============================================================================
 * CONRAD SOLUTIONS — FICHIER DE CONFIGURATION CENTRALISÉ (config/constants.ts)
 * ============================================================================
 * Modifiez ces valeurs pour ajuster instantanément les tarifs par défaut,
 * le forfait mensuel Eau (Forage), le prix du kWh (ENEO), le mot de passe maître
 * et les informations du bailleur principal.
 * ============================================================================
 */

// 1. TARIFS LOCATIFS MENSUELS PAR DÉFAUT (en FCFA / mois)
export const DEFAULT_ROOM_PRICE = 32000; // Tarif de base d'une Chambre (CH) : 32 000 FCFA / mois
export const DEFAULT_STUDIO_PRICE = 50000; // Tarif de base d'un Studio (ST) : 50 000 FCFA / mois
export const DEFAULT_APARTMENT_PRICE = 90000; // Tarif de base d'un Appartement (T2/T3) : 90 000 FCFA / mois
export const DEFAULT_SHOP_PRICE = 65000; // Tarif de base d'une Boutique / Local Commercial : 65 000 FCFA / mois
export const DEFAULT_WAREHOUSE_PRICE = 100000; // Tarif de base d'un Magasin : 100 000 FCFA / mois

// 2. FORFAIT MENSUEL EAU (FORAGE SANS COMPTEUR) & TARIFS ÉLECTRICITÉ (ENEO)
export const DEFAULT_WATER_FLAT_FEE = 2000; // Forfait mensuel eau par défaut : 2 000 FCFA / mois
export const REDUCED_WATER_FLAT_FEE = 1500; // Forfait mensuel eau réduit sélectionnable : 1 500 FCFA / mois
export const DEFAULT_WATER_M3_PRICE = 500; // Conservé pour rétrocompatibilité
export const DEFAULT_ELECTRICITY_KWH_PRICE = 110; // Tarif moyen du kWh ENEO : 110 FCFA / kWh
export const DEFAULT_ELECTRICITY_FLAT_FEE = 5000; // Forfait mensuel ENEO par défaut : 5 000 FCFA

// 3. SEUIL D'ALERTE PRÉVENTIVE DE COUVERTURE LOCATIVE (3 MOIS)
export const PREVENTIVE_ALERT_MONTHS_THRESHOLD = 3; // Alerte dès qu'il reste <= 3 mois payés d'avance

// 4. RÈGLE INDICATIVE DE CAUTION & AVANCES À L'ENTRÉE
export const STANDARD_DEPOSIT_MONTHS = 1; // 1 mois de caution
export const STANDARD_ADVANCE_MONTHS = 2; // 2 mois d'avance à l'entrée

// 5. SÉCURITÉ & ACCÈS PROPRIÉTAIRE (MOT DE PASSE MAÎTRE)
export const MASTER_OWNER_ID = 'proprietaire.moro@conrad-solutions.cm';
export const MASTER_OWNER_PASSWORD = 'Joël Brian';

// 6. COORDONNÉES DU BAILLEUR & DE LA MARQUE (CONRAD SOLUTIONS)
export const BRAND_CONFIG = {
  companyName: 'Conrad Solutions',
  tagline: 'PropTech SaaS — Gestion de Flotte Immobilière',
  version: '2.2.0 Production (Vercel Auto-Update)',
};

export const DEFAULT_LANDLORD_CONFIG = {
  ownerName: 'M. Moro (Propriétaire Principal)',
  residenceName: 'Résidence Moro',
  city: 'Yaoundé, Cameroun',
  neighborhood: 'Quartier Universitaire & Résidentiel',
  phone: '+237 699 00 11 22',
  whatsappPhone: '237699001122',
  orangeMoneyNumber: '699 00 11 22 (M. Moro)',
  mtnMomoNumber: '677 00 11 22 (M. Moro)',
  email: MASTER_OWNER_ID,
  currency: 'FCFA',
  alertDaysBeforeDue: 5,
};

// 7. RÈGLEMENT INTÉRIEUR OFFICIEL DE LA CITÉ / RÉSIDENCE
export const RESIDENCE_INTERNAL_RULES = {
  title: 'Règlement Intérieur Officiel de la Cité — Résidence Moro',
  subtitle: 'Charte de bonne cohabitation, d’hygiène, de sécurité et de règlement des charges',
  articles: [
    {
      title: 'Article 1 — Paiement du Loyer et des Charges',
      body: 'Le loyer est payable d’avance. Le forfait mensuel d’eau (Forage : 2 000 FCFA ou 1 500 FCFA selon logement) et la consommation électrique individuelle (ENEO) doivent être réglés dans les délais convenus.',
    },
    {
      title: 'Article 2 — Préavis & Alerte Préventive à 3 Mois',
      body: 'Une alerte préventive est adressée lorsqu’il reste 3 mois ou moins de loyer couvert afin de planifier sereinement le renouvellement ou de notifier un éventuel préavis de départ.',
    },
    {
      title: 'Article 3 — Tranquillité & Voisinage',
      body: 'Le calme absolu est exigé dans les couloirs, escaliers et espaces communs, particulièrement entre 22h00 et 06h00. Les nuisances sonores sont strictement interdites.',
    },
    {
      title: 'Article 4 — Propreté & Entretien des Parties Communes',
      body: 'Chaque locataire veille à la propreté devant sa porte et dans les parties communes. Il est interdit de jeter des détritus dans la cour ou d’obstruer les canalisations.',
    },
    {
      title: 'Article 5 — Sécurité & Installations Techniques',
      body: 'Toute modification électrique ou de plomberie sans l’accord préalable du Bailleur est formellement interdite. Le portail principal doit être maintenu fermé aux heures nocturnes.',
    },
    {
      title: 'Article 6 — Interdiction de Sous-location',
      body: 'La sous-location totale ou partielle du logement est strictement interdite sans autorisation écrite du Propriétaire.',
    },
  ],
  footer:
    'Tout manquement grave au présent règlement intérieur pourra entraîner la non-reconduction ou la résiliation du bail. Merci pour votre civisme.',
};

// 8. PALETTE DE COULEURS OFFICIELLE ("BLEU FIN & SOBRE" + INDICATEURS UNIVERSELS)
export const THEME_COLORS = {
  deepSlateBlue: '#0F172A',
  royalCobalt: '#1E3A8A',
  accentBlue: '#2563EB',
  softBackground: '#F8FAFC',
  statusPaid: '#10B981', // Vert Émeraude = À jour / Avance
  statusPartial: '#F59E0B', // Orange Ambre = Arrangement / Paiement partiel
  statusLate: '#EF4444', // Rouge Corail = Retard / Impayé
  statusVacant: '#64748B', // Gris Ardoise = Logement vacant
} as const;

// 9. TOPOLOGIE ARCHITECTURALE EXACTE DE LA "RÉSIDENCE MORO" (35 UNITÉS)
export const RESIDENCE_MORO_TOPOLOGY = [
  {
    floor: 0,
    label: 'Rez-de-chaussée (Étage 0)',
    shortLabel: 'RDC',
    studiosAtEntrance: [] as string[],
    rooms: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06', 'CH07', 'CH08'],
    backEndDoors: ['CH07', 'CH08'],
    missingNumberNote: null,
  },
  {
    floor: 1,
    label: '1er Étage (Étage 1)',
    shortLabel: 'Étage 1',
    studiosAtEntrance: ['ST11', 'ST12'],
    rooms: ['CH11', 'CH12', 'CH13', 'CH14', 'CH15', 'CH16', 'CH18'],
    backEndDoors: ['CH15', 'CH18'],
    missingNumberNote:
      'Pas de CH17 • Studios ST11 & ST12 à la sortie des escaliers • CH15 & CH18 au fond du couloir',
  },
  {
    floor: 2,
    label: '2ème Étage (Étage 2)',
    shortLabel: 'Étage 2',
    studiosAtEntrance: ['ST21', 'ST22'],
    rooms: ['CH21', 'CH22', 'CH23', 'CH24', 'CH25', 'CH26', 'CH28'],
    backEndDoors: ['CH25', 'CH28'],
    missingNumberNote:
      'Pas de CH27 • Studios ST21 & ST22 à la sortie des escaliers • CH25 & CH28 au fond du couloir',
  },
  {
    floor: 3,
    label: '3ème Étage (Étage 3)',
    shortLabel: 'Étage 3',
    studiosAtEntrance: ['ST31', 'ST32'],
    rooms: ['CH31', 'CH32', 'CH33', 'CH34', 'CH35', 'CH36', 'CH38'],
    backEndDoors: ['CH35', 'CH38'],
    missingNumberNote:
      'Pas de CH37 • Studios ST31 & ST32 à la sortie des escaliers • CH35 & CH38 au fond du couloir',
  },
] as const;
