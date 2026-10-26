/**
 * ============================================================================
 * CONRAD SOLUTIONS — FICHIER DE CONFIGURATION CENTRALISÉ (config/constants.ts)
 * ============================================================================
 * Modifiez ces valeurs pour ajuster instantanément les tarifs par défaut,
 * les prix unitaires Eau (Forage) / Électricité (ENEO), le mot de passe maître
 * et les informations du bailleur principal.
 *
 * Note : Toutes ces valeurs sont également modifiables directement depuis
 * l'interface de l'application dans l'onglet "Paramètres & Tarifs".
 * ============================================================================
 */

// 1. TARIFS LOCATIFS MENSUELS PAR DÉFAUT (en FCFA / mois)
export const DEFAULT_ROOM_PRICE = 32000; // Tarif de base d'une Chambre (CH) : 32 000 FCFA / mois
export const DEFAULT_STUDIO_PRICE = 50000; // Tarif de base d'un Studio (ST) : 50 000 FCFA / mois

// 2. TARIFS UNITAIRES EAU (FORAGE) & ÉLECTRICITÉ (ENEO)
export const DEFAULT_WATER_M3_PRICE = 500; // Tarif du m³ d'eau du forage : 500 FCFA / m³
export const DEFAULT_WATER_FLAT_FEE = 2500; // Forfait mensuel eau par défaut (si sans compteur) : 2 500 FCFA
export const DEFAULT_ELECTRICITY_KWH_PRICE = 110; // Tarif moyen du kWh ENEO : 110 FCFA / kWh
export const DEFAULT_ELECTRICITY_FLAT_FEE = 5000; // Forfait mensuel ENEO par défaut : 5 000 FCFA

// 3. RÈGLE INDICATIVE DE CAUTION & AVANCES À L'ENTRÉE
export const STANDARD_DEPOSIT_MONTHS = 1; // 1 mois de caution
export const STANDARD_ADVANCE_MONTHS = 2; // 2 mois d'avance à l'entrée

// 4. SÉCURITÉ & ACCÈS PROPRIÉTAIRE (MOT DE PASSE MAÎTRE)
export const MASTER_OWNER_ID = 'proprietaire.moro@conrad-solutions.cm';
export const MASTER_OWNER_PASSWORD = 'Joël Brian';

// 5. COORDONNÉES DU BAILLEUR & DE LA MARQUE (CONRAD SOLUTIONS)
export const BRAND_CONFIG = {
  companyName: 'Conrad Solutions',
  tagline: 'PropTech SaaS — Gestion de Flotte Immobilière',
  version: '2.0.0 Production (Vercel Ready)',
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
  alertDaysBeforeDue: 5, // Alerte lorsque l'échéance arrive dans moins de 5 jours
};

// 6. PALETTE DE COULEURS OFFICIELLE ("BLEU FIN & SOBRE" + INDICATEURS UNIVERSELS)
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

// 7. TOPOLOGIE ARCHITECTURALE EXACTE DE LA "RÉSIDENCE MORO" (35 UNITÉS)
// - RDC (Étage 0) : 8 Chambres (CH01 à CH08), 0 Studio.
// - Étages 1, 2 et 3 :
//   * Dès l'arrivée des escaliers (Début du couloir) : 2 Studios (STX1 à gauche, STX2 à droite).
//   * Suite du couloir : Chambres alignées (Impairs à gauche, Pairs à droite).
//   * PAS de chambre CHX7 (CH17, CH27, CH37 n'existent pas).
//   * Tout au fond du couloir : CHX5 (Gauche) et CHX8 (Droite).
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
    rooms: ['CH11', 'CH12', 'CH13', 'CH14', 'CH15', 'CH16', 'CH18'], // Pas de CH17
    backEndDoors: ['CH15', 'CH18'],
    missingNumberNote: 'Pas de CH17 • Studios ST11 & ST12 à la sortie des escaliers • CH15 & CH18 au fond du couloir',
  },
  {
    floor: 2,
    label: '2ème Étage (Étage 2)',
    shortLabel: 'Étage 2',
    studiosAtEntrance: ['ST21', 'ST22'],
    rooms: ['CH21', 'CH22', 'CH23', 'CH24', 'CH25', 'CH26', 'CH28'], // Pas de CH27
    backEndDoors: ['CH25', 'CH28'],
    missingNumberNote: 'Pas de CH27 • Studios ST21 & ST22 à la sortie des escaliers • CH25 & CH28 au fond du couloir',
  },
  {
    floor: 3,
    label: '3ème Étage (Étage 3)',
    shortLabel: 'Étage 3',
    studiosAtEntrance: ['ST31', 'ST32'],
    rooms: ['CH31', 'CH32', 'CH33', 'CH34', 'CH35', 'CH36', 'CH38'], // Pas de CH37
    backEndDoors: ['CH35', 'CH38'],
    missingNumberNote: 'Pas de CH37 • Studios ST31 & ST32 à la sortie des escaliers • CH35 & CH38 au fond du couloir',
  },
] as const;
