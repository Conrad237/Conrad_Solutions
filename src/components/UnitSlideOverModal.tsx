import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  CreditCard,
  Droplets,
  FileText,
  Home,
  MessageCircle,
  Printer,
  Save,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { STANDARD_ADVANCE_MONTHS, STANDARD_DEPOSIT_MONTHS } from '@config/constants';
import { useApp } from '../context/AppContext';
import {
  PaymentMethod,
  PaymentRecord,
  RentalUnit,
  TenantInfo,
  TenantProfileType,
  UnitStatus,
} from '../types';
import {
  addMonthsToDate,
  buildGuarantorWhatsAppUrl,
  buildReceiptWhatsAppUrl,
  buildTenantWhatsAppUrl,
  calculateSlidingRentPayment,
  formatDateFR,
  formatFCFA,
  getPaymentMethodLabel,
  getStatusConfig,
} from '../utils/formatters';

interface UnitSlideOverModalProps {
  unit: RentalUnit | null;
  initialTab?: 'INFO' | 'PAYMENT' | 'UTILITIES';
  onClose: () => void;
  onOpenReceipt: (payment: PaymentRecord) => void;
}

export const UnitSlideOverModal: React.FC<UnitSlideOverModalProps> = ({
  unit,
  initialTab = 'INFO',
  onClose,
  onOpenReceipt,
}) => {
  const {
    units,
    payments,
    settings,
    updateUnitAndTenant,
    vacateUnit,
    updateUtilityReading,
    recordPayment,
  } = useApp();

  const liveUnit = units.find((u) => u.id === unit?.id) || unit;

  const [activeSubTab, setActiveSubTab] = useState<'INFO' | 'PAYMENT' | 'UTILITIES'>(initialTab);
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [lastCreatedReceipt, setLastCreatedReceipt] = useState<PaymentRecord | null>(null);

  // États du formulaire Locataire & Garant
  const [monthlyRent, setMonthlyRent] = useState<number>(32000);
  const [unitStatus, setUnitStatus] = useState<UnitStatus>('PAID');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+237 6');
  const [cniNumber, setCniNumber] = useState('');
  const [profileType, setProfileType] = useState<TenantProfileType>('STUDENT');
  const [moveInDate, setMoveInDate] = useState('2026-10-01');
  const [rentValidUntil, setRentValidUntil] = useState('2026-11-30');
  const [monthsCovered, setMonthsCovered] = useState(1);
  const [depositRequired, setDepositRequired] = useState(32000);
  const [depositPaid, setDepositPaid] = useState(32000);
  const [advanceMonthsAtEntry, setAdvanceMonthsAtEntry] = useState(STANDARD_ADVANCE_MONTHS);
  const [amountPaidCurrentPeriod, setAmountPaidCurrentPeriod] = useState(32000);
  const [balanceDue, setBalanceDue] = useState(0);
  const [creditBalance, setCreditBalance] = useState(0);
  const [arrangementNotes, setArrangementNotes] = useState('');

  // Garant
  const [noGuarantorRequired, setNoGuarantorRequired] = useState(false);
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorRelation, setGuarantorRelation] = useState('Père');
  const [guarantorPhone, setGuarantorPhone] = useState('+237 6');
  const [guarantorCityProf, setGuarantorCityProf] = useState('');

  // États du Moteur de Paiement (Compte Courant Glissant)
  const [payMonths, setPayMonths] = useState<number>(1);
  const [payPeriodLabel, setPayPeriodLabel] = useState('Novembre 2026');
  const [payRentAmount, setPayRentAmount] = useState<number>(32000);
  const [includeWater, setIncludeWater] = useState<boolean>(false);
  const [payWaterAmount, setPayWaterAmount] = useState<number>(0);
  const [includeElec, setIncludeElec] = useState<boolean>(false);
  const [payElecAmount, setPayElecAmount] = useState<number>(0);
  const [payDepositSupplement, setPayDepositSupplement] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('ORANGE_MONEY');
  const [payNotes, setPayNotes] = useState('');

  // États Relevé Eau (Forage) & Électricité (ENEO)
  const [waterMode, setWaterMode] = useState<'METER' | 'FLAT'>('METER');
  const [waterOldIndex, setWaterOldIndex] = useState(0);
  const [waterNewIndex, setWaterNewIndex] = useState(0);
  const [waterUnitPrice, setWaterUnitPrice] = useState(settings.waterM3Price);
  const [waterFlatAmount, setWaterFlatAmount] = useState(settings.waterFlatFee);
  const [waterPaid, setWaterPaid] = useState(true);

  const [elecMode, setElecMode] = useState<'METER' | 'FLAT'>('METER');
  const [elecOldIndex, setElecOldIndex] = useState(0);
  const [elecNewIndex, setElecNewIndex] = useState(0);
  const [elecUnitPrice, setElecUnitPrice] = useState(settings.electricityKwhPrice);
  const [elecFlatAmount, setElecFlatAmount] = useState(settings.electricityFlatFee);
  const [elecPaid, setElecPaid] = useState(true);

  useEffect(() => {
    setActiveSubTab(initialTab);
    setLastCreatedReceipt(null);
  }, [unit?.id, initialTab]);

  useEffect(() => {
    if (!liveUnit) return;
    setMonthlyRent(liveUnit.monthlyRent);
    setUnitStatus(liveUnit.status === 'VACANT' ? 'PAID' : liveUnit.status);

    if (liveUnit.tenant) {
      const t = liveUnit.tenant;
      setFullName(t.fullName);
      setPhone(t.phone);
      setCniNumber(t.cniNumber);
      setProfileType(t.profileType);
      setMoveInDate(t.moveInDate);
      setRentValidUntil(t.rentValidUntil);
      setMonthsCovered(t.monthsCovered);
      setDepositRequired(t.depositRequired);
      setDepositPaid(t.depositPaid);
      setAdvanceMonthsAtEntry(t.advanceMonthsAtEntry);
      setAmountPaidCurrentPeriod(t.amountPaidCurrentPeriod);
      setBalanceDue(t.balanceDue);
      setCreditBalance(t.creditBalance || 0);
      setArrangementNotes(t.arrangementNotes);
      setNoGuarantorRequired(t.guarantor.noGuarantorRequired);
      setGuarantorName(t.guarantor.fullName);
      setGuarantorRelation(t.guarantor.relationship || 'Père');
      setGuarantorPhone(t.guarantor.phone || '+237 6');
      setGuarantorCityProf(t.guarantor.cityAndProfession);

      const defaultExpected =
        t.balanceDue > 0
          ? t.balanceDue
          : Math.max(0, liveUnit.monthlyRent - (t.creditBalance || 0));
      setPayMonths(1);
      setPayRentAmount(defaultExpected);
      setPayPeriodLabel(
        t.balanceDue > 0 ? 'Régularisation solde Octobre 2026' : 'Loyer Novembre 2026'
      );
    } else {
      setFullName('');
      setPhone('+237 6');
      setCniNumber('');
      setProfileType(liveUnit.type === 'ROOM' ? 'STUDENT' : 'EMPLOYEE');
      setMoveInDate('2026-10-26');
      setRentValidUntil('2026-12-26');
      setMonthsCovered(2);
      setDepositRequired(liveUnit.monthlyRent * STANDARD_DEPOSIT_MONTHS);
      setDepositPaid(liveUnit.monthlyRent * STANDARD_DEPOSIT_MONTHS);
      setAdvanceMonthsAtEntry(STANDARD_ADVANCE_MONTHS);
      setAmountPaidCurrentPeriod(liveUnit.monthlyRent * STANDARD_ADVANCE_MONTHS);
      setBalanceDue(0);
      setCreditBalance(0);
      setArrangementNotes('');
      setNoGuarantorRequired(liveUnit.type === 'STUDIO');
      setGuarantorName('');
      setGuarantorRelation('Père');
      setGuarantorPhone('+237 6');
      setGuarantorCityProf('');
    }

    const u = liveUnit.utilities;
    setWaterMode(u.waterMode);
    setWaterOldIndex(u.waterOldIndex);
    setWaterNewIndex(u.waterNewIndex);
    setWaterUnitPrice(u.waterUnitPrice || settings.waterM3Price);
    setWaterFlatAmount(u.waterAmountDue || settings.waterFlatFee);
    setWaterPaid(u.waterPaid);

    setElecMode(u.electricityMode);
    setElecOldIndex(u.electricityOldIndex);
    setElecNewIndex(u.electricityNewIndex);
    setElecUnitPrice(u.electricityUnitPrice || settings.electricityKwhPrice);
    setElecFlatAmount(u.electricityAmountDue || settings.electricityFlatFee);
    setElecPaid(u.electricityPaid);

    setIncludeWater(!u.waterPaid && u.waterAmountDue > 0);
    setPayWaterAmount(!u.waterPaid ? u.waterAmountDue : 0);
    setIncludeElec(!u.electricityPaid && u.electricityAmountDue > 0);
    setPayElecAmount(!u.electricityPaid ? u.electricityAmountDue : 0);
    setPayDepositSupplement(0);
    setPayNotes('');
  }, [liveUnit, settings]);

  if (!liveUnit) return null;

  const unitPayments = payments.filter((p) => p.unitId === liveUnit.id);
  const statusCfg = getStatusConfig(liveUnit.status);

  // Calcul en temps réel du Compte Courant Locataire Glissant
  const slidingCalc = calculateSlidingRentPayment(
    payRentAmount,
    monthlyRent,
    liveUnit.tenant?.balanceDue || 0,
    liveUnit.tenant?.creditBalance || 0
  );

  const handleMonthsPresetChange = (months: number) => {
    setPayMonths(months);
    const existingCredit = liveUnit.tenant?.creditBalance || 0;
    const expected =
      months === 1 && liveUnit.tenant && liveUnit.tenant.balanceDue > 0
        ? liveUnit.tenant.balanceDue
        : Math.max(0, monthlyRent * months - existingCredit);
    setPayRentAmount(expected);
    if (months === 1) {
      setPayPeriodLabel(
        liveUnit.tenant && liveUnit.tenant.balanceDue > 0
          ? 'Solde / Octobre 2026 (1 mois)'
          : 'Novembre 2026 (1 mois)'
      );
    } else {
      setPayPeriodLabel(`Avance ${months} mois (${months} × ${formatFCFA(monthlyRent)})`);
    }
  };

  const totalCheckOutAmount =
    payRentAmount +
    (includeWater ? payWaterAmount : 0) +
    (includeElec ? payElecAmount : 0) +
    payDepositSupplement;

  const handleSaveTenantForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const autoStatus: UnitStatus =
      balanceDue > 0 && amountPaidCurrentPeriod === 0
        ? 'LATE'
        : balanceDue > 0
        ? 'PARTIAL'
        : unitStatus;

    const updatedTenant: TenantInfo = {
      id: liveUnit.tenant?.id || `tenant-${Date.now()}`,
      fullName: fullName.trim(),
      phone: phone.trim(),
      cniNumber: cniNumber.trim(),
      profileType,
      moveInDate,
      rentValidUntil,
      monthsCovered,
      depositRequired: Number(depositRequired) || 0,
      depositPaid: Number(depositPaid) || 0,
      advanceMonthsAtEntry: Number(advanceMonthsAtEntry) || 1,
      amountPaidCurrentPeriod: Number(amountPaidCurrentPeriod) || 0,
      balanceDue: Number(balanceDue) || 0,
      creditBalance: Number(creditBalance) || 0,
      arrangementNotes: arrangementNotes.trim(),
      guarantor: {
        noGuarantorRequired,
        fullName: noGuarantorRequired ? '' : guarantorName.trim(),
        relationship: noGuarantorRequired ? '' : guarantorRelation,
        phone: noGuarantorRequired ? '' : guarantorPhone.trim(),
        cityAndProfession: noGuarantorRequired ? '' : guarantorCityProf.trim(),
      },
    };

    updateUnitAndTenant(liveUnit.id, Number(monthlyRent) || 32000, autoStatus, updatedTenant);
    setSavedToast('Fiche du locataire et compte courant glissant enregistrés avec succès !');
    setTimeout(() => setSavedToast(null), 3500);
  };

  const handleVacateUnit = () => {
    if (
      window.confirm(
        `Voulez-vous vraiment libérer le logement ${liveUnit.code} et archiver le départ de ${liveUnit.tenant?.fullName} ?`
      )
    ) {
      vacateUnit(liveUnit.id);
      setSavedToast(`Le logement ${liveUnit.code} est désormais marqué comme Vacant.`);
      setTimeout(() => setSavedToast(null), 3500);
    }
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = recordPayment({
      unitId: liveUnit.id,
      monthsCovered: slidingCalc.monthsCovered,
      periodLabel:
        slidingCalc.newCreditBalance > 0
          ? `${slidingCalc.monthsCovered} mois + ${formatFCFA(slidingCalc.newCreditBalance)} d'avance`
          : payPeriodLabel,
      rentAmountPaid: Number(payRentAmount) || 0,
      waterAmountPaid: includeWater ? Number(payWaterAmount) || 0 : 0,
      electricityAmountPaid: includeElec ? Number(payElecAmount) || 0 : 0,
      depositAmountPaid: Number(payDepositSupplement) || 0,
      paymentMethod: payMethod,
      notes: payNotes.trim() || slidingCalc.summaryText,
      customRemainingBalance: slidingCalc.newBalanceDue,
      customCreditCarryOver: slidingCalc.newCreditBalance,
    });

    if (created) {
      setLastCreatedReceipt(created);
      setSavedToast(
        `Paiement de ${formatFCFA(created.totalPaid)} enregistré ! Quittance ${created.receiptNumber} générée.`
      );
      setTimeout(() => setSavedToast(null), 5000);
    }
  };

  const computedWaterDue =
    waterMode === 'METER'
      ? Math.max(0, waterNewIndex - waterOldIndex) * waterUnitPrice
      : waterFlatAmount;

  const computedElecDue =
    elecMode === 'METER'
      ? Math.max(0, elecNewIndex - elecOldIndex) * elecUnitPrice
      : elecFlatAmount;

  const handleSaveUtilities = (e: React.FormEvent) => {
    e.preventDefault();
    updateUtilityReading(liveUnit.id, {
      waterMode,
      waterOldIndex: Number(waterOldIndex) || 0,
      waterNewIndex: Number(waterNewIndex) || 0,
      waterUnitPrice: Number(waterUnitPrice) || settings.waterM3Price,
      waterAmountDue: computedWaterDue,
      waterPaid,
      electricityMode: elecMode,
      electricityOldIndex: Number(elecOldIndex) || 0,
      electricityNewIndex: Number(elecNewIndex) || 0,
      electricityUnitPrice: Number(elecUnitPrice) || settings.electricityKwhPrice,
      electricityAmountDue: computedElecDue,
      electricityPaid: elecPaid,
      lastReadingDate: '2026-10-26',
    });
    setSavedToast('Relevés Eau (Forage) et Électricité (ENEO) mis à jour !');
    setTimeout(() => setSavedToast(null), 3500);
  };

  const depositMissing = Math.max(0, depositRequired - depositPaid);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-xs no-print">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="w-full max-w-3xl bg-[#F8FAFC] h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
        >
          {/* En-tête du Panneau Latéral */}
          <div className="bg-[#0F172A] text-white px-6 py-5 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
              <div className="px-4 py-2.5 rounded-2xl bg-[#2563EB] font-extrabold text-xl tracking-tight flex items-center gap-2 shadow-md">
                <Home className="w-5 h-5 text-blue-200" />
                <span>{liveUnit.code}</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white">
                    {liveUnit.type === 'STUDIO' ? 'Studio Moderne' : 'Chambre Individuelle'} —{' '}
                    {liveUnit.floor === 0 ? 'Rez-de-chaussée' : `${liveUnit.floor}e Étage`}
                  </h2>
                  <span
                    className={`px-3 py-0.5 rounded-full text-xs font-extrabold border ${statusCfg.bgBadge}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-blue-200 mt-0.5">
                  Côté {liveUnit.side === 'LEFT_ODD' ? 'Gauche (Impair)' : 'Droit (Pair)'} • Tarif
                  appliqué : <strong>{formatFCFA(liveUnit.monthlyRent)} / mois</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Barre de sous-onglets du Slide-Over */}
          <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('INFO')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'INFO'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>1. Fiche Locataire, Garant & Arrangements</span>
            </button>

            {liveUnit.tenant && (
              <button
                type="button"
                onClick={() => setActiveSubTab('PAYMENT')}
                className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  activeSubTab === 'PAYMENT'
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'bg-blue-50 hover:bg-blue-100 text-[#1E3A8A]'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>2. Compte Courant & Encaisser un Paiement</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveSubTab('UTILITIES')}
              className={`px-4 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'UTILITIES'
                  ? 'bg-[#0F172A] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Droplets className="w-4 h-4 text-blue-500" />
              <span>3. Eau (Forage), ENEO & Historique ({unitPayments.length})</span>
            </button>
          </div>

          {/* Notification de sauvegarde */}
          {savedToast && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-emerald-50 border-2 border-[#10B981] text-emerald-950 font-bold text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                <span>{savedToast}</span>
              </div>
              {lastCreatedReceipt && (
                <button
                  type="button"
                  onClick={() => onOpenReceipt(lastCreatedReceipt)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0F172A] text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Ouvrir la Quittance</span>
                </button>
              )}
            </div>
          )}

          {/* Contenu déroulant */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* ================================================================= */}
            {/* ONGLET 1 : FICHE LOCATAIRE, GARANT & CONDITIONS FINANCIÈRES       */}
            {/* ================================================================= */}
            {activeSubTab === 'INFO' && (
              <form onSubmit={handleSaveTenantForm} className="space-y-6">
                {liveUnit.tenant && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Relances WhatsApp Directes (Sans API payante)
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Messages polis pré-remplis avec le nom, la porte {liveUnit.code} et le
                        montant attendu.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildTenantWhatsAppUrl(liveUnit, settings)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Relancer le Locataire sur WhatsApp</span>
                      </a>

                      {!noGuarantorRequired && guarantorPhone && (
                        <a
                          href={buildGuarantorWhatsAppUrl(liveUnit, settings)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Contacter le Garant sur WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 1 : Identité du Locataire */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-[#2563EB]" />
                      <span>
                        {liveUnit.tenant
                          ? '1. Informations du Locataire'
                          : `Installer un Nouveau Locataire dans ${liveUnit.code}`}
                      </span>
                    </h3>
                    {liveUnit.tenant && (
                      <button
                        type="button"
                        onClick={handleVacateUnit}
                        className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#EF4444] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Libérer le logement</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Nom Complet du Locataire *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Mbarga Jean-Claude"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Téléphone WhatsApp (+237) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+237 699 00 00 00"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Numéro CNI / Récépissé
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 110293847-CE01"
                        value={cniNumber}
                        onChange={(e) => setCniNumber(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Profil / Statut du Locataire
                      </label>
                      <select
                        value={profileType}
                        onChange={(e) => setProfileType(e.target.value as TenantProfileType)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A] bg-white"
                      >
                        <option value="STUDENT">Étudiant(e)</option>
                        <option value="EMPLOYEE">Salarié(e) / Fonctionnaire</option>
                        <option value="SELF_EMPLOYED">Commerçant / Indépendant / Autre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Date d’entrée dans les lieux
                      </label>
                      <input
                        type="date"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Fin de validité du loyer actuel
                      </label>
                      <input
                        type="date"
                        value={rentValidUntil}
                        onChange={(e) => setRentValidUntil(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2 : Bloc Garant / Parent */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-[#1E3A8A]" />
                        <span>2. Bloc Garant / Parent Référent</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Activé par défaut pour les Chambres (CH), optionnel pour les Studios (ST).
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={noGuarantorRequired}
                        onChange={(e) => setNoGuarantorRequired(e.target.checked)}
                        className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB]"
                      />
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                        Aucun garant requis (Locataire autonome)
                      </span>
                    </label>
                  </div>

                  {!noGuarantorRequired ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                          Nom Complet du Parent / Garant
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: M. Kamgaing Joseph"
                          value={guarantorName}
                          onChange={(e) => setGuarantorName(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                          Lien de Parenté
                        </label>
                        <select
                          value={guarantorRelation}
                          onChange={(e) => setGuarantorRelation(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A] bg-white"
                        >
                          <option value="Père">Père</option>
                          <option value="Mère">Mère</option>
                          <option value="Oncle">Oncle</option>
                          <option value="Tante">Tante</option>
                          <option value="Frère aîné / Sœur">Frère aîné / Sœur</option>
                          <option value="Tuteur / Employeur">Tuteur / Employeur</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                          Téléphone WhatsApp du Garant (+237)
                        </label>
                        <input
                          type="text"
                          placeholder="+237 699 00 11 22"
                          value={guarantorPhone}
                          onChange={(e) => setGuarantorPhone(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                          Ville & Profession du Garant
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Douala — Ingénieur / Commerçant"
                          value={guarantorCityProf}
                          onChange={(e) => setGuarantorCityProf(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-[#0F172A]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-600 font-medium">
                      Ce locataire est enregistré comme autonome (aucun garant requis). Vous pouvez
                      décocher la case ci-dessus à tout moment pour ajouter un parent ou garant.
                    </div>
                  )}
                </div>

                {/* Section 3 : Conditions Financières Flexibles & Compte Courant Glissant */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-base font-extrabold text-[#0F172A]">
                        3. Conditions Financières, Caution & Compte Courant Glissant
                      </h3>
                      <p className="text-xs text-slate-500">
                        Règle standard indicative : {STANDARD_DEPOSIT_MONTHS} mois de caution +{' '}
                        {STANDARD_ADVANCE_MONTHS} mois d’avance (100% personnalisable).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Loyer Mensuel Appliqué (FCFA)
                      </label>
                      <input
                        type="number"
                        step={500}
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-extrabold text-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Caution Exigée (FCFA)
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={depositRequired}
                        onChange={(e) => setDepositRequired(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Caution Réellement Versée
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={depositPaid}
                        onChange={(e) => setDepositPaid(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                      />
                    </div>
                  </div>

                  {depositMissing > 0 ? (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs sm:text-sm font-bold text-amber-900">
                      ⚠️ Caution incomplète : Le locataire a versé {formatFCFA(depositPaid)} sur{' '}
                      {formatFCFA(depositRequired)} exigés. Reste à compléter sur la caution :{' '}
                      <strong className="underline">{formatFCFA(depositMissing)}</strong>.
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-bold text-emerald-900">
                      ✅ Caution intégralement versée ({formatFCFA(depositPaid)}).
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Statut Locatif Actuel
                      </label>
                      <select
                        value={unitStatus}
                        onChange={(e) => setUnitStatus(e.target.value as UnitStatus)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-extrabold text-[#0F172A] bg-white"
                      >
                        <option value="PAID">🟢 À jour / Avance</option>
                        <option value="PARTIAL">🟠 Arrangement / Paiement partiel</option>
                        <option value="LATE">🔴 Impayé / En retard</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Reste à Payer (Solde dû FCFA)
                      </label>
                      <input
                        type="number"
                        step={1000}
                        value={balanceDue}
                        onChange={(e) => setBalanceDue(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-extrabold text-[#B45309]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-[#065F46] mb-1.5">
                        Crédit d’Avance Reporté (+)
                      </label>
                      <input
                        type="number"
                        step={500}
                        value={creditBalance}
                        onChange={(e) => setCreditBalance(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50/40 text-base font-extrabold text-[#065F46]"
                      />
                    </div>
                  </div>

                  {/* Zone Notes & Arrangements Verbaux */}
                  <div className="pt-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-1.5">
                      📝 Zone « Notes & Arrangements Verbaux » (Accords avec le locataire ou le
                      parent)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Le papa a promis de solder les 12 000 FCFA restants le 15 du mois par Orange Money..."
                      value={arrangementNotes}
                      onChange={(e) => setArrangementNotes(e.target.value)}
                      className="w-full p-4 rounded-xl border-2 border-amber-300 bg-amber-50/50 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    <Save className="w-5 h-5" />
                    <span>
                      {liveUnit.tenant
                        ? 'Enregistrer les Modifications'
                        : `Installer le Locataire dans ${liveUnit.code}`}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* ================================================================= */}
            {/* ONGLET 2 : COMPTE COURANT GLISSANT & MOTEUR DE PAIEMENT           */}
            {/* ================================================================= */}
            {activeSubTab === 'PAYMENT' && liveUnit.tenant && (
              <form onSubmit={handleRecordPaymentSubmit} className="space-y-6">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                        Compte Courant Locataire Glissant — {liveUnit.code} ({liveUnit.tenant.fullName})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Saisissez n’importe quel montant : l’application calcule automatiquement
                        les mois complets couverts, le reste à payer ou le crédit d’avance reporté.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-blue-50 text-[#1E3A8A] font-extrabold text-xs">
                      Loyer mensuel : {formatFCFA(monthlyRent)}
                    </span>
                  </div>

                  {/* Sélecteur rapide : Mois complets, Acompte 20 000 FCFA ou Avance Libre 100 000 FCFA */}
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                      1. Raccourcis de Paiement (Mois complets, Acompte partiel ou Avance avec
                      report de solde)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {[1, 2, 3, 6, 12].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleMonthsPresetChange(m)}
                          className={`py-2.5 px-2.5 rounded-xl font-extrabold text-xs border transition-all cursor-pointer ${
                            payRentAmount === monthlyRent * m
                              ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {m} Mois
                          <div className="text-[10px] font-medium opacity-85 mt-0.5">
                            {formatFCFA(monthlyRent * m, false)}
                          </div>
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setPayMonths(1);
                          setPayRentAmount(20000);
                          setPayPeriodLabel('Acompte partiel sur 1 mois');
                        }}
                        className="py-2.5 px-2.5 rounded-xl font-extrabold text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 cursor-pointer"
                      >
                        Acompte
                        <div className="text-[10px] font-bold mt-0.5">Ex: 20 000</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPayRentAmount(100000);
                          setPayPeriodLabel('Avance 100 000 FCFA (Report automatique)');
                        }}
                        className="py-2.5 px-2.5 rounded-xl font-extrabold text-xs bg-emerald-50 hover:bg-emerald-100 text-[#065F46] border border-emerald-300 cursor-pointer"
                      >
                        Avance Libre
                        <div className="text-[10px] font-bold mt-0.5">Ex: 100 000</div>
                      </button>
                    </div>
                  </div>

                  {/* Saisie du Montant Loyer & Libellé Période */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Montant du Loyer Versé Aujourd’hui (FCFA) *
                      </label>
                      <input
                        type="number"
                        step={500}
                        required
                        value={payRentAmount}
                        onChange={(e) => setPayRentAmount(Number(e.target.value))}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-[#2563EB] bg-blue-50/20 text-lg font-extrabold text-[#0F172A] focus:outline-none"
                      />
                      <span className="text-xs text-slate-500 mt-1 block">
                        Loyer unitaire : <strong>{formatFCFA(monthlyRent)} / mois</strong>
                        {(liveUnit.tenant.creditBalance || 0) > 0 && (
                          <span className="text-[#065F46] font-bold ml-1">
                            (+ {formatFCFA(liveUnit.tenant.creditBalance || 0)} d’avance déjà en
                            compte)
                          </span>
                        )}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Libellé Période sur la Quittance
                      </label>
                      <input
                        type="text"
                        required
                        value={payPeriodLabel}
                        onChange={(e) => setPayPeriodLabel(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A]"
                      />
                      <span className="text-xs text-slate-500 mt-1 block">
                        Nouvelle validité après paiement :{' '}
                        <strong>
                          {formatDateFR(
                            slidingCalc.newBalanceDue === 0
                              ? addMonthsToDate(
                                  liveUnit.tenant.rentValidUntil,
                                  slidingCalc.monthsCovered
                                )
                              : liveUnit.tenant.rentValidUntil
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Boîte Résultat Automatique du Compte Courant Glissant */}
                  <div
                    className={`p-4 rounded-2xl border-2 space-y-2 ${
                      slidingCalc.newBalanceDue > 0
                        ? 'bg-amber-50 border-[#F59E0B] text-amber-950'
                        : 'bg-emerald-50 border-[#10B981] text-emerald-950'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <Wallet className="w-4 h-4" />
                        <span>Calcul Automatique du Compte Courant Glissant</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/80 border">
                        {slidingCalc.monthsCovered} mois couvert(s)
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold leading-relaxed">
                      {slidingCalc.summaryText}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-black/10 text-xs">
                      <div className="p-2 rounded-xl bg-white/80">
                        <span className="text-slate-500 font-bold block">
                          Mois complets couverts :
                        </span>
                        <strong className="text-sm font-extrabold text-[#0F172A]">
                          {slidingCalc.monthsCovered} mois (
                          {formatFCFA(slidingCalc.rentConsumedForFullMonths)})
                        </strong>
                      </div>

                      <div className="p-2 rounded-xl bg-white/80">
                        <span className="text-slate-500 font-bold block">Reste à payer :</span>
                        <strong className="text-sm font-extrabold text-[#B45309]">
                          {formatFCFA(slidingCalc.newBalanceDue)}
                        </strong>
                      </div>

                      <div className="p-2 rounded-xl bg-white/80">
                        <span className="text-slate-500 font-bold block">
                          Crédit d’avance reporté :
                        </span>
                        <strong className="text-sm font-extrabold text-[#065F46]">
                          +{formatFCFA(slidingCalc.newCreditBalance)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Inclusion Optionnelle Eau (Forage), Électricité (ENEO) & Complément Caution */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      2. Ajouter Eau (Forage), Électricité (ENEO) ou Complément Caution sur ce reçu
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="flex items-center gap-2 font-bold text-xs text-slate-800 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeWater}
                            onChange={(e) => setIncludeWater(e.target.checked)}
                            className="w-4 h-4 rounded text-[#2563EB]"
                          />
                          <span>Inclure Eau (Forage)</span>
                        </label>
                        <input
                          type="number"
                          step={100}
                          disabled={!includeWater}
                          value={payWaterAmount}
                          onChange={(e) => setPayWaterAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold disabled:opacity-50"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="flex items-center gap-2 font-bold text-xs text-slate-800 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeElec}
                            onChange={(e) => setIncludeElec(e.target.checked)}
                            className="w-4 h-4 rounded text-[#2563EB]"
                          />
                          <span>Inclure Électricité (ENEO)</span>
                        </label>
                        <input
                          type="number"
                          step={100}
                          disabled={!includeElec}
                          value={payElecAmount}
                          onChange={(e) => setPayElecAmount(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold disabled:opacity-50"
                        />
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="block font-bold text-xs text-slate-800 mb-2">
                          Complément Caution (FCFA)
                        </label>
                        <input
                          type="number"
                          step={500}
                          value={payDepositSupplement}
                          onChange={(e) => setPayDepositSupplement(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mode de paiement & Note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        3. Mode de Paiement Utilisé
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            { id: 'ORANGE_MONEY', label: 'Orange Money' },
                            { id: 'MTN_MOMO', label: 'MTN MoMo' },
                            { id: 'CASH', label: 'Espèces (Cash)' },
                            { id: 'BANK_TRANSFER', label: 'Virement' },
                          ] as { id: PaymentMethod; label: string }[]
                        ).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPayMethod(m.id)}
                            className={`py-2.5 px-3 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                              payMethod === m.id
                                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                        Note sur la Quittance / Accord
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Laissez vide pour inscrire automatiquement le détail du calcul glissant..."
                        value={payNotes}
                        onChange={(e) => setPayNotes(e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-[#0F172A]"
                      />
                    </div>
                  </div>

                  {/* Bouton Validation Finale & Génération Quittance */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                        TOTAL À ENCAISSER SUR LA QUITTANCE :
                      </span>
                      <span className="text-2xl font-extrabold text-[#1E3A8A]">
                        {formatFCFA(totalCheckOutAmount)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="px-6 py-4 rounded-2xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/25 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Valider le Paiement & Générer la Quittance</span>
                    </button>
                  </div>
                </div>

                {/* Aperçu immédiat de la Quittance créée */}
                {lastCreatedReceipt && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 rounded-2xl bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] text-white flex flex-wrap items-center justify-between gap-4 shadow-lg"
                  >
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                        ✅ Quittance N° {lastCreatedReceipt.receiptNumber} Prête
                      </div>
                      <div className="text-lg font-extrabold mt-0.5">
                        Montant reçu : {formatFCFA(lastCreatedReceipt.totalPaid)}
                        {(lastCreatedReceipt.creditCarryOver || 0) > 0 && (
                          <span className="text-emerald-300 ml-2">
                            (Crédit reporté : +{formatFCFA(lastCreatedReceipt.creditCarryOver || 0)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(lastCreatedReceipt)}
                        className="px-4 py-2.5 rounded-xl bg-white text-[#0F172A] font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                      >
                        <Printer className="w-4 h-4 text-[#2563EB]" />
                        <span>Imprimer / PDF Quittance</span>
                      </button>

                      <a
                        href={buildReceiptWhatsAppUrl(lastCreatedReceipt, settings)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Envoyer le Reçu sur WhatsApp</span>
                      </a>
                    </div>
                  </motion.div>
                )}
              </form>
            )}

            {/* ================================================================= */}
            {/* ONGLET 3 : RELEVÉS EAU (FORAGE) & ÉLECTRICITÉ (ENEO) + HISTORIQUE */}
            {/* ================================================================= */}
            {activeSubTab === 'UTILITIES' && (
              <div className="space-y-6">
                <form
                  onSubmit={handleSaveUtilities}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5"
                >
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-extrabold text-[#0F172A]">
                      Sous-Compteurs Eau (Forage) & Électricité (ENEO) — Porte {liveUnit.code}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Saisissez l’ancien et le nouvel index pour calculer automatiquement le
                      montant, ou appliquez un forfait direct.
                    </p>
                  </div>

                  {/* Bloc Eau du Forage */}
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-[#1E3A8A]">
                        <Droplets className="w-5 h-5 text-[#2563EB]" />
                        <span>Facturation Eau (Forage Résidence)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setWaterMode('METER')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            waterMode === 'METER'
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white text-slate-700 border border-slate-300'
                          }`}
                        >
                          Par Index (m³)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaterMode('FLAT')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            waterMode === 'FLAT'
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white text-slate-700 border border-slate-300'
                          }`}
                        >
                          Forfait Direct
                        </button>
                      </div>
                    </div>

                    {waterMode === 'METER' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Ancien Index (m³)
                          </label>
                          <input
                            type="number"
                            value={waterOldIndex}
                            onChange={(e) => setWaterOldIndex(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Nouvel Index (m³)
                          </label>
                          <input
                            type="number"
                            value={waterNewIndex}
                            onChange={(e) => setWaterNewIndex(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Tarif m³ (FCFA)
                          </label>
                          <input
                            type="number"
                            value={waterUnitPrice}
                            onChange={(e) => setWaterUnitPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                          />
                        </div>
                        <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-blue-200">
                          <span className="text-[11px] font-bold text-slate-500">
                            Conso : {Math.max(0, waterNewIndex - waterOldIndex)} m³
                          </span>
                          <span className="text-base font-extrabold text-[#1E3A8A]">
                            {formatFCFA(computedWaterDue)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Montant Forfaitaire Eau (FCFA)
                        </label>
                        <input
                          type="number"
                          step={500}
                          value={waterFlatAmount}
                          onChange={(e) => setWaterFlatAmount(Number(e.target.value))}
                          className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                        />
                      </div>
                    )}

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waterPaid}
                        onChange={(e) => setWaterPaid(e.target.checked)}
                        className="w-4 h-4 rounded text-[#10B981]"
                      />
                      <span>Facture d’eau du mois déjà réglée par le locataire</span>
                    </label>
                  </div>

                  {/* Bloc Électricité ENEO */}
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-amber-900">
                        <Zap className="w-5 h-5 text-[#F59E0B]" />
                        <span>Facturation Électricité (Sous-Compteur ENEO)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setElecMode('METER')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            elecMode === 'METER'
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-white text-slate-700 border border-slate-300'
                          }`}
                        >
                          Par Index (kWh)
                        </button>
                        <button
                          type="button"
                          onClick={() => setElecMode('FLAT')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                            elecMode === 'FLAT'
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-white text-slate-700 border border-slate-300'
                          }`}
                        >
                          Forfait / Montant Direct
                        </button>
                      </div>
                    </div>

                    {elecMode === 'METER' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Ancien Index (kWh)
                          </label>
                          <input
                            type="number"
                            value={elecOldIndex}
                            onChange={(e) => setElecOldIndex(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Nouvel Index (kWh)
                          </label>
                          <input
                            type="number"
                            value={elecNewIndex}
                            onChange={(e) => setElecNewIndex(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                            Tarif kWh (FCFA)
                          </label>
                          <input
                            type="number"
                            value={elecUnitPrice}
                            onChange={(e) => setElecUnitPrice(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                          />
                        </div>
                        <div className="flex flex-col justify-center bg-white p-2.5 rounded-xl border border-amber-200">
                          <span className="text-[11px] font-bold text-slate-500">
                            Conso : {Math.max(0, elecNewIndex - elecOldIndex)} kWh
                          </span>
                          <span className="text-base font-extrabold text-amber-900">
                            {formatFCFA(computedElecDue)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Montant Direct Facture ENEO (FCFA)
                        </label>
                        <input
                          type="number"
                          step={500}
                          value={elecFlatAmount}
                          onChange={(e) => setElecFlatAmount(Number(e.target.value))}
                          className="w-full sm:w-64 px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-sm"
                        />
                      </div>
                    )}

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={elecPaid}
                        onChange={(e) => setElecPaid(e.target.checked)}
                        className="w-4 h-4 rounded text-[#10B981]"
                      />
                      <span>Facture ENEO du mois déjà réglée par le locataire</span>
                    </label>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-3 rounded-xl bg-[#0F172A] hover:bg-[#2563EB] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer les Index Eau & ENEO</span>
                    </button>
                  </div>
                </form>

                {/* Historique des Quittances de cette Porte */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#2563EB]" />
                    <span>
                      Historique des Quittances de la Porte {liveUnit.code} ({unitPayments.length})
                    </span>
                  </h3>

                  {unitPayments.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">
                      Aucune quittance enregistrée pour cette porte.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {unitPayments.map((p) => (
                        <div
                          key={p.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-[#0F172A]">
                                {p.receiptNumber}
                              </span>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-[#1E3A8A]">
                                {getPaymentMethodLabel(p.paymentMethod)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDateFR(p.paymentDate)}
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-slate-700 mt-1">
                              {p.periodLabel} — Total reçu :{' '}
                              <strong className="text-[#065F46]">{formatFCFA(p.totalPaid)}</strong>
                              {p.remainingBalanceAfterPayment > 0 && (
                                <span className="text-[#B45309] ml-2">
                                  (Reste : {formatFCFA(p.remainingBalanceAfterPayment)})
                                </span>
                              )}
                              {(p.creditCarryOver || 0) > 0 && (
                                <span className="text-[#065F46] font-extrabold ml-2">
                                  (Crédit d’avance reporté : +{formatFCFA(p.creditCarryOver || 0)})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenReceipt(p)}
                              className="px-3 py-2 rounded-lg bg-[#0F172A] hover:bg-[#2563EB] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Quittance PDF</span>
                            </button>
                            <a
                              href={buildReceiptWhatsAppUrl(p, settings)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WA</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
