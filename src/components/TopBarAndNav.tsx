import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Droplets,
  FileSpreadsheet,
  LayoutGrid,
  LogOut,
  MonitorDown,
  PlusCircle,
  Settings,
  TrendingUp,
  Users,
  X,
  Check,
  ChevronDown,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { BRAND_CONFIG } from '@config/constants';
import { useApp } from '../context/AppContext';
import { downloadMonthlyExcelReport } from '../utils/excelExport';

export type MainTabId =
  | 'BUILDING_MAP'
  | 'TENANTS_PAYMENTS'
  | 'UTILITIES'
  | 'FINANCES_BUDGET'
  | 'SETTINGS';

interface TopBarAndNavProps {
  activeTab: MainTabId;
  setActiveTab: (tab: MainTabId) => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const MONTH_OPTIONS = [
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

export const TopBarAndNav: React.FC<TopBarAndNavProps> = ({ activeTab, setActiveTab }) => {
  const {
    buildings,
    activeBuilding,
    setActiveBuildingId,
    addBuilding,
    units,
    allUnits,
    payments,
    expenses,
    settings,
    logout,
  } = useApp();

  // Modale Ajouter un Immeuble / Propriété Multi-Biens
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [newBldgName, setNewBldgName] = useState('');
  const [newBldgCity, setNewBldgCity] = useState('Yaoundé, Cameroun');
  const [newBldgNeighborhood, setNewBldgNeighborhood] = useState('Quartier Bastos / Essos');
  const [newRoomCount, setNewRoomCount] = useState(8);
  const [newStudioCount, setNewStudioCount] = useState(2);
  const [newApartmentCount, setNewApartmentCount] = useState(2);
  const [newShopCount, setNewShopCount] = useState(2);
  const [newWarehouseCount, setNewWarehouseCount] = useState(0);

  // Modale Rapport Mensuel Excel (.xlsx)
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Octobre par défaut
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [excelSuccessToast, setExcelSuccessToast] = useState(false);

  // Installation PWA sur l'ordinateur
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const handleExportExcel = () => {
    downloadMonthlyExcelReport({
      buildingName: activeBuilding.name,
      monthIndex: selectedMonth,
      year: selectedYear,
      units,
      payments,
      expenses,
    });
    setExcelSuccessToast(true);
    setTimeout(() => {
      setExcelSuccessToast(false);
      setShowExcelModal(false);
    }, 1800);
  };

  const lateOrPartialCount = units.filter(
    (u) => u.status === 'LATE' || u.status === 'PARTIAL'
  ).length;

  const unpaidUtilitiesCount = units.filter(
    (u) => u.status !== 'VACANT' && (!u.utilities.waterPaid || !u.utilities.electricityPaid)
  ).length;

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBldgName.trim()) return;
    addBuilding(
      newBldgName.trim(),
      newBldgCity.trim(),
      newBldgNeighborhood.trim(),
      Number(newRoomCount) || 0,
      Number(newStudioCount) || 0,
      Number(newApartmentCount) || 0,
      Number(newShopCount) || 0,
      Number(newWarehouseCount) || 0
    );
    setNewBldgName('');
    setShowAddBuildingModal(false);
  };

