import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Code2,
  Download,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import {
  DEFAULT_ELECTRICITY_KWH_PRICE,
  DEFAULT_ROOM_PRICE,
  DEFAULT_STUDIO_PRICE,
  DEFAULT_WATER_M3_PRICE,
} from '@config/constants';
import { useApp } from '../context/AppContext';
import { formatFCFA } from '../utils/formatters';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetDemoData, allUnits, payments, expenses } = useApp();

  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [email, setEmail] = useState(settings.email);
  const [phone, setPhone] = useState(settings.phone);
  const [whatsappPhone, setWhatsappPhone] = useState(settings.whatsappPhone);
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState(settings.orangeMoneyNumber);
  const [mtnMomoNumber, setMtnMomoNumber] = useState(settings.mtnMomoNumber);
  const [alertDaysBeforeDue, setAlertDaysBeforeDue] = useState(settings.alertDaysBeforeDue);

  const [defaultRoomPrice, setDefaultRoomPrice] = useState(settings.defaultRoomPrice);
  const [defaultStudioPrice, setDefaultStudioPrice] = useState(settings.defaultStudioPrice);
  const [waterM3Price, setWaterM3Price] = useState(settings.waterM3Price);
  const [waterFlatFee, setWaterFlatFee] = useState(settings.waterFlatFee);
  const [electricityKwhPrice, setElectricityKwhPrice] = useState(settings.electricityKwhPrice);
  const [electricityFlatFee, setElectricityFlatFee] = useState(settings.electricityFlatFee);

  const [applyToAllUnits, setApplyToAllUnits] = useState(true);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(
      {
        ownerName,
        email,
        phone,
        whatsappPhone,
        orangeMoneyNumber,
        mtnMomoNumber,
        alertDaysBeforeDue: Number(alertDaysBeforeDue) || 5,
        defaultRoomPrice: Number(defaultRoomPrice) || DEFAULT_ROOM_PRICE,
        defaultStudioPrice: Number(defaultStudioPrice) || DEFAULT_STUDIO_PRICE,
        waterM3Price: Number(waterM3Price) || DEFAULT_WATER_M3_PRICE,
        waterFlatFee: Number(waterFlatFee) || 2500,
        electricityKwhPrice: Number(electricityKwhPrice) || DEFAULT_ELECTRICITY_KWH_PRICE,
        electricityFlatFee: Number(electricityFlatFee) || 5000,
      },
      applyToAllUnits
    );
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 4000);
  };

  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      units: allUnits,
      payments,
      expenses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conrad-solution-residence-moro-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetDemo = () => {
    if (
      window.confirm(
        'Voulez-vous restaurer les données initiales de démonstration de la Résidence Moro (35 unités) ?'
      )
    ) {
      resetDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5 mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                Paramètres Généraux & Tarifs de Base
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Synchronisé avec le fichier centralisé{' '}
                <code className="px-2 py-0.5 rounded bg-slate-100 text-[#1E3A8A] font-bold">
                  config/constants.ts
                </code>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exporter Sauvegarde JSON</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemo}
              className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-[#EF4444] font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Réinitialiser Démo Moro</span>
            </button>
          </div>
        </div>

        {savedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-emerald-50 border-2 border-[#10B981] text-emerald-950 font-extrabold text-sm flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
            <span>
              Paramètres et grilles tarifaires enregistrés avec succès ! Tous les calculs de
              l’application ont été mis à jour.
            </span>
          </motion.div>
        )}

        <form onSubmit={handleSave} className="space-y-8">
          {/* Bloc 1 : Tarifs Locatifs & Charges (Eau Forage / Électricité ENEO) */}
          <div className="space-y-4">
            <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <Code2 className="w-5 h-5 text-[#2563EB]" />
              <span>1. Grille Tarifaire par Défaut (Chambres, Studios, Eau Forage & ENEO)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Loyer Chambre (CH) / mois
                </label>
                <input
                  type="number"
                  step={500}
                  value={defaultRoomPrice}
                  onChange={(e) => setDefaultRoomPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-extrabold text-base text-[#0F172A]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Constante : {formatFCFA(DEFAULT_ROOM_PRICE)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Loyer Studio (ST) / mois
                </label>
                <input
                  type="number"
                  step={500}
                  value={defaultStudioPrice}
                  onChange={(e) => setDefaultStudioPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-extrabold text-base text-[#1E3A8A]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Constante : {formatFCFA(DEFAULT_STUDIO_PRICE)}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-[#1E3A8A] mb-1.5">
                  Prix m³ Eau (Forage)
                </label>
                <input
                  type="number"
                  step={25}
                  value={waterM3Price}
                  onChange={(e) => setWaterM3Price(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-extrabold text-base text-[#1E3A8A]"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Constante : {formatFCFA(DEFAULT_WATER_M3_PRICE)} / m³
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-amber-900 mb-1.5">
                  Prix kWh Électricité (ENEO)
                </label>
                <input
                  type="number"
                  step={5}
                  value={electricityKwhPrice}
                  onChange={(e) => setElectricityKwhPrice(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-extrabold text-base text-amber-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Constante : {formatFCFA(DEFAULT_ELECTRICITY_KWH_PRICE)} / kWh
                </span>
              </div>
            </div>

            <label className="inline-flex items-center gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs sm:text-sm font-bold text-[#1E3A8A] cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllUnits}
                onChange={(e) => setApplyToAllUnits(e.target.checked)}
                className="w-4 h-4 rounded text-[#2563EB]"
              />
              <span>
                Appliquer également ces nouveaux tarifs de base (Chambres & Studios) aux 35 unités
                de la Résidence Moro lors de l’enregistrement
              </span>
            </label>
          </div>

          {/* Bloc 2 : Coordonnées du Bailleur & Comptes Mobile Money */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
              <span>2. Coordonnées du Propriétaire, E-mail de Rappel & Mobile Money</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nom du Propriétaire / Bailleur (Affiché sur les quittances)
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-sm text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Adresse E-mail pour recevoir les récapitulatifs d’impayés
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-sm text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Téléphone Principal du Bailleur
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-sm text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Délai d’alerte avant échéance (en jours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={alertDaysBeforeDue}
                  onChange={(e) => setAlertDaysBeforeDue(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-sm text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Compte Orange Money (Mentionné dans les relances WhatsApp)
                </label>
                <input
                  type="text"
                  value={orangeMoneyNumber}
                  onChange={(e) => setOrangeMoneyNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-sm text-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                  Compte MTN Mobile Money (Mentionné dans les relances WhatsApp)
                </label>
                <input
                  type="text"
                  value={mtnMomoNumber}
                  onChange={(e) => setMtnMomoNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-bold text-sm text-[#0F172A]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end">
            <button
              type="submit"
              className="px-6 py-4 rounded-2xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-base flex items-center gap-2.5 shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>Enregistrer la Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
