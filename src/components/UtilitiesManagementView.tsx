import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Droplets, MessageCircle, Save, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RentalUnit } from '../types';
import { formatFCFA, sanitizePhoneForWhatsApp } from '../utils/formatters';

interface UtilitiesManagementViewProps {
  onSelectUnit: (unit: RentalUnit, initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES') => void;
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
      if (onlyUnpaid && u.utilities.waterPaid && u.utilities.electricityPaid) return false;
      return true;
    });
  }, [units, floorFilter, onlyUnpaid]);

  const summary = useMemo(() => {
    const active = units.filter((u) => u.status !== 'VACANT');
    const totalWaterBilled = active.reduce((acc, u) => acc + u.utilities.waterAmountDue, 0);
    const totalWaterUnpaid = active.reduce(
      (acc, u) => acc + (u.utilities.waterPaid ? 0 : u.utilities.waterAmountDue),
      0
    );
    const totalElecBilled = active.reduce((acc, u) => acc + u.utilities.electricityAmountDue, 0);
    const totalElecUnpaid = active.reduce(
      (acc, u) => acc + (u.utilities.electricityPaid ? 0 : u.utilities.electricityAmountDue),
      0
    );
    return {
      totalWaterBilled,
      totalWaterUnpaid,
      totalElecBilled,
      totalElecUnpaid,
    };
  }, [units]);

  const handleQuickIndexUpdate = (
    unit: RentalUnit,
    newWaterIdx: number,
    newElecIdx: number,
    waterPaid: boolean,
    elecPaid: boolean
  ) => {
    const waterDiff = Math.max(0, newWaterIdx - unit.utilities.waterOldIndex);
    const elecDiff = Math.max(0, newElecIdx - unit.utilities.electricityOldIndex);

    updateUtilityReading(unit.id, {
      ...unit.utilities,
      waterNewIndex: newWaterIdx,
      waterAmountDue:
        unit.utilities.waterMode === 'METER'
          ? waterDiff * settings.waterM3Price
          : unit.utilities.waterAmountDue,
      waterPaid,
      electricityNewIndex: newElecIdx,
      electricityAmountDue:
        unit.utilities.electricityMode === 'METER'
          ? elecDiff * settings.electricityKwhPrice
          : unit.utilities.electricityAmountDue,
      electricityPaid: elecPaid,
      lastReadingDate: '2026-10-26',
    });

    setSavedCode(unit.code);
    setTimeout(() => setSavedCode(null), 2500);
  };

  const buildUtilityWhatsApp = (u: RentalUnit) => {
    const phone = sanitizePhoneForWhatsApp(u.tenant?.phone || '');
    const waterConso = Math.max(0, u.utilities.waterNewIndex - u.utilities.waterOldIndex);
    const elecConso = Math.max(
      0,
      u.utilities.electricityNewIndex - u.utilities.electricityOldIndex
    );
    const totalDue =
      (u.utilities.waterPaid ? 0 : u.utilities.waterAmountDue) +
      (u.utilities.electricityPaid ? 0 : u.utilities.electricityAmountDue);

    const msg =
      `Bonjour ${u.tenant?.fullName || ''},\n\n` +
      `Voici le relevé des sous-compteurs du mois pour votre logement *${u.code}* (*Résidence Moro*) :\n` +
      `💧 *Eau (Forage)* : Index ${u.utilities.waterOldIndex} → ${u.utilities.waterNewIndex} (${waterConso} m³) = *${formatFCFA(u.utilities.waterAmountDue)}* (${u.utilities.waterPaid ? 'Payé' : 'À régler'})\n` +
      `⚡ *Électricité (ENEO)* : Index ${u.utilities.electricityOldIndex} → ${u.utilities.electricityNewIndex} (${elecConso} kWh) = *${formatFCFA(u.utilities.electricityAmountDue)}* (${u.utilities.electricityPaid ? 'Payé' : 'À régler'})\n` +
      `----------------------------------\n` +
      `• *Net à régler Eau + ENEO : ${formatFCFA(totalDue)}*\n` +
      `Règlement Orange Money : ${settings.orangeMoneyNumber} / MTN MoMo : ${settings.mtnMomoNumber}.\n` +
      `Cordialement, *${settings.ownerName}*`;

    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* KPIs Eau (Forage) & Électricité (ENEO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#2563EB] mb-1">
            <span>Eau du Forage Facturée</span>
            <Droplets className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">
            {formatFCFA(summary.totalWaterBilled)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tarif unitaire actif : <strong>{formatFCFA(settings.waterM3Price)} / m³</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-amber-800 mb-1">
            <span>Eau Restant à Encaisser</span>
            <Droplets className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-[#B45309]">
            {formatFCFA(summary.totalWaterUnpaid)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Sous-compteurs non soldés ce mois</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1">
            <span>Électricité ENEO Facturée</span>
            <Zap className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-extrabold text-[#0F172A]">
            {formatFCFA(summary.totalElecBilled)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tarif unitaire actif : <strong>{formatFCFA(settings.electricityKwhPrice)} / kWh</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-red-200 shadow-sm">
          <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#EF4444] mb-1">
            <span>ENEO Restant à Encaisser</span>
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-2xl font-extrabold text-[#991B1B]">
            {formatFCFA(summary.totalElecUnpaid)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Factures sous-compteurs en attente</p>
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
          <span>Afficher uniquement les portes ayant un impayé Eau ou ENEO</span>
        </label>
      </div>

      {/* Tableau de Saisie Rapide des Index par Porte */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-lg font-extrabold text-[#0F172A]">
            Relevé des Sous-Compteurs Individuels (Ancien Index → Nouvel Index → Calcul Automatique)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Modifiez directement le nouvel index d’une porte : le montant en FCFA se recalcule
            instantanément selon vos tarifs.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A] text-white text-xs uppercase tracking-wider">
                <th className="py-3.5 px-4 font-extrabold">Porte & Locataire</th>
                <th className="py-3.5 px-4 font-extrabold">💧 Eau Forage (m³)</th>
                <th className="py-3.5 px-4 font-extrabold">Montant Eau</th>
                <th className="py-3.5 px-4 font-extrabold">⚡ Électricité ENEO (kWh)</th>
                <th className="py-3.5 px-4 font-extrabold">Montant ENEO</th>
                <th className="py-3.5 px-4 font-extrabold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {occupiedUnits.map((u) => (
                <UtilityRow
                  key={u.id}
                  unit={u}
                  waterPrice={settings.waterM3Price}
                  elecPrice={settings.electricityKwhPrice}
                  isSaved={savedCode === u.code}
                  onSave={handleQuickIndexUpdate}
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
  waterPrice: number;
  elecPrice: number;
  isSaved: boolean;
  onSave: (
    unit: RentalUnit,
    newWaterIdx: number,
    newElecIdx: number,
    waterPaid: boolean,
    elecPaid: boolean
  ) => void;
  onOpenDetail: () => void;
  whatsappUrl: string;
}

const UtilityRow: React.FC<UtilityRowProps> = ({
  unit,
  waterPrice,
  elecPrice,
  isSaved,
  onSave,
  onOpenDetail,
  whatsappUrl,
}) => {
  const [waterNew, setWaterNew] = useState(unit.utilities.waterNewIndex);
  const [waterPaid, setWaterPaid] = useState(unit.utilities.waterPaid);
  const [elecNew, setElecNew] = useState(unit.utilities.electricityNewIndex);
  const [elecPaid, setElecPaid] = useState(unit.utilities.electricityPaid);

  const waterConso = Math.max(0, waterNew - unit.utilities.waterOldIndex);
  const waterAmount = waterConso * waterPrice;

  const elecConso = Math.max(0, elecNew - unit.utilities.electricityOldIndex);
  const elecAmount = elecConso * elecPrice;

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

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Ancien : {unit.utilities.waterOldIndex} →
          </span>
          <input
            type="number"
            aria-label={`Nouvel index eau ${unit.code}`}
            value={waterNew}
            onChange={(e) => setWaterNew(Number(e.target.value))}
            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 font-extrabold text-sm text-[#0F172A]"
          />
          <span className="text-xs font-bold text-blue-700">({waterConso} m³)</span>
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div className="font-extrabold text-[#1E3A8A]">{formatFCFA(waterAmount)}</div>
        <label className="inline-flex items-center gap-1.5 text-xs font-bold mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={waterPaid}
            onChange={(e) => setWaterPaid(e.target.checked)}
            className="rounded text-[#10B981]"
          />
          <span className={waterPaid ? 'text-[#065F46]' : 'text-[#EF4444]'}>
            {waterPaid ? 'Payé' : 'Impayé'}
          </span>
        </label>
      </td>

      <td className="py-3.5 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">
            Ancien : {unit.utilities.electricityOldIndex} →
          </span>
          <input
            type="number"
            aria-label={`Nouvel index électricité ${unit.code}`}
            value={elecNew}
            onChange={(e) => setElecNew(Number(e.target.value))}
            className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 font-extrabold text-sm text-[#0F172A]"
          />
          <span className="text-xs font-bold text-amber-800">({elecConso} kWh)</span>
        </div>
      </td>

      <td className="py-3.5 px-4">
        <div className="font-extrabold text-amber-900">{formatFCFA(elecAmount)}</div>
        <label className="inline-flex items-center gap-1.5 text-xs font-bold mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={elecPaid}
            onChange={(e) => setElecPaid(e.target.checked)}
            className="rounded text-[#10B981]"
          />
          <span className={elecPaid ? 'text-[#065F46]' : 'text-[#EF4444]'}>
            {elecPaid ? 'Payé' : 'Impayé'}
          </span>
        </label>
      </td>

      <td className="py-3.5 px-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onSave(unit, waterNew, elecNew, waterPaid, elecPaid)}
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
            title="Envoyer la facture Eau & ENEO par WhatsApp"
            className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-[#10B981] text-[#065F46] hover:text-white border border-emerald-200 font-bold text-xs flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Facture WA</span>
          </a>
        </div>
      </td>
    </motion.tr>
  );
};
