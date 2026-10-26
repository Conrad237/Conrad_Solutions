import {
  LandlordSettings,
  PaymentMethod,
  PaymentRecord,
  RentalUnit,
  UnitStatus,
  UnitType,
} from '../types';
import {
  PREVENTIVE_ALERT_MONTHS_THRESHOLD,
  RESIDENCE_INTERNAL_RULES,
} from '../../config/constants';

/**
 * Formate un montant en FCFA avec séparateur de milliers lisible (ex: "32 000 FCFA")
 */
export function formatFCFA(amount: number, includeSuffix = true): string {
  const rounded = Math.round(amount || 0);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return includeSuffix ? `${formatted} FCFA` : formatted;
}

/**
 * Formate une date YYYY-MM-DD en format français lisible (ex: "15 Oct. 2026")
 */
export function formatDateFR(dateStr?: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = [
    'Janv.',
    'Févr.',
    'Mars',
    'Avr.',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
  ];
  return `${day.toString().padStart(2, '0')} ${months[month] || ''} ${year}`;
}

/**
 * Libellé lisible du type de bien (Chambre, Studio, Appartement, Boutique, Magasin)
 */
export function getUnitTypeLabel(type: UnitType, subTypeLabel?: string): string {
  if (subTypeLabel && subTypeLabel.trim().length > 0) {
    return subTypeLabel.trim();
  }
  switch (type) {
    case 'ROOM':
      return 'Chambre';
    case 'STUDIO':
      return 'Studio';
    case 'APARTMENT':
      return 'Appartement';
    case 'SHOP':
      return 'Boutique';
    case 'WAREHOUSE':
      return 'Magasin';
    default:
      return 'Logement';
  }
}

export function getUnitFullLabel(unit: Pick<RentalUnit, 'type' | 'code' | 'subTypeLabel'>): string {
  return `${getUnitTypeLabel(unit.type, unit.subTypeLabel)} ${unit.code}`;
}

/**
 * Calcule le nombre de jours avant ou depuis l'échéance (par rapport à la date de référence)
 */