  const navItems: {
    id: MainTabId;
    label: string;
    subLabel: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'BUILDING_MAP',
      label: 'Plan de l’Immeuble',
      subLabel: `${units.length} biens configurés`,
      icon: LayoutGrid,
    },
    {
      id: 'TENANTS_PAYMENTS',
      label: 'Locataires & Quittances',
      subLabel: 'Paiements & Relances',
      icon: Users,
      badge: lateOrPartialCount > 0 ? lateOrPartialCount : undefined,
      badgeColor: 'bg-[#EF4444] text-white',
    },
    {
      id: 'UTILITIES',
      label: 'Forfait Eau & ENEO',
      subLabel: 'Eau (2000/1500) & Avances Élec',
      icon: Droplets,
      badge: unpaidUtilitiesCount > 0 ? unpaidUtilitiesCount : undefined,
      badgeColor: 'bg-[#F59E0B] text-white',
    },
    {
      id: 'FINANCES_BUDGET',
      label: 'Finances & Budget',
      subLabel: 'Rapport Excel & Travaux',
      icon: TrendingUp,
    },
    {
      id: 'SETTINGS',
      label: 'Paramètres & Tarifs',
      subLabel: 'Configuration',
      icon: Settings,
    },
  ];

  return (
    <>
      <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-30 shadow-lg no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* Ligne Supérieure : Marque + Sélecteur d'Immeuble + Actions Rapides V2 */}
          <div className="py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
            {/* Marque Conrad Solutions */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] flex items-center justify-center shadow-md border border-blue-400/30">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                    {BRAND_CONFIG.companyName}
                  </span>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    PropTech SaaS V2
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Compte Bailleur : <strong className="text-white">{settings.ownerName}</strong>
                </p>
              </div>
            </div>

            {/* Sélecteur de Biens Actif + Boutons Excel, Ajouter Immeuble & Installer sur PC */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mr-2">
                  Bien actif :
                </span>
                <div className="relative">
                  <select
                    aria-label="Sélectionner l'immeuble actif"
                    value={activeBuilding.id}
                    onChange={(e) => setActiveBuildingId(e.target.value)}
                    className="appearance-none bg-transparent text-white font-extrabold text-sm sm:text-base pr-7 focus:outline-none cursor-pointer"
                  >
                    {buildings.map((b) => {
                      const count = allUnits.filter((u) => u.buildingId === b.id).length;
                      return (
                        <option key={b.id} value={b.id} className="bg-[#0F172A] text-white">
                          {b.name} ({count} unités)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Bouton Rapport Mensuel Excel (.xlsx) */}
              <button
                type="button"
                onClick={() => setShowExcelModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Rapport Mensuel (Excel)</span>
              </button>

              {/* Bouton + Ajouter un immeuble / propriété */}
              <button
                type="button"
                onClick={() => setShowAddBuildingModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-blue-400/30 transition-all cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-blue-200" />
                <span>+ Ajouter un bien</span>
              </button>

              {/* Bouton Installer l'application sur cet ordinateur */}
              <button
                type="button"
                onClick={handleInstallClick}
                title="Installer l'application sur le Bureau de cet ordinateur"
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-200 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <MonitorDown className="w-4 h-4 text-blue-400" />
                <span className="hidden lg:inline">Installer sur cet ordinateur</span>
              </button>

              <button
                type="button"
                onClick={logout}
                title="Retourner à l'écran de connexion"
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden xl:inline">Verrouiller</span>
              </button>
            </div>
          </div>

          {/* Barre de Navigation Principale Senior-Friendly */}
          <nav className="py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-left transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-md shadow-blue-600/25'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  <div>
                    <div className="text-sm sm:text-base leading-tight flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`px-2 py-0.5 text-xs font-extrabold rounded-full ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs font-medium hidden xl:block ${
                        isActive ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {item.subLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MODALE 1 : Télécharger le Rapport Mensuel Dynamique (Excel .xlsx) */}
      <AnimatePresence>
        {showExcelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="bg-[#0F172A] text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981] flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Télécharger le Rapport Mensuel (Excel)
                    </h3>
                    <p className="text-xs text-slate-300">
                      Classeur .xlsx complet (2 onglets) — {activeBuilding.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExcelModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-950 font-medium space-y-1">
                  <p className="font-extrabold">Contenu du fichier Excel généré (.xlsx) :</p>
                  <p>• <strong>Onglet 1 (État Mensuel des Logements) :</strong> 1 ligne par logement avec Loyer, Avance/Mois couverts, Forfait Eau (2000/1500 FCFA), Électricité ENEO (Facturé / Avance / Reste) et Solde Global Net.</p>
                  <p>• <strong>Onglet 2 (Synthèse Financière & Travaux) :</strong> Total encaissé, Reste à recouvrer, Logements vacants et Dépenses de maintenance.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Mois du rapport
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A] bg-white"
                    >
                      {MONTH_OPTIONS.map((m, idx) => (
                        <option key={m} value={idx}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Année
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A] bg-white"
                    >
                      {[2025, 2026, 2027].map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {excelSuccessToast && (
                  <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-sm font-extrabold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                    <span>Rapport Excel téléchargé avec succès sur votre ordinateur !</span>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(false)}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="px-6 py-3 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-sm flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Télécharger le fichier .xlsx</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE 2 : Ajouter un nouvel immeuble / propriété multi-types (Chambres, Studios, Appartements, Boutiques, Magasins) */}
      <AnimatePresence>
        {showAddBuildingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-6"
            >
              <div className="bg-[#0F172A] text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Ajouter un Immeuble ou Complexe Multi-Biens
                    </h3>
                    <p className="text-xs text-slate-300">
                      Chambres, Studios, Appartements (T2/T3), Boutiques & Magasins
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBuildingModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateBuilding} className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs sm:text-sm text-[#1E3A8A] font-medium">
                  Votre bien principal <strong>Résidence Moro (35 unités)</strong> reste conservé intact. Vous pouvez créer ici un nouvel immeuble ou galerie commerciale et personnaliser chaque bien à volonté.
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Nom de l’immeuble / propriété / complexe *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Résidence Moro Annexe II & Galerie Commerciale"
                    value={newBldgName}
                    onChange={(e) => setNewBldgName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Ville</label>
                    <input
                      type="text"
                      value={newBldgCity}
                      onChange={(e) => setNewBldgCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Quartier</label>
                    <input
                      type="text"
                      value={newBldgNeighborhood}
                      onChange={(e) => setNewBldgNeighborhood(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Chambres (CH)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newRoomCount}
                      onChange={(e) => setNewRoomCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Studios (ST)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={newStudioCount}
                      onChange={(e) => setNewStudioCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Appartements (APT)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={newApartmentCount}
                      onChange={(e) => setNewApartmentCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Boutiques (BTQ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={newShopCount}
                      onChange={(e) => setNewShopCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Magasins / Entrepôts (MAG)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={newWarehouseCount}
                      onChange={(e) => setNewWarehouseCount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddBuildingModal(false)}
                    className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold text-sm flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Créer la Propriété</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODALE 3 : Installer l'application sur cet ordinateur (PWA Desktop & Mises à jour silencieuses) */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              <div className="bg-[#0F172A] text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
                    <MonitorDown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Installer Conrad Solutions sur cet Ordinateur
                    </h3>
                    <p className="text-xs text-slate-300">
                      Application Bureau Windows / Mac / Android avec mise à jour automatique
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm text-slate-700">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                  <p className="font-extrabold text-base mb-1">
                    ✅ Mises à jour silencieuses activées (V2.2)
                  </p>
                  <p className="text-xs sm:text-sm">
                    Si l’icône <strong>Conrad Solutions</strong> est déjà installée sur votre Bureau, elle se met à jour toute seule dès que vous l’ouvrez, <strong>sans jamais effacer vos locataires, paiements ni documents (CNI / Contrats)</strong> enregistrés sur cet appareil.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <p className="font-extrabold text-[#0F172A]">
                    Pour ajouter l’icône sur votre Bureau Windows / Mac :
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-700 font-medium">
                    <li>
                      Dans la barre d’adresse tout en haut de votre navigateur (Chrome ou Edge), cliquez sur la petite icône <strong>« Installer Conrad Solutions »</strong> (écran avec une flèche).
                    </li>
                    <li>
                      Cliquez sur <strong>« Installer »</strong> : l’application s’ouvrira dans sa propre fenêtre dédiée et créera un raccourci direct sur votre Bureau.
                    </li>
                  </ol>
                </div>

                <div className="pt-3 flex justify-end border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowInstallModal(false)}
                    className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-sm cursor-pointer"
                  >
                    J’ai compris
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
