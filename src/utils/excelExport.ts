import * as XLSX from 'xlsx';
import { ExpenseRecord, PaymentRecord, RentalUnit } from '../types';
import {
  calculateUnitSeparatedBalances,
  formatDateFR,
  getRemainingMonthsCovered,
  getStatusConfig,
  getUnitTypeLabel,
  isPreventiveThreeMonthsAlert,
} from './formatters';

export interface MonthlyExcelExportOptions {
  buildingName: string;
  monthIndex: number; // 0 = Janvier .. 11 = Décembre
  year: number;
  units: RentalUnit[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}

const FRENCH_MONTHS = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
];

/**
 * Génère et télécharge un vrai fichier Excel (.xlsx) multi-onglets via SheetJS (xlsx)
 * - Onglet 1 : État Mensuel des Logements
 * - Onglet 2 : Synthèse Financière & Travaux
 */
export function downloadMonthlyExcelReport({
  buildingName,
  monthIndex,
  year,
  units,
  payments,
  expenses,
}: MonthlyExcelExportOptions): void {
  const monthLabel = FRENCH_MONTHS[monthIndex] || 'Mois';
  const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  // Filtrer les paiements et dépenses correspondant au mois choisi (ou tous si aucun sur ce mois précis pour la démo)
  const monthlyPayments = payments.filter((p) => p.paymentDate.startsWith(monthPrefix));
  const monthlyExpenses = expenses.filter((e) => e.date.startsWith(monthPrefix));

  // ============================================================================
  // ONGLET 1 : ÉTAT MENSUEL DES LOGEMENTS
  // ============================================================================
  const sortedUnits = [...units].sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor;
    return a.corridorPosition - b.corridorPosition;
  });

  const sheet1Rows = sortedUnits.map((unit) => {
    const balances = calculateUnitSeparatedBalances(unit);
    const remainingMonths = getRemainingMonthsCovered(unit);
    const alert3Months = isPreventiveThreeMonthsAlert(unit);
    const statusLabel = getStatusConfig(unit.status).label;
    const floorLabel =
      unit.locationLabel ||
      (unit.floor === 0 ? 'Rez-de-chaussée (RDC)' : `${unit.floor}e Étage`);

    return {
      'N° Logement': unit.code,
      'Type de Bien': getUnitTypeLabel(unit.type, unit.subTypeLabel),
      'Étage / Emplacement': floorLabel,
      'Nom du Locataire': unit.tenant ? unit.tenant.fullName : 'LOGEMENT VACANT',
      'Téléphone': unit.tenant ? unit.tenant.phone : '—',
      'Statut': statusLabel,
      'Loyer Mensuel (FCFA)': unit.monthlyRent,
      'Loyer Versé Période (FCFA)': unit.tenant ? unit.tenant.amountPaidCurrentPeriod : 0,
      'Reste à Payer Loyer (FCFA)': balances.rentBalanceDue,
      'Crédit Avance Loyer Reporté (FCFA)': balances.rentCreditCarry,
      'Mois Couverts Restants': unit.tenant ? remainingMonths : 0,
      'Échéance Loyer': unit.tenant ? formatDateFR(unit.tenant.rentValidUntil) : '—',
      'Alerte Préventive <= 3 Mois': alert3Months
        ? `OUI (<= ${remainingMonths} mois restants)`
        : 'Non',
      'Forfait Eau Mensuel (FCFA)': balances.waterFlatFee,
      'Statut Eau':
        unit.status === 'VACANT'
          ? 'Vacant'
          : unit.utilities.waterPaid
          ? 'Réglé'
          : 'En attente',
      'Reste Eau (FCFA)': balances.waterRemainingDue,
      'Facture Électricité ENEO (FCFA)': balances.electricityBilled,
      'Avance / Versé Élec (FCFA)': balances.electricityPaidAmount,
      'Reste à Payer Élec (FCFA)': balances.electricityRemainingDue,
      'Solde Global Net Dû (FCFA)': balances.globalNetDue,
    };
  });

  // Ligne de totalisation en bas de l'Onglet 1
  const totalMonthlyRentPotential = sortedUnits.reduce((acc, u) => acc + u.monthlyRent, 0);
  const totalRentPaid = sortedUnits.reduce(
    (acc, u) => acc + (u.tenant ? u.tenant.amountPaidCurrentPeriod : 0),
    0
  );
  const totalRentRemaining = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).rentBalanceDue,
    0
  );
  const totalRentCredit = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).rentCreditCarry,
    0
  );
  const totalWaterFlatFee = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).waterFlatFee,
    0
  );
  const totalWaterRemaining = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).waterRemainingDue,
    0
  );
  const totalElecBilled = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).electricityBilled,
    0
  );
  const totalElecPaid = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).electricityPaidAmount,
    0
  );
  const totalElecRemaining = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).electricityRemainingDue,
    0
  );
  const totalGlobalNetDue = sortedUnits.reduce(
    (acc, u) => acc + calculateUnitSeparatedBalances(u).globalNetDue,
    0
  );

  sheet1Rows.push({
    'N° Logement': 'TOTAL IMMEUBLE',
    'Type de Bien': `${sortedUnits.length} Unités`,
    'Étage / Emplacement': buildingName,
    'Nom du Locataire': `${sortedUnits.filter((u) => u.status !== 'VACANT').length} Occupés / ${sortedUnits.filter((u) => u.status === 'VACANT').length} Vacants`,
    'Téléphone': '',
    'Statut': '',
    'Loyer Mensuel (FCFA)': totalMonthlyRentPotential,
    'Loyer Versé Période (FCFA)': totalRentPaid,
    'Reste à Payer Loyer (FCFA)': totalRentRemaining,
    'Crédit Avance Loyer Reporté (FCFA)': totalRentCredit,
    'Mois Couverts Restants': 0,
    'Échéance Loyer': '',
    'Alerte Préventive <= 3 Mois': `${sortedUnits.filter((u) => isPreventiveThreeMonthsAlert(u)).length} logement(s) <= 3 mois`,
    'Forfait Eau Mensuel (FCFA)': totalWaterFlatFee,
    'Statut Eau': '',
    'Reste Eau (FCFA)': totalWaterRemaining,
    'Facture Électricité ENEO (FCFA)': totalElecBilled,
    'Avance / Versé Élec (FCFA)': totalElecPaid,
    'Reste à Payer Élec (FCFA)': totalElecRemaining,
    'Solde Global Net Dû (FCFA)': totalGlobalNetDue,
  });

  // ============================================================================
  // ONGLET 2 : SYNTHÈSE FINANCIÈRE & TRAVAUX
  // ============================================================================
  const occupiedCount = sortedUnits.filter((u) => u.status !== 'VACANT').length;
  const vacantCount = sortedUnits.filter((u) => u.status === 'VACANT').length;
  const lateCount = sortedUnits.filter((u) => u.status === 'LATE').length;
  const partialCount = sortedUnits.filter((u) => u.status === 'PARTIAL').length;
  const alert3MonthsCount = sortedUnits.filter((u) => isPreventiveThreeMonthsAlert(u)).length;

  const collectedOnSelectedMonth = monthlyPayments.reduce((acc, p) => acc + p.totalPaid, 0);
  const effectiveCollected =
    collectedOnSelectedMonth > 0 ? collectedOnSelectedMonth : totalRentPaid + totalElecPaid;

  const expensesSource = monthlyExpenses.length > 0 ? monthlyExpenses : expenses;
  const totalWorksCost = expensesSource.reduce(
    (acc, e) => acc + (e.actualCost > 0 ? e.actualCost : e.estimatedCost),
    0
  );

  const sheet2Data: Record<string, string | number>[] = [
    {
      'Indicateur / Rubrique': `RAPPORT FINANCIER MENSUEL — ${buildingName.toUpperCase()} (${monthLabel.toUpperCase()} ${year})`,
      'Valeur / Montant (FCFA)': '',
      'Détails & Observations': `Généré par Conrad Solutions le ${new Date().toLocaleDateString('fr-FR')}`,
    },
    {
      'Indicateur / Rubrique': 'Nombre Total de Biens / Logements',
      'Valeur / Montant (FCFA)': sortedUnits.length,
      'Détails & Observations': `${occupiedCount} occupés | ${vacantCount} vacants`,
    },
    {
      'Indicateur / Rubrique': 'Logements Vacants',
      'Valeur / Montant (FCFA)': vacantCount,
      'Détails & Observations':
        sortedUnits
          .filter((u) => u.status === 'VACANT')
          .map((u) => u.code)
          .join(', ') || 'Aucun logement vacant',
    },
    {
      'Indicateur / Rubrique': 'Alertes Préventives (<= 3 mois restants)',
      'Valeur / Montant (FCFA)': alert3MonthsCount,
      'Détails & Observations':
        sortedUnits
          .filter((u) => isPreventiveThreeMonthsAlert(u))
          .map((u) => `${u.code} (${u.tenant?.fullName})`)
          .join(', ') || 'Aucune échéance <= 3 mois',
    },
    {
      'Indicateur / Rubrique': 'Total Encaissé sur la Période (FCFA)',
      'Valeur / Montant (FCFA)': effectiveCollected,
      'Détails & Observations': `${monthlyPayments.length} quittance(s) enregistrée(s) sur ${monthLabel} ${year}`,
    },
    {
      'Indicateur / Rubrique': 'Reste à Recouvrer — Loyers (FCFA)',
      'Valeur / Montant (FCFA)': totalRentRemaining,
      'Détails & Observations': `${lateCount} en retard | ${partialCount} en paiement partiel`,
    },
    {
      'Indicateur / Rubrique': 'Reste à Recouvrer — Forfaits Eau (FCFA)',
      'Valeur / Montant (FCFA)': totalWaterRemaining,
      'Détails & Observations': 'Forfait fixe mensuel par logement (2 000 FCFA / 1 500 FCFA)',
    },
    {
      'Indicateur / Rubrique': 'Reste à Recouvrer — Électricité ENEO (FCFA)',
      'Valeur / Montant (FCFA)': totalElecRemaining,
      'Détails & Observations': `Facturé : ${totalElecBilled} FCFA | Avances versées : ${totalElecPaid} FCFA`,
    },
    {
      'Indicateur / Rubrique': 'SOLDE GLOBAL NET À RECOUVRER (FCFA)',
      'Valeur / Montant (FCFA)': totalGlobalNetDue,
      'Détails & Observations': 'Cumul net Loyers + Forfaits Eau + Reste Électricité ENEO',
    },
    {
      'Indicateur / Rubrique': 'Dépenses de Maintenance & Travaux (FCFA)',
      'Valeur / Montant (FCFA)': totalWorksCost,
      'Détails & Observations': `${expensesSource.length} intervention(s) comptabilisée(s)`,
    },
    {
      'Indicateur / Rubrique': 'BÉNÉFICE NET TRÉSORERIE (FCFA)',
      'Valeur / Montant (FCFA)': effectiveCollected - totalWorksCost,
      'Détails & Observations': 'Total Encaissé - Dépenses de Maintenance & Travaux',
    },
    {
      'Indicateur / Rubrique': '',
      'Valeur / Montant (FCFA)': '',
      'Détails & Observations': '',
    },
    {
      'Indicateur / Rubrique': '--- DÉTAIL DES TRAVAUX & DÉPENSES DE MAINTENANCE ---',
      'Valeur / Montant (FCFA)': 'Coût (FCFA)',
      'Détails & Observations': 'Logement / Statut / Notes',
    },
  ];

  expensesSource.forEach((exp) => {
    sheet2Data.push({
      'Indicateur / Rubrique': `[${exp.date}] ${exp.title}`,
      'Valeur / Montant (FCFA)': exp.actualCost > 0 ? exp.actualCost : exp.estimatedCost,
      'Détails & Observations': `Unité : ${exp.unitCode} | Statut : ${exp.status} | ${exp.notes}`,
    });
  });

  // Création du classeur Excel (.xlsx)
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
  ws1['!cols'] = [
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 22 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
  ];

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  ws2['!cols'] = [{ wch: 48 }, { wch: 24 }, { wch: 58 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Etat Mensuel des Logements');
  XLSX.utils.book_append_sheet(wb, ws2, 'Synthese Financiere & Travaux');

  const safeBuilding = buildingName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Rapport_Mensuel_${safeBuilding}_${monthLabel}_${year}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
