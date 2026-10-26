import { LandlordSettings, PaymentMethod, PaymentRecord, RentalUnit, UnitStatus } from '../types';

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
 * Calcule automatiquement :
 * - Le nombre de mois complets couverts
 * - Le reste à payer éventuel (si acompte partiel, ex: 20 000 FCFA sur 32 000 FCFA -> Reste 12 000 FCFA)
 * - Le crédit d'avance positif reporté sur le mois suivant (ex: 100 000 FCFA sur 32 000 FCFA -> 3 mois = 96 000 FCFA + Crédit +4 000 FCFA)
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
 * Génère le lien WhatsApp de relance directe pour le LOCATAIRE
 */
export function buildTenantWhatsAppUrl(unit: RentalUnit, settings: LandlordSettings): string {
  if (!unit.tenant) return '#';
  const cleanPhone = sanitizePhoneForWhatsApp(unit.tenant.phone);
  const unitLabel = unit.type === 'STUDIO' ? `Studio ${unit.code}` : `Chambre ${unit.code}`;
  const credit = unit.tenant.creditBalance || 0;
  const amountExpected =
    unit.tenant.balanceDue > 0
      ? unit.tenant.balanceDue
      : Math.max(0, unit.monthlyRent - credit);
  const waterElecDue =
    (unit.utilities.waterPaid ? 0 : unit.utilities.waterAmountDue) +
    (unit.utilities.electricityPaid ? 0 : unit.utilities.electricityAmountDue);

  const totalToPay = amountExpected + waterElecDue;

  const message =
    `Bonjour ${unit.tenant.fullName},\n\n` +
    `Sauf erreur ou omission de notre part, nous vous rappelons le règlement relatif à votre logement *${unitLabel}* à la *Résidence Moro* :\n` +
    `• Loyer / Solde attendu : *${formatFCFA(amountExpected)}*\n` +
    (credit > 0 ? `• Crédit d'avance déduit : *- ${formatFCFA(credit)}*\n` : '') +
    (waterElecDue > 0 ? `• Eau (Forage) & ENEO : *${formatFCFA(waterElecDue)}*\n` : '') +
    `• Total à régulariser : *${formatFCFA(totalToPay)}*\n` +
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
  const unitLabel = unit.type === 'STUDIO' ? `Studio ${unit.code}` : `Chambre ${unit.code}`;
  const amountExpected =
    unit.tenant.balanceDue > 0 ? unit.tenant.balanceDue : unit.monthlyRent;
  const depositMissing = Math.max(0, unit.tenant.depositRequired - unit.tenant.depositPaid);

  const message =
    `Bonjour respectueux ${g.fullName || 'Cher Parent / Garant'},\n\n` +
    `Nous vous contactons depuis la direction de la *Résidence Moro* concernant le logement *${unitLabel}* occupé par *${unit.tenant.fullName}* (${g.relationship || 'Garant'}).\n\n` +
    `À ce jour, la situation locative présente un solde en attente de régularisation :\n` +
    `• Solde loyer attendu : *${formatFCFA(amountExpected)}*\n` +
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
    (payment.waterAmountPaid > 0 ? `• Eau (Forage) : ${formatFCFA(payment.waterAmountPaid)}\n` : '') +
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
