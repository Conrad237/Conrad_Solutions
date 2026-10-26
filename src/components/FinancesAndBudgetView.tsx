import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  CheckCircle2,
  DoorOpen,
  Download,
  FileSpreadsheet,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ExpenseCategory, ExpenseStatus } from '../types';
import { downloadMonthlyExcelReport } from '../utils/excelExport';
import { formatDateFR, formatFCFA } from '../utils/formatters';

const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

export const FinancesAndBudgetView: React.FC = () => {
  const {
    units,
    payments,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    annualFinancials,
    activeBuilding,
  } = useApp();

  const [reportMonth, setReportMonth] = useState<number>(9);
  const [reportYear, setReportYear] = useState<number>(2026);

  // Formulaire d'ajout de dépense / travaux
  const [title, setTitle] = useState('');
  const [unitCode, setUnitCode] = useState('Parties Communes');
  const [category, setCategory] = useState<ExpenseCategory>('PLUMBING');
  const [status, setStatus] = useState<ExpenseStatus>('TODO');
  const [estimatedCost, setEstimatedCost] = useState<number>(25000);
  const [actualCost, setActualCost] = useState<number>(25000);
  const [date, setDate] = useState('2026-10-26');
  const [notes, setNotes] = useState('');

  // Simulateur Prévisionnel Budgétaire
  const [targetOccupancyPct, setTargetOccupancyPct] = useState<number>(95);
  const [monthlyBudgetWorks, setMonthlyBudgetWorks] = useState<number>(120000);

  // Calculs Financiers Mensuels & Manque à gagner (Pertes virtuelles)
  const monthlyMetrics = useMemo(() => {
    const vacantRooms = units.filter((u) => u.status === 'VACANT' && u.type === 'ROOM');
    const vacantStudios = units.filter((u) => u.status === 'VACANT' && u.type === 'STUDIO');
    const vacantLossRooms = vacantRooms.reduce((acc, u) => acc + u.monthlyRent, 0);
    const vacantLossStudios = vacantStudios.reduce((acc, u) => acc + u.monthlyRent, 0);
    const totalVacancyLoss = vacantLossRooms + vacantLossStudios;

    // Impayés & Restes à payer en cours sur logements occupés
    const unpaidRentArrears = units.reduce((acc, u) => {
      if (u.status === 'LATE') return acc + (u.tenant?.balanceDue || u.monthlyRent);
      if (u.status === 'PARTIAL') return acc + (u.tenant?.balanceDue || 0);
      return acc;
    }, 0);

    // Manque à gagner total (Pertes virtuelles = Impayés en cours + Logements vacants)
    const totalVirtualLoss = unpaidRentArrears + totalVacancyLoss;

    // Revenus encaissés sur le mois courant (Octobre = index 9) + Cautions détenues
    const currentMonthPoint = annualFinancials[9] || annualFinancials[0];
    const totalDepositsHeld = units.reduce((acc, u) => acc + (u.tenant?.depositPaid || 0), 0);
    const totalDepositsMissing = units.reduce(
      (acc, u) =>
        acc + (u.tenant ? Math.max(0, u.tenant.depositRequired - u.tenant.depositPaid) : 0),
      0
    );

    const paidExpensesTotal = expenses
      .filter((e) => e.status === 'PAID')
      .reduce((acc, e) => acc + e.actualCost, 0);

    const plannedExpensesTotal = expenses
      .filter((e) => e.status !== 'PAID')
      .reduce((acc, e) => acc + (e.actualCost > 0 ? e.actualCost : e.estimatedCost), 0);

    return {
      vacantRoomsCount: vacantRooms.length,
      vacantStudiosCount: vacantStudios.length,
      vacantLossRooms,
      vacantLossStudios,
      totalVacancyLoss,
      unpaidRentArrears,
      totalVirtualLoss,
      currentMonthPoint,
      totalDepositsHeld,
      totalDepositsMissing,
      paidExpensesTotal,
      plannedExpensesTotal,
    };
  }, [units, expenses, annualFinancials]);

  // Totaux Annuels sur 12 mois
  const annualTotals = useMemo(() => {
    const totalIncome = annualFinancials.reduce((acc, m) => acc + m.totalIncome, 0);
    const totalExpenses = annualFinancials.reduce((acc, m) => acc + m.expensesAndWorks, 0);
    const totalNet = totalIncome - totalExpenses;
    const maxMonthValue = Math.max(
      ...annualFinancials.map((m) => Math.max(m.totalIncome, m.expensesAndWorks, m.netProfit)),
      1000000
    );
    return { totalIncome, totalExpenses, totalNet, maxMonthValue };
  }, [annualFinancials]);

  // Prévisionnel budgétaire interactif
  const forecast = useMemo(() => {
    const fullPotentialMonthly = units.reduce((acc, u) => acc + u.monthlyRent, 0);
    const projectedMonthlyRent = Math.round(fullPotentialMonthly * (targetOccupancyPct / 100));
    const projectedAnnualRent = projectedMonthlyRent * 12;
    const projectedAnnualWorks = monthlyBudgetWorks * 12;
    const projectedAnnualNet = projectedAnnualRent - projectedAnnualWorks;
    return {
      fullPotentialMonthly,
      projectedMonthlyRent,
      projectedAnnualRent,
      projectedAnnualWorks,
      projectedAnnualNet,
    };
  }, [units, targetOccupancyPct, monthlyBudgetWorks]);

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addExpense({
      title: title.trim(),
      unitCode,
      category,
      status,
      estimatedCost: Number(estimatedCost) || 0,
      actualCost: Number(actualCost) || 0,
      date,
      notes: notes.trim(),
    });
    setTitle('');
    setNotes('');
  };

  const getCategoryLabel = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'BOREHOLE':
        return '💧 Forage & Pompe';
      case 'PLUMBING':
        return '🚰 Plomberie';
      case 'PAINTING':
        return '🎨 Peinture & Maçonnerie';
      case 'ELECTRICITY':
        return '⚡ Électricité / ENEO';
      case 'STAFF':
        return '👮 Gardiennage & Entretien';
      case 'OTHER':
        return '🔧 Autre Maintenance';
    }
  };

  return (
    <div className="space-y-8">
      {/* 0. BARRE D'EXPORT EXCEL (.XLSX) : RAPPORT MENSUEL DYNAMIQUE */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#0F172A] text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#10B981] flex items-center justify-center shrink-0 shadow-sm">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Rapport Mensuel Dynamique (Export Excel .xlsx)
            </h2>
            <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
              Génère un classeur Excel à 2 onglets : <strong>État Mensuel des Logements</strong> +{' '}
              <strong>Synthèse Financière & Travaux</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="Mois du rapport Excel"
            value={reportMonth}
            onChange={(e) => setReportMonth(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>

          <select
            aria-label="Année du rapport Excel"
            value={reportYear}
            onChange={(e) => setReportYear(Number(e.target.value))}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm cursor-pointer"
          >
            {[2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              downloadMonthlyExcelReport({
                buildingName: activeBuilding.name,
                monthIndex: reportMonth,
                year: reportYear,
                units,
                payments,
                expenses,
              })
            }
            className="px-5 py-3 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger le Rapport Mensuel (Excel)</span>
          </button>
        </div>
      </div>

      {/* 1. CARTES DE SYNTHÈSE FINANCIÈRE : REVENUS ENCAISSÉS vs MANQUE À GAGNER vs DÉPENSES vs BÉNÉFICE NET */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Carte 1 : Revenus Encaissés (Vert) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-5 border-2 border-emerald-200 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#065F46] mb-2">
            <span>1. Revenus Encaissés (Mois)</span>
            <Wallet className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#065F46]">
            {formatFCFA(monthlyMetrics.currentMonthPoint.totalIncome)}
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100 text-xs space-y-1 text-slate-600 font-semibold">
            <div className="flex justify-between">
              <span>Loyers perçus :</span>
              <strong className="text-slate-900">
                {formatFCFA(monthlyMetrics.currentMonthPoint.incomeRent)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Eau (Forage) + Charges :</span>
              <strong className="text-slate-900">
                {formatFCFA(monthlyMetrics.currentMonthPoint.incomeUtilitiesAndDeposits)}
              </strong>
            </div>
            <div className="flex justify-between text-[#065F46]">
              <span>Cautions en caisse :</span>
              <strong>{formatFCFA(monthlyMetrics.totalDepositsHeld)}</strong>
            </div>
          </div>
        </motion.div>

        {/* Carte 2 : Manque à gagner (Pertes virtuelles = Impayés + Vacants) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 border-2 border-amber-300 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#B45309] mb-2">
            <span>2. Manque à Gagner (Pertes Virtuelles)</span>
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#B45309]">
            {formatFCFA(monthlyMetrics.totalVirtualLoss)}
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 text-xs space-y-1 text-slate-700 font-semibold">
            <div className="flex justify-between">
              <span>Impayés & Restes en cours :</span>
              <strong className="text-[#EF4444]">
                {formatFCFA(monthlyMetrics.unpaidRentArrears)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>
                {monthlyMetrics.vacantRoomsCount} Chambres vides :
              </span>
              <strong>{formatFCFA(monthlyMetrics.vacantLossRooms)}</strong>
            </div>
            <div className="flex justify-between">
              <span>
                {monthlyMetrics.vacantStudiosCount} Studios vides :
              </span>
              <strong>{formatFCFA(monthlyMetrics.vacantLossStudios)}</strong>
            </div>
          </div>
        </motion.div>

        {/* Carte 3 : Dépenses & Travaux (Rouge) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 border-2 border-red-200 shadow-sm"
        >
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#991B1B] mb-2">
            <span>3. Dépenses & Travaux (Mois)</span>
            <TrendingDown className="w-5 h-5 text-[#EF4444]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#991B1B]">
            {formatFCFA(
              monthlyMetrics.paidExpensesTotal + monthlyMetrics.plannedExpensesTotal
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-red-100 text-xs space-y-1 text-slate-600 font-semibold">
            <div className="flex justify-between">
              <span>Travaux & Salaires payés :</span>
              <strong className="text-[#991B1B]">
                {formatFCFA(monthlyMetrics.paidExpensesTotal)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>En cours / À faire (estimé) :</span>
              <strong className="text-amber-800">
                {formatFCFA(monthlyMetrics.plannedExpensesTotal)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Nombre d’interventions :</span>
              <strong>{expenses.length} dossier(s)</strong>
            </div>
          </div>
        </motion.div>

        {/* Carte 4 : Bénéfice Net Réel (Bleu) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-[#0F172A] to-[#1E3A8A] text-white rounded-2xl p-5 shadow-md"
        >
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-blue-300 mb-2">
            <span>4. Bénéfice Net Réel (Annuel)</span>
            <TrendingUp className="w-5 h-5 text-blue-300" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {formatFCFA(annualTotals.totalNet)}
          </div>
          <div className="mt-3 pt-3 border-t border-blue-800/80 text-xs space-y-1 text-blue-100 font-semibold">
            <div className="flex justify-between">
              <span>Total Entrées 2026 :</span>
              <strong className="text-emerald-300">{formatFCFA(annualTotals.totalIncome)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Total Dépenses 2026 :</span>
              <strong className="text-red-300">-{formatFCFA(annualTotals.totalExpenses)}</strong>
            </div>
            <div className="flex justify-between text-white">
              <span>Bénéfice Net Octobre :</span>
              <strong>{formatFCFA(monthlyMetrics.currentMonthPoint.netProfit)}</strong>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Encadré Détaillé du Manque à Gagner (Pertes Virtuelles) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-[#B45309] flex items-center justify-center">
              <DoorOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Détail du Manque à Gagner ce Mois-ci ({activeBuilding.name})
              </h3>
              <p className="text-xs sm:text-sm text-slate-600">
                Calcul automatique : <strong>Impayés en cours</strong> +{' '}
                <strong>Logements vacants</strong> ={' '}
                <strong className="text-[#B45309]">
                  {formatFCFA(monthlyMetrics.totalVirtualLoss)}
                </strong>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              A. Chambres Vacantes ({monthlyMetrics.vacantRoomsCount} CH)
            </div>
            <div className="text-xl font-extrabold text-slate-800 mt-1">
              {monthlyMetrics.vacantRoomsCount} × 32 000 FCFA ={' '}
              <span className="text-[#B45309]">{formatFCFA(monthlyMetrics.vacantLossRooms)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Portes libres :{' '}
              {units
                .filter((u) => u.status === 'VACANT' && u.type === 'ROOM')
                .map((u) => u.code)
                .join(', ') || 'Aucune'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              B. Studios Vacants ({monthlyMetrics.vacantStudiosCount} ST)
            </div>
            <div className="text-xl font-extrabold text-slate-800 mt-1">
              {monthlyMetrics.vacantStudiosCount} × 50 000 FCFA ={' '}
              <span className="text-[#B45309]">
                {formatFCFA(monthlyMetrics.vacantLossStudios)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Studios libres :{' '}
              {units
                .filter((u) => u.status === 'VACANT' && u.type === 'STUDIO')
                .map((u) => u.code)
                .join(', ') || 'Aucun'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200">
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#991B1B]">
              C. Impayés & Soldes Partiels en Cours
            </div>
            <div className="text-xl font-extrabold text-[#EF4444] mt-1">
              {formatFCFA(monthlyMetrics.unpaidRentArrears)}
            </div>
            <p className="text-xs text-red-900 mt-1">
              Somme exacte des retards et acomptes restant à encaisser auprès des locataires actifs.
            </p>
          </div>
        </div>
      </div>

      {/* 2. GRAPHIQUE BILAN NET ANNUEL (JANVIER À DÉCEMBRE) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-[#0F172A]">
                Bilan Net Annuel Mois par Mois (Entrées vs Dépenses = Bénéfice Net Réel)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Visualisation directe de la rentabilité de la {activeBuilding.name} sur les 12 mois
                de l’année.
              </p>
            </div>
          </div>

          {/* Légende Couleurs Officielle */}
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-extrabold">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#10B981]" />
              <span className="text-[#065F46]">Entrées Encaissées (Vert)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#EF4444]" />
              <span className="text-[#991B1B]">Dépenses & Travaux (Rouge)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-[#2563EB]" />
              <span className="text-[#1E3A8A]">Bénéfice Net Réel (Bleu)</span>
            </div>
          </div>
        </div>

        {/* Graphique en Bâtons Comparatifs Interactifs */}
        <div className="pt-4 overflow-x-auto">
          <div className="min-w-[780px] grid grid-cols-12 gap-3 items-end h-72 pt-8 pb-2 px-2 bg-slate-50/70 rounded-2xl border border-slate-200/80">
            {annualFinancials.map((m) => {
              const incomeHeightPct = Math.round(
                (m.totalIncome / annualTotals.maxMonthValue) * 100
              );
              const expenseHeightPct = Math.round(
                (m.expensesAndWorks / annualTotals.maxMonthValue) * 100
              );
              const netHeightPct = Math.round(
                (Math.max(0, m.netProfit) / annualTotals.maxMonthValue) * 100
              );
              const isCurrentMonth = m.monthIndex === 9;

              return (
                <div
                  key={m.monthIndex}
                  className={`flex flex-col items-center h-full justify-end group relative p-1.5 rounded-xl transition-colors ${
                    isCurrentMonth ? 'bg-blue-100/60 ring-2 ring-[#2563EB]' : 'hover:bg-slate-100'
                  }`}
                >
                  {/* Infobulle au survol */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20 bg-[#0F172A] text-white text-[11px] rounded-xl p-2.5 shadow-xl w-44">
                    <div className="font-extrabold text-blue-300 mb-1">{m.monthFull}</div>
                    <div className="flex justify-between">
                      <span>Entrées :</span>
                      <span className="text-emerald-300 font-bold">
                        {formatFCFA(m.totalIncome, false)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dépenses :</span>
                      <span className="text-red-300 font-bold">
                        -{formatFCFA(m.expensesAndWorks, false)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 mt-1 pt-1 font-extrabold">
                      <span>Net :</span>
                      <span className="text-blue-300">{formatFCFA(m.netProfit, false)}</span>
                    </div>
                  </div>

                  {/* Trois barres : Entrées (Vert), Dépenses (Rouge), Bénéfice Net (Bleu) */}
                  <div className="w-full flex items-end justify-center gap-1 h-48">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${incomeHeightPct}%` }}
                      transition={{ duration: 0.6, delay: m.monthIndex * 0.03 }}
                      className="w-3 sm:w-3.5 rounded-t-md bg-[#10B981]"
                      title={`Entrées : ${formatFCFA(m.totalIncome)}`}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${expenseHeightPct}%` }}
                      transition={{ duration: 0.6, delay: m.monthIndex * 0.03 + 0.05 }}
                      className="w-3 sm:w-3.5 rounded-t-md bg-[#EF4444]"
                      title={`Dépenses : ${formatFCFA(m.expensesAndWorks)}`}
                    />
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${netHeightPct}%` }}
                      transition={{ duration: 0.6, delay: m.monthIndex * 0.03 + 0.1 }}
                      className="w-3 sm:w-3.5 rounded-t-md bg-[#2563EB]"
                      title={`Bénéfice Net : ${formatFCFA(m.netProfit)}`}
                    />
                  </div>

                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-extrabold ${
                        isCurrentMonth ? 'text-[#2563EB]' : 'text-[#0F172A]'
                      }`}
                    >
                      {m.monthShort}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">
                      {Math.round(m.netProfit / 1000)}k
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. JOURNAL DES DÉPENSES & TRAVAUX DE MAINTENANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulaire d'ajout d'une dépense ou d'un travail */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center">
              <Wrench className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Ajouter un Travail ou une Dépense
              </h3>
              <p className="text-xs text-slate-500">
                Pompe forage, peinture chambre, plomberie, salaire gardien...
              </p>
            </div>
          </div>

          <form onSubmit={handleAddExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Intitulé de la dépense / intervention *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Réparation pompe forage, Peinture CH14..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Catégorie
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A] bg-white"
                >
                  <option value="BOREHOLE">💧 Forage & Eau</option>
                  <option value="PLUMBING">🚰 Plomberie</option>
                  <option value="PAINTING">🎨 Peinture & Rénovation</option>
                  <option value="ELECTRICITY">⚡ Électricité / ENEO</option>
                  <option value="STAFF">👮 Salaire Gardien / Personnel</option>
                  <option value="OTHER">🔧 Autre Dépense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Logement ou Zone concernée
                </label>
                <select
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A] bg-white"
                >
                  <option value="Parties Communes">Parties Communes</option>
                  <option value="Forage Général">Forage Général</option>
                  <option value="Toiture & Façade">Toiture & Façade</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.code}>
                      Porte {u.code} ({u.type === 'STUDIO' ? 'Studio' : 'Chambre'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Coût Estimé (FCFA)
                </label>
                <input
                  type="number"
                  step={500}
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Coût Réel Payé (FCFA)
                </label>
                <input
                  type="number"
                  step={500}
                  value={actualCost}
                  onChange={(e) => setActualCost(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-extrabold text-[#991B1B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Statut de l’intervention
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm font-extrabold text-[#0F172A] bg-white"
                >
                  <option value="TODO">📌 À faire / Prévu</option>
                  <option value="IN_PROGRESS">🔨 En cours de réalisation</option>
                  <option value="PAID">✅ Terminé & Payé</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Note / Artisan / Observation
              </label>
              <input
                type="text"
                placeholder="Ex: Technicien M. Essomba, facture reçue..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-[#0F172A]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Ajouter au Journal des Travaux & Dépenses</span>
            </button>
          </form>
        </div>

        {/* Liste Interactive des Dépenses & Travaux */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#0F172A]">
                  Journal des Dépenses & Travaux ({expenses.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Cliquez sur le statut d’une dépense pour la faire passer de « À faire » → « En
                  cours » → « Payé ».
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#0F172A] text-white text-xs font-extrabold">
                        {exp.unitCode}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {getCategoryLabel(exp.category)}
                      </span>
                      <span className="text-xs text-slate-400">• {formatDateFR(exp.date)}</span>
                    </div>
                    <h4 className="font-extrabold text-base text-[#0F172A]">{exp.title}</h4>
                    {exp.notes && <p className="text-xs text-slate-600">{exp.notes}</p>}
                    <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                      <span className="text-slate-600">
                        Coût estimé : <strong>{formatFCFA(exp.estimatedCost)}</strong>
                      </span>
                      <span className="text-[#991B1B] font-extrabold">
                        Coût réel : {formatFCFA(exp.actualCost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      aria-label={`Statut de la dépense ${exp.title}`}
                      value={exp.status}
                      onChange={(e) =>
                        updateExpense({
                          ...exp,
                          status: e.target.value as ExpenseStatus,
                          actualCost:
                            e.target.value === 'PAID' && exp.actualCost === 0
                              ? exp.estimatedCost
                              : exp.actualCost,
                        })
                      }
                      className={`px-3 py-2 rounded-xl font-extrabold text-xs border cursor-pointer ${
                        exp.status === 'PAID'
                          ? 'bg-emerald-100 text-[#065F46] border-emerald-300'
                          : exp.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-slate-200 text-slate-800 border-slate-300'
                      }`}
                    >
                      <option value="TODO">📌 À faire</option>
                      <option value="IN_PROGRESS">🔨 En cours</option>
                      <option value="PAID">✅ Payé</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => deleteExpense(exp.id)}
                      title="Supprimer cette dépense"
                      className="p-2 rounded-xl text-slate-400 hover:text-[#EF4444] hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODULE DE PRÉVISIONNEL BUDGÉTAIRE ANNUEL */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#0F172A] text-white rounded-3xl p-6 sm:p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">
              Simulateur de Prévisionnel Budgétaire Annuel ({activeBuilding.name})
            </h3>
            <p className="text-xs sm:text-sm text-blue-200">
              Ajustez le taux d’occupation cible et le budget mensuel de maintenance pour projeter
              votre bénéfice net sur 12 mois.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-5 bg-slate-900/70 p-5 rounded-2xl border border-slate-700">
            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Taux d’occupation cible des {units.length} unités :</span>
                <span className="text-blue-300 font-extrabold">{targetOccupancyPct}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={targetOccupancyPct}
                onChange={(e) => setTargetOccupancyPct(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>50%</span>
                <span>Potentiel 100% : {formatFCFA(forecast.fullPotentialMonthly)} / mois</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-bold mb-2">
                <span>Provision mensuelle Travaux & Charges (Gardien, Forage) :</span>
                <span className="text-amber-300 font-extrabold">
                  {formatFCFA(monthlyBudgetWorks)} / mois
                </span>
              </div>
              <input
                type="range"
                min={50000}
                max={350000}
                step={10000}
                value={monthlyBudgetWorks}
                onChange={(e) => setMonthlyBudgetWorks(Number(e.target.value))}
                className="w-full accent-[#F59E0B] cursor-pointer"
              />
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700">
              <div className="text-xs font-bold uppercase text-emerald-300">
                Entrées Annuelles Prévues
              </div>
              <div className="text-xl font-extrabold text-white mt-1">
                {formatFCFA(forecast.projectedAnnualRent)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Soit {formatFCFA(forecast.projectedMonthlyRent)} / mois
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700">
              <div className="text-xs font-bold uppercase text-red-300">
                Budget Annuel Travaux
              </div>
              <div className="text-xl font-extrabold text-white mt-1">
                -{formatFCFA(forecast.projectedAnnualWorks)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Sur 12 mois glissants</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#2563EB] border border-blue-400 shadow-lg">
              <div className="text-xs font-extrabold uppercase text-blue-100 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bénéfice Net Projeté</span>
              </div>
              <div className="text-xl font-extrabold text-white mt-1">
                {formatFCFA(forecast.projectedAnnualNet)}
              </div>
              <div className="text-xs text-blue-100 mt-1">Net dans la poche du bailleur</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
