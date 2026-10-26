import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Droplets, MessageCircle, Save, Zap } from 'lucide-react';
import { DEFAULT_WATER_FLAT_FEE, REDUCED_WATER_FLAT_FEE } from '@config/constants';
import { useApp } from '../context/AppContext';
import { RentalUnit } from '../types';
import {
  calculateUnitSeparatedBalances,
  formatFCFA,
  sanitizePhoneForWhatsApp,
} from '../utils/formatters';

interface UtilitiesManagementViewProps {
  onSelectUnit: (
    unit: RentalUnit,
    initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES' | 'DOCUMENTS'
  ) => void;
}

export const UtilitiesManagementView: React.FC<UtilitiesManagementViewProps> = ({
  onSelectUnit,
}) => {
  const { units, settings, updateUtilityReading } = useApp();
  const [floorFilter, setFloorFilter] = useState<'ALL' | 0 | 1 | 2 | 3>('ALL');
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [savedCode, setSavedCode] = useState<string | null>(null);

  const occupiedUnits = useMemo(() => {
    return units.filter((u) => {
      if (u.status === 'VACANT') return false;
      if (floorFilter !== 'ALL' && u.floor !== floorFilter) return false;
      if (onlyUnpaid) {
        const bal = calculateUnitSeparatedBalances(u);
        if (bal.waterRemainingDue === 0 && bal.electricityRemainingDue === 0) return false;
      }
      return true;
    });
  }, [units, floorFilter, onlyUnpaid]);

  const summary = useMemo(() => {
    const active = units.filter((u) => u.status !== 'VACANT');
    const totalWaterBilled = active.reduce(
      (acc, u) => acc + calculateUnitSeparatedBalances(u).waterFlatFee,
      0
    );
    const totalWaterUnpaid = active.reduce(
      (acc, u) => acc + calculateUnitSeparatedBalances(u).waterRemainingDue,
      0
    );
    const totalElecBilled = active.reduce(
      (acc, u) => acc + calculateUnitSeparatedBalances(u).electricityBilled,
      0
    );
    const totalElecPaidAdvances = active.reduce(
      (acc, u) => acc + calculateUnitSeparatedBalances(u).electricityPaidAmount,
      0
    );
    const totalElecUnpaid = active.reduce(
      (acc, u) => acc + calculateUnitSeparatedBalances(u).electricityRemainingDue,
      0
    );
    return {
      totalWaterBilled,
      totalWaterUnpaid,
      totalElecBilled,
      totalElecPaidAdvances,
      totalElecUnpaid,
    };
  }, [units]);

  const handleQuickUtilityUpdate = (
    unit: RentalUnit,
    newWaterFlatFee: number,
    waterPaid: boolean,
    elecBilled: number,
    elecPaidAmount: number,
    elecPaid: boolean
  ) => {
    const remainingElec = Math.max(0, elecBilled - elecPaidAmount);
    const creditElec = Math.max(0, elecPaidAmount - elecBilled);

    updateUtilityReading(unit.id, {
      ...unit.utilities,
      waterMode: 'FLAT',
      waterFlatFee: newWaterFlatFee,
      waterAmountDue: newWaterFlatFee,
      waterPaid,
      electricityAmountDue: elecBilled,
      electricityAmountPaid: elecPaidAmount,
      electricityBalanceDue: remainingElec,
      electricityCredit: creditElec,
      electricityPaid: elecPaid || remainingElec === 0,
      lastReadingDate: '2026-10-26',
    });

    setSavedCode(unit.code);
    setTimeout(() => setSavedCode(null), 2500);
  };

  const buildUtilityWhatsApp = (u: RentalUnit) => {
    const phone = sanitizePhoneForWhatsApp(u.tenant?.phone || '');
    const bal = calculateUnitSeparatedBalances(u);
    const totalDue = bal.waterRemainingDue + bal.electricityRemainingDue;

    const msg =
      `Bonjour ${u.tenant?.fullName || ''},\n\n` +
      `Voici le point mensuel Eau (Forfait Forage) & Électricité (ENEO) pour votre logement *${u.code}* (*Résidence Moro*) :\n` +
      `💧 *Forfait Mensuel Eau (Forage)* : *${formatFCFA(bal.waterFlatFee)} / mois* (${bal.waterRemainingDue === 0 ? 'Payé' : `Reste à payer : ${formatFCFA(bal.waterRemainingDue)}`})\n` +
      `⚡ *Électricité (ENEO)* :\n` +
      `   • Montant Facturé ENEO : ${formatFCFA(bal.electricityBilled)}\n` +
      `   • Avance / Acompte versé : ${formatFCFA(bal.electricityPaidAmount)}\n` +
      `   • *Reste à payer Électricité : ${formatFCFA(bal.electricityRemainingDue)}*\n` +
      `----------------------------------\n` +
      `• *Net à régler Eau + ENEO : ${formatFCFA(totalDue)}*\n` +
      `Règlement Orange Money : ${settings.orangeMoneyNumber} / MTN MoMo : ${settings.mtnMomoNumber}.\n` +
      `Cordialement, *${settings.ownerName}*`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Forfait Eau (Forage) & Électricité (ENEO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#2563EB] mb-1">
            <span>Forfaits Eau Facturés</span>
            <Droplets className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">
            {formatFCFA(summary.totalWaterBilled)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Forfait mensuel sans compteur : <strong>2 000 FCFA ou 1 500 FCFA</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-amber-800 mb-1">
            <span>Forfaits Eau à Recouvrer</span>
            <Droplets className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#B45309]">
            {formatFCFA(summary.totalWaterUnpaid)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Forfaits mensuels en attente</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
            <span>Électricité ENEO Facturée</span>
            <Zap className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">
            {formatFCFA(summary.totalElecBilled)}
          </div>
          <p className="text-xs text-[#065F46] font-bold mt-1">
            Avances versées : +{formatFCFA(summary.totalElecPaidAdvances)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#EF4444] mb-1">
            <span>Reste à Payer Électricité</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#991B1B]">
            {formatFCFA(summary.totalElecUnpaid)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Facturé ENEO - Avances versées</p>
        </div>
      </div>

      {/* Filtres d'étages */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'ALL', label: 'Tous les étages' },
              { id: 0, label: 'RDC' },
              { id: 1, label: '1er Étage' },
              { id: 2, label: '2ème Étage' },
              { id: 3, label: '3ème Étage' },
            ] as const
          ).map((f) => (
            <button
              key={String(f.id)}
              type="button"
              onClick={() => setFloorFilter(f.id)}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer ${
                floorFilter === f.id
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 font-bold text-xs sm:text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={onlyUnpaid}
            onChange={(e) => setOnlyUnpaid(e.target.checked)}
            className="w-4 h-4 rounded text-[#2563EB]"
          />
          <span>Afficher uniquement les logements ayant un reste à payer Eau ou Électricité</span>
        </label>
      </div>

      {/* Tableau Forfait Eau Fixe (2000 / 1500 FCFA) & Mini-Compte Courant Électricité */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-lg font-extrabold text-[#0F172A]">
            Forfait Eau Mensuel (2 000 ou 1 500 FCFA) & Compte Courant Électricité (ENEO)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Choisissez en 1 clic le forfait d’eau du logement (2 000 FCFA ou 1 500 FCFA) et saisissez le montant facturé ENEO ainsi que l’avance versée pour calculer automatiquement le reste à payer.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-white text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 font-extrabold">Porte & Locataire</th>
                <th className="py-3.5 px-4 font-extrabold">💧 Forfait Eau Fixe (Sans Compteur)</th>
                <th className="py-3.5 px-4 font-extrabold">Statut Eau</th>
                <th className="py-3.5 px-4 font-extrabold">⚡ Facturé ENEO</th>
                <th className="py-3.5 px-4 font-extrabold">Avance / Versé Élec</th>
                <th className="py-3.5 px-4 font-extrabold">Reste à Payer Élec</th>
                <th className="py-3.5 px-4 font-extrabold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {occupiedUnits.map((u) => (
                <UtilityRow
                  key={u.id}
                  unit={u}
                  isSaved={savedCode === u.code}
                  onSave={handleQuickUtilityUpdate}
                  onOpenDetail={() => onSelectUnit(u, 'UTILITIES')}
                  whatsappUrl={buildUtilityWhatsApp(u)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface UtilityRowProps {
  unit: RentalUnit;
  isSaved: boolean;
  onSave: (
    unit: RentalUnit,
    waterFlatFee: number,
    waterPaid: boolean,
    elecBilled: number,
    elecPaidAmount: number,
    elecPaid: boolean
  ) => void;
  onOpenDetail: () => void;
  whatsappUrl: string;
}

const UtilityRow: React.FC<UtilityRowProps> = ({
  unit,
  isSaved,
  onSave,
  onOpenDetail,
  whatsappUrl,
}) => {
  const initialBalances = calculateUnitSeparatedBalances(unit);
  const [waterFee, setWaterFee] = useState<number>(initialBalances.waterFlatFee);
  const [waterPaid, setWaterPaid] = useState<boolean>(unit.utilities.waterPaid);
  const [elecBilled, setElecBilled] = useState<number>(initialBalances.electricityBilled);
  const [elecPaidAmt, setElecPaidAmt] = useState<number>(initialBalances.electricityPaidAmount);
  const [elecPaid, setElecPaid] = useState<boolean>(unit.utilities.electricityPaid);

  const elecRemaining = Math.max(0, elecBilled - elecPaidAmt);
  const elecCredit = Math.max(0, elecPaidAmt - elecBilled);

  return (
    <motion.tr className="hover:bg-slate-50/90">
      <td className="py-3.5 px-4">
        <button
          type="button"
          onClick={onOpenDetail}
          className="font-extrabold text-[#0F172A] hover:text-[#2563EB] flex items-center gap-2 cursor-pointer"
        >
          <span className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-xs font-extrabold">
            {unit.code}
          </span>
          <span>{unit.tenant?.fullName}</span>
        </button>
      </td>

      {/* Sélecteur rapide Forfait Eau : 2 000 FCFA / 1 500 FCFA / Personnalisé */}
      <td className="py-3.5 px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWaterFee(DEFAULT_WATER_FLAT_FEE)}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border cursor-pointer ${
              waterFee === DEFAULT_WATER_FLAT_FEE
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            2 000 F
          </button>
          <button
            type="button"
            onClick={() => setWaterFee(REDUCED_WATER_FLAT_FEE)}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border cursor-pointer ${
              waterFee === REDUCED_WATER_FLAT_FEE
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-white text-slate-700 border-slate-300'
            }`}
          >
            1 500 F
          </button>
          <input
            type="number"
            step={500}
            aria-label={`Forfait eau ${unit.code}`}
            value={waterFee}
            onChange={(e) => setWaterFee(Number(e.target.value))}
            className="w-20 px-2 py-1 rounded-lg border border-slate-300 font-extrabold text-xs text-[#0F172A]"
          />
        </div>
      </td>

      {/* Statut Eau */}
      <td className="py-3.5 px-4">
        <div className="font-extrabold text-[#1E3A8A]">{formatFCFA(waterFee)}</div>
        <label className="inline-flex items-center gap-1.5 text-xs font-bold mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={waterPaid}
            onChange={(e) => setWaterPaid(e.target.checked)}
            className="rounded text-[#10B981]"
          />
          <span className={waterPaid ? 'text-[#065F46]' : 'text-[#EF4444]'}>
            {waterPaid ? 'Payé' : 'À régler'}
          </span>
        </label>
      </td>

      {/* Facturé ENEO */}
      <td className="py-3.5 px-4">
        <input
          type="number"
          step={100}
          aria-label={`Facturé ENEO ${unit.code}`}
          value={elecBilled}
          onChange={(e) => setElecBilled(Number(e.target.value))}
          className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-extrabold text-sm text-[#0F172A]"
        />
      </td>

      {/* Montant Versé (Avance / Acompte Électricité) */}
      <td className="py-3.5 px-4">
        <input
          type="number"
          step={500}
          aria-label={`Avance versée électricité ${unit.code}`}
          value={elecPaidAmt}
          onChange={(e) => {
            const val = Number(e.target.value);
            setElecPaidAmt(val);
            setElecPaid(val >= elecBilled);
          }}
          className="w-24 px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50/40 font-extrabold text-sm text-[#065F46]"
        />
      </td>

      {/* Reste à Payer Électricité */}
      <td className="py-3.5 px-4">
        {elecCredit > 0 ? (
          <div className="font-extrabold text-[#065F46]">
            Crédit +{formatFCFA(elecCredit)}
          </div>
        ) : (
          <div className={`font-extrabold ${elecRemaining > 0 ? 'text-[#B45309]' : 'text-[#065F46]'}`}>
            {elecRemaining > 0 ? formatFCFA(elecRemaining) : '0 FCFA (Soldé)'}
          </div>
        )}
      </td>

      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              onSave(unit, waterFee, waterPaid, elecBilled, elecPaidAmt, elecPaid || elecRemaining === 0)
            }
            className={`px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
              isSaved
                ? 'bg-[#10B981] text-white'
                : 'bg-[#2563EB] hover:bg-[#1E3A8A] text-white'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{isSaved ? 'Enregistré' : 'Valider'}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Envoyer le décompte Forfait Eau & ENEO par WhatsApp"
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-[#10B981] text-[#065F46] hover:text-white border border-emerald-200 font-bold text-xs flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WA</span>
          </a>
        </div>
      </td>
    </motion.tr>
  );
};