export function getDaysUntilDue(rentValidUntil?: string): number {
  if (!rentValidUntil) return 999;
  const now = new Date('2026-10-26T12:00:00');
  const due = new Date(`${rentValidUntil}T12:00:00`);
  if (isNaN(due.getTime())) return 999;
  const diffMs = due.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calcule en permanence le nombre de mois de loyer couverts restants par le solde d'avance du locataire
 */
export function getRemainingMonthsCovered(unit: RentalUnit): number {
  if (!unit.tenant || unit.status === 'VACANT') return 0;
  const daysLeft = getDaysUntilDue(unit.tenant.rentValidUntil);
  if (daysLeft <= 0) return 0;
  const computedFromDate = Math.ceil(daysLeft / 30);
  // Si monthsCovered est renseigné et cohérent, on prend la valeur la plus fidèle au contrat en cours
  if (unit.tenant.monthsCovered && unit.tenant.monthsCovered > 0) {
    return Math.min(unit.tenant.monthsCovered, computedFromDate);
  }
  return computedFromDate;
}

/**
 * Détecte automatiquement si un locataire déclenche l'Alerte Préventive à 3 Mois (<= 3 mois restants)
 */
export function isPreventiveThreeMonthsAlert(unit: RentalUnit): boolean {
  if (!unit.tenant || unit.status === 'VACANT') return false;
  const remainingMonths = getRemainingMonthsCovered(unit);
  return remainingMonths >= 1 && remainingMonths <= PREVENTIVE_ALERT_MONTHS_THRESHOLD;
}

/**
 * Calcule de manière séparée le solde Loyer, le forfait Eau, le solde Électricité (ENEO) et le Solde Global Net
 */
export interface UnitSeparatedBalances {
  rentBalanceDue: number;
  rentCreditCarry: number;
  waterFlatFee: number;
  waterRemainingDue: number;
  electricityBilled: number;
  electricityPaidAmount: number;
  electricityRemainingDue: number;
  electricityCreditCarry: number;
  globalNetDue: number; // Montant total net restant à payer par le locataire (0 si tout est réglé)
  globalNetCredit: number; // Crédit total positif en faveur du locataire
}

export function calculateUnitSeparatedBalances(unit: RentalUnit): UnitSeparatedBalances {
  const rentBalanceDue = unit.tenant ? Math.max(0, unit.tenant.balanceDue || 0) : 0;
  const rentCreditCarry = unit.tenant ? Math.max(0, unit.tenant.creditBalance || 0) : 0;

  const waterFlatFee =
    typeof unit.utilities.waterFlatFee === 'number'
      ? unit.utilities.waterFlatFee
      : unit.utilities.waterAmountDue || 2000;
  const waterRemainingDue =
    unit.status === 'VACANT' || unit.utilities.waterPaid ? 0 : Math.max(0, waterFlatFee);

  const electricityBilled = Math.max(0, unit.utilities.electricityAmountDue || 0);
  const electricityPaidAmount =
    typeof unit.utilities.electricityAmountPaid === 'number'
      ? Math.max(0, unit.utilities.electricityAmountPaid)
      : unit.utilities.electricityPaid
      ? electricityBilled
      : 0;

  const electricityRemainingDue =
    unit.status === 'VACANT' || unit.utilities.electricityPaid
      ? 0
      : Math.max(0, electricityBilled - electricityPaidAmount);
  const electricityCreditCarry = Math.max(0, electricityPaidAmount - electricityBilled);

  const rawDue = rentBalanceDue + waterRemainingDue + electricityRemainingDue;
  const rawCredit = rentCreditCarry + electricityCreditCarry;

  const globalNetDue = Math.max(0, rawDue - rawCredit);
  const globalNetCredit = Math.max(0, rawCredit - rawDue);

  return {
    rentBalanceDue,
    rentCreditCarry,
    waterFlatFee,
    waterRemainingDue,
    electricityBilled,
    electricityPaidAmount,
    electricityRemainingDue,
    electricityCreditCarry,
    globalNetDue,
    globalNetCredit,
  };
}

/**
 * Ajoute N mois à une date YYYY-MM-DD
 */
export function addMonthsToDate(baseDateStr: string, monthsToAdd: number): string {
  const base = baseDateStr ? new Date(`${baseDateStr}T12:00:00`) : new Date('2026-10-26T12:00:00');
  const d = isNaN(base.getTime()) ? new Date('2026-10-26T12:00:00') : base;
  d.setMonth(d.getMonth() + monthsToAdd);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * MOTEUR FINANCIER GLISSANT (COMPTE COURANT LOCATAIRE)
 */
export interface SlidingPaymentCalculation {
  availableFunds: number;
  monthsCovered: number;
  rentConsumedForFullMonths: number;
  newBalanceDue: number;
  newCreditBalance: number;
  resultingStatus: UnitStatus;
  summaryText: string;
}

export function calculateSlidingRentPayment(
  amountPaid: number,
  monthlyRent: number,
  existingBalanceDue = 0,
  existingCreditBalance = 0
): SlidingPaymentCalculation {
  const safeRent = Math.max(1, monthlyRent);
  const safePaid = Math.max(0, amountPaid);
  const availableFunds = safePaid + Math.max(0, existingCreditBalance);

  // Cas 1 : Le locataire avait un reste à payer / retard sur la période en cours
  if (existingBalanceDue > 0) {
    if (availableFunds < existingBalanceDue) {
      const newBalanceDue = existingBalanceDue - availableFunds;
      return {
        availableFunds,
        monthsCovered: 1,
        rentConsumedForFullMonths: availableFunds,
        newBalanceDue,
        newCreditBalance: 0,
        resultingStatus: 'PARTIAL',
        summaryText: `Acompte partiel enregistré (${formatFCFA(safePaid)}). Il reste ${formatFCFA(newBalanceDue)} à solder sur la période en cours.`,
      };
    } else {
      const surplusAfterDebt = availableFunds - existingBalanceDue;
      const extraFullMonths = Math.floor(surplusAfterDebt / safeRent);
      const totalMonthsCovered = 1 + extraFullMonths;
      const newCreditBalance = surplusAfterDebt % safeRent;
      const rentConsumed = existingBalanceDue + extraFullMonths * safeRent;

      return {
        availableFunds,
        monthsCovered: totalMonthsCovered,
        rentConsumedForFullMonths: rentConsumed,
        newBalanceDue: 0,
        newCreditBalance,
        resultingStatus: 'PAID',
        summaryText:
          newCreditBalance > 0
            ? `Arriéré soldé + ${extraFullMonths} mois supplémentaire(s) (${formatFCFA(rentConsumed)}) + Crédit d'avance positif de ${formatFCFA(newCreditBalance)} reporté sur le mois suivant.`
            : `Arriéré intégralement soldé (${totalMonthsCovered} mois couvert(s)).`,
      };
    }
  }

  // Cas 2 : Le locataire n'avait pas d'arriéré (nouvelle échéance mensuelle ou avance multi-mois)
  if (availableFunds < safeRent) {
    const newBalanceDue = safeRent - availableFunds;
    return {
      availableFunds,
      monthsCovered: 1,
      rentConsumedForFullMonths: availableFunds,
      newBalanceDue,
      newCreditBalance: 0,
      resultingStatus: 'PARTIAL',
      summaryText: `Paiement partiel sur 1 mois : ${formatFCFA(availableFunds)} pris en compte, reste à payer ${formatFCFA(newBalanceDue)}.`,
    };
  }

  const fullMonths = Math.floor(availableFunds / safeRent);
  const rentConsumed = fullMonths * safeRent;
  const newCreditBalance = availableFunds % safeRent;

  return {
    availableFunds,
    monthsCovered: fullMonths,
    rentConsumedForFullMonths: rentConsumed,
    newBalanceDue: 0,
    newCreditBalance,
    resultingStatus: 'PAID',
    summaryText:
      newCreditBalance > 0
        ? `${fullMonths} mois complet(s) couvert(s) (${formatFCFA(rentConsumed)}) + Crédit d'avance positif de ${formatFCFA(newCreditBalance)} reporté sur le mois suivant.`
        : `${fullMonths} mois complet(s) intégralement réglé(s) (${formatFCFA(rentConsumed)}).`,
  };
}

/**
 * Nettoie un numéro de téléphone pour un lien WhatsApp wa.me (format international sans '+')
 */
export function sanitizePhoneForWhatsApp(phone: string): string {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return '237699001122';
  if (digits.startsWith('237')) return digits;
  if (digits.length === 9) return `237${digits}`;
  return digits;
}

/**
 * Génère le lien WhatsApp d'ALERTE PRÉVENTIVE À 3 MOIS (<= 3 mois restants)
 */
export function buildPreventiveThreeMonthsWhatsAppUrl(
  unit: RentalUnit,
  settings: LandlordSettings
): string {
  if (!unit.tenant) return '#';
  const cleanPhone = sanitizePhoneForWhatsApp(unit.tenant.phone);
  const unitLabel = getUnitFullLabel(unit);
  const remainingMonths = getRemainingMonthsCovered(unit);
  const balances = calculateUnitSeparatedBalances(unit);

  const message =
    `Bonjour ${unit.tenant.fullName},\n\n` +
    `Nous espérons que vous vous portez bien au sein de la *Résidence Moro*.\n\n` +
    `🔔 *RAPPEL PRÉVENTIF DE COUVERTURE LOCATIVE (${unitLabel})*\n` +
    `Votre contrat / avance de loyer actuelle arrive progressivement à son terme :\n` +
    `• Couverture restante : *${remainingMonths} mois restant(s)*\n` +
    `• Date de fin de couverture actuelle : *${formatDateFR(unit.tenant.rentValidUntil)}*\n` +
    `• Tarif mensuel du logement : *${formatFCFA(unit.monthlyRent)} / mois*\n` +
    (balances.rentCreditCarry > 0
      ? `• Crédit d'avance déjà acquis à déduire : *+${formatFCFA(balances.rentCreditCarry)}*\n`
      : '') +
    `\nNous vous invitons courtoisement à planifier dès à présent votre prochain renouvellement de loyer afin de conserver votre tranquillité d'esprit.\n\n` +
    `Coordonnées de règlement habituelles :\n` +
    `- Orange Money : ${settings.orangeMoneyNumber}\n` +
    `- MTN MoMo : ${settings.mtnMomoNumber}\n\n` +
    `Restant à votre entière disposition, bien cordialement,\n` +
    `*${settings.ownerName} — Gestion Résidence Moro (Conrad Solutions)*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien WhatsApp pour envoyer le RÈGLEMENT INTÉRIEUR DE LA CITÉ en 1 clic
 */
export function buildInternalRulesWhatsAppUrl(
  unit: RentalUnit,
  settings: LandlordSettings
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(unit.tenant?.phone || settings.whatsappPhone);
  const tenantName = unit.tenant?.fullName || 'Cher(e) Locataire';
  const unitLabel = getUnitFullLabel(unit);

  const rulesText = RESIDENCE_INTERNAL_RULES.articles
    .map((a) => `*${a.title}*\n${a.body}`)
    .join('\n\n');

  const message =
    `📋 *${RESIDENCE_INTERNAL_RULES.title}*\n` +
    `_${RESIDENCE_INTERNAL_RULES.subtitle}_\n\n` +
    `Bonjour *${tenantName}* (${unitLabel}),\n` +
    `Voici l'exemplaire numérique officiel du Règlement Intérieur de la résidence :\n\n` +
    `${rulesText}\n\n` +
    `_${RESIDENCE_INTERNAL_RULES.footer}_\n` +
    `*${settings.ownerName} — Conrad Solutions*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère et ouvre une fenêtre d'impression / sauvegarde PDF propre pour le Règlement Intérieur
 */
export function printInternalRulesDocument(
  unit?: RentalUnit | null,
  settings?: LandlordSettings
): void {
  const popup = window.open('', '_blank', 'width=850,height=900');
  if (!popup) return;

  const tenantBlock =
    unit && unit.tenant
      ? `<div style="margin: 18px 0; padding: 14px 18px; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 10px; font-size: 14px;">
          <strong>Logement :</strong> ${getUnitFullLabel(unit)} &nbsp;|&nbsp;
          <strong>Locataire :</strong> ${unit.tenant.fullName} &nbsp;|&nbsp;
          <strong>Téléphone :</strong> ${unit.tenant.phone} &nbsp;|&nbsp;
          <strong>Forfait Eau :</strong> ${formatFCFA(unit.utilities.waterFlatFee ?? 2000)}/mois
        </div>`
      : '';

  const articlesHtml = RESIDENCE_INTERNAL_RULES.articles
    .map(
      (a) => `
      <div style="margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #E2E8F0;">
        <h3 style="margin: 0 0 4px 0; color: #0F172A; font-size: 15px;">${a.title}</h3>
        <p style="margin: 0; color: #334155; font-size: 13.5px; line-height: 1.55;">${a.body}</p>
      </div>`
    )
    .join('');

  popup.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>${RESIDENCE_INTERNAL_RULES.title}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; padding: 36px; color: #0F172A; max-width: 760px; margin: 0 auto; }
          .header { border-bottom: 3px solid #1E3A8A; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .badge { background: #1E3A8A; color: white; padding: 5px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
          .signatures { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 20px; border-top: 2px dashed #CBD5E1; font-size: 13px; }
          .sig-box { width: 45%; min-height: 90px; border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; background: #F8FAFC; }
          @media print { .no-print { display: none; } body { padding: 15px; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background: #2563EB; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; cursor: pointer;">
            Imprimer / Enregistrer en PDF
          </button>
        </div>
        <div class="header">
          <div>
            <span class="badge">Conrad Solutions — Document Officiel</span>
            <h1 style="margin: 10px 0 4px 0; font-size: 22px; color: #0F172A;">${RESIDENCE_INTERNAL_RULES.title}</h1>
            <p style="margin: 0; font-size: 13px; color: #64748B;">${RESIDENCE_INTERNAL_RULES.subtitle}</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #475569;">
            <strong>Direction :</strong> ${settings?.ownerName || 'Joël Brian'}<br/>
            <strong>Contact :</strong> ${settings?.phone || '+237 699 00 11 22'}
          </div>
        </div>
        ${tenantBlock}
        ${articlesHtml}
        <p style="font-size: 12.5px; color: #475569; font-style: italic; margin-top: 18px;">
          ${RESIDENCE_INTERNAL_RULES.footer}
        </p>
        <div class="signatures">
          <div class="sig-box">
            <strong>Le Bailleur / Direction :</strong><br/>
            <span style="color: #64748B; font-size: 12px;">${settings?.ownerName || 'Direction Résidence Moro'}</span>
          </div>
          <div class="sig-box">
            <strong>Le Locataire (Mention "Lu et approuvé") :</strong><br/>
            <span style="color: #64748B; font-size: 12px;">${unit?.tenant?.fullName || 'Signature du locataire'}</span>
          </div>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
}

/**
 * Génère le lien WhatsApp de relance directe pour le LOCATAIRE
 */
export function buildTenantWhatsAppUrl(unit: RentalUnit, settings: LandlordSettings): string {
  if (!unit.tenant) return '#';
  const cleanPhone = sanitizePhoneForWhatsApp(unit.tenant.phone);
  const unitLabel = getUnitFullLabel(unit);
  const balances = calculateUnitSeparatedBalances(unit);
  const amountExpected =
    unit.tenant.balanceDue > 0
      ? unit.tenant.balanceDue
      : Math.max(0, unit.monthlyRent - balances.rentCreditCarry);

  const totalToPay =
    amountExpected + balances.waterRemainingDue + balances.electricityRemainingDue;

  const message =
    `Bonjour ${unit.tenant.fullName},\n\n` +
    `Sauf erreur ou omission de notre part, nous vous rappelons le règlement relatif à votre logement *${unitLabel}* à la *Résidence Moro* :\n` +
    `• Loyer / Solde attendu : *${formatFCFA(amountExpected)}*\n` +
    (balances.rentCreditCarry > 0
      ? `• Crédit d'avance Loyer déduit : *- ${formatFCFA(balances.rentCreditCarry)}*\n`
      : '') +
    (balances.waterRemainingDue > 0
      ? `• Forfait Eau (Forage) : *${formatFCFA(balances.waterRemainingDue)}*\n`
      : '') +
    (balances.electricityRemainingDue > 0
      ? `• Reste à payer Électricité (ENEO) : *${formatFCFA(balances.electricityRemainingDue)}* (Facturé ${formatFCFA(balances.electricityBilled)} - Versé ${formatFCFA(balances.electricityPaidAmount)})\n`
      : '') +
    `• *Solde Global Net à régulariser : ${formatFCFA(totalToPay)}*\n` +
    `• Échéance : ${formatDateFR(unit.tenant.rentValidUntil)}\n\n` +
    `Vous pouvez effectuer le règlement par :\n` +
    `- Orange Money : ${settings.orangeMoneyNumber}\n` +
    `- MTN MoMo : ${settings.mtnMomoNumber}\n\n` +
    `Merci de nous confirmer dès réception. Cordialement,\n` +
    `*${settings.ownerName} — Conrad Solutions*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien WhatsApp respectueux pour contacter le GARANT / PARENT
 */
export function buildGuarantorWhatsAppUrl(unit: RentalUnit, settings: LandlordSettings): string {
  if (!unit.tenant || unit.tenant.guarantor.noGuarantorRequired) return '#';
  const g = unit.tenant.guarantor;
  const cleanPhone = sanitizePhoneForWhatsApp(g.phone || unit.tenant.phone);
  const unitLabel = getUnitFullLabel(unit);
  const balances = calculateUnitSeparatedBalances(unit);
  const amountExpected =
    unit.tenant.balanceDue > 0 ? unit.tenant.balanceDue : unit.monthlyRent;
  const depositMissing = Math.max(0, unit.tenant.depositRequired - unit.tenant.depositPaid);

  const message =
    `Bonjour respectueux ${g.fullName || 'Cher Parent / Garant'},\n\n` +
    `Nous vous contactons depuis la direction de la *Résidence Moro* concernant le logement *${unitLabel}* occupé par *${unit.tenant.fullName}* (${g.relationship || 'Garant'}).\n\n` +
    `À ce jour, la situation locative présente un solde en attente de régularisation :\n` +
    `• Solde loyer attendu : *${formatFCFA(amountExpected)}*\n` +
    (balances.waterRemainingDue > 0
      ? `• Forfait Eau (Forage) : *${formatFCFA(balances.waterRemainingDue)}*\n`
      : '') +
    (balances.electricityRemainingDue > 0
      ? `• Reste Électricité ENEO : *${formatFCFA(balances.electricityRemainingDue)}*\n`
      : '') +
    (depositMissing > 0 ? `• Complément caution restant : *${formatFCFA(depositMissing)}*\n` : '') +
    (unit.tenant.arrangementNotes ? `• Note en dossier : _"${unit.tenant.arrangementNotes}"_\n` : '') +
    `\nNous vous remercions par avance pour votre aimable diligence habituelle.\n` +
    `Coordonnées de règlement :\n` +
    `- Orange Money : ${settings.orangeMoneyNumber}\n` +
    `- MTN MoMo : ${settings.mtnMomoNumber}\n\n` +
    `Très cordialement,\n` +
    `*${settings.ownerName} — Gestion Résidence Moro*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Génère le lien WhatsApp pour envoyer la QUITTANCE DE PAIEMENT au locataire
 */
export function buildReceiptWhatsAppUrl(
  payment: PaymentRecord,
  settings: LandlordSettings
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(payment.tenantPhone);
  const creditCarry = payment.creditCarryOver || 0;
  const message =
    `✅ *QUITTANCE DE PAIEMENT — RÉSIDENCE MORO*\n` +
    `N° Reçu : *${payment.receiptNumber}*\n` +
    `Date : ${formatDateFR(payment.paymentDate)}\n` +
    `Logement : *${payment.unitCode}* | Locataire : *${payment.tenantName}*\n` +
    `----------------------------------\n` +
    `• Période : ${payment.periodLabel}\n` +
    `• Loyer versé : ${formatFCFA(payment.rentAmountPaid)}\n` +
    (payment.waterAmountPaid > 0 ? `• Forfait Eau (Forage) : ${formatFCFA(payment.waterAmountPaid)}\n` : '') +
    (payment.electricityAmountPaid > 0
      ? `• Électricité (ENEO) : ${formatFCFA(payment.electricityAmountPaid)}\n`
      : '') +
    (payment.depositAmountPaid > 0
      ? `• Caution versée : ${formatFCFA(payment.depositAmountPaid)}\n`
      : '') +
    `• *TOTAL REÇU : ${formatFCFA(payment.totalPaid)}* (${getPaymentMethodLabel(payment.paymentMethod)})\n` +
    `• Reste à payer : *${formatFCFA(payment.remainingBalanceAfterPayment)}*\n` +
    (creditCarry > 0
      ? `• *Crédit d'avance reporté sur le mois suivant : +${formatFCFA(creditCarry)}*\n`
      : '') +
    `• Loyer valide jusqu'au : *${formatDateFR(payment.newValidUntil)}*\n` +
    `----------------------------------\n` +
    `Merci pour votre règlement.\n` +
    `*${settings.ownerName} — Propulsé par Conrad Solutions*`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'CASH':
      return 'Espèces (Cash)';
    case 'ORANGE_MONEY':
      return 'Orange Money';
    case 'MTN_MOMO':
      return 'MTN MoMo';
    case 'BANK_TRANSFER':
      return 'Virement Bancaire';
  }
}

export function getStatusConfig(status: UnitStatus) {
  switch (status) {
    case 'PAID':
      return {
        label: 'À jour / Avance',
        shortLabel: 'À jour',
        bgBadge: 'bg-[#10B981]/15 text-[#065F46] border-[#10B981]/30',
        dotColor: 'bg-[#10B981]',
        borderCard: 'border-[#10B981]/40 hover:border-[#10B981]',
        accentHex: '#10B981',
      };
    case 'PARTIAL':
      return {
        label: 'Arrangement / Partiel',
        shortLabel: 'Arrangement',
        bgBadge: 'bg-[#F59E0B]/15 text-[#92400E] border-[#F59E0B]/35',
        dotColor: 'bg-[#F59E0B]',
        borderCard: 'border-[#F59E0B]/50 hover:border-[#F59E0B]',
        accentHex: '#F59E0B',
      };
    case 'LATE':
      return {
        label: 'Impayé / Retard',
        shortLabel: 'En retard',
        bgBadge: 'bg-[#EF4444]/15 text-[#991B1B] border-[#EF4444]/35',
        dotColor: 'bg-[#EF4444]',
        borderCard: 'border-[#EF4444]/50 hover:border-[#EF4444]',
        accentHex: '#EF4444',
      };
    case 'VACANT':
      return {
        label: 'Logement Vacant',
        shortLabel: 'Vacant',
        bgBadge: 'bg-[#64748B]/15 text-[#334155] border-[#64748B]/30',
        dotColor: 'bg-[#64748B]',
        borderCard: 'border-[#CBD5E1] hover:border-[#64748B]',
        accentHex: '#64748B',
      };
  }
}
