import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Droplets,
  LayoutGrid,
  LogOut,
  PlusCircle,
  Settings,
  TrendingUp,
  Users,
  X,
  Check,
  ChevronDown,
} from 'lucide-react';
import { BRAND_CONFIG } from '@config/constants';
import { useApp } from '../context/AppContext';

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

export const TopBarAndNav: React.FC<TopBarAndNavProps> = ({ activeTab, setActiveTab }) => {
  const {
    buildings,
    activeBuilding,
    setActiveBuildingId,
    addBuilding,
    units,
    allUnits,
    settings,
    logout,
  } = useApp();

  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [newBldgName, setNewBldgName] = useState('');
  const [newBldgCity, setNewBldgCity] = useState('Yaoundé, Cameroun');
  const [newBldgNeighborhood, setNewBldgNeighborhood] = useState('Quartier Bastos / Essos');
  const [newRoomCount, setNewRoomCount] = useState(12);
  const [newStudioCount, setNewStudioCount] = useState(4);

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
      Number(newRoomCount) || 8,
      Number(newStudioCount) || 2
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
      subLabel: `${units.length} portes par étage`,
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
      label: 'Eau (Forage) & ENEO',
      subLabel: 'Index & Factures',
      icon: Droplets,
      badge: unpaidUtilitiesCount > 0 ? unpaidUtilitiesCount : undefined,
      badgeColor: 'bg-[#F59E0B] text-white',
    },
    {
      id: 'FINANCES_BUDGET',
      label: 'Finances & Budget',
      subLabel: 'Travaux & Bilan Annuel',
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
          {/* Ligne Supérieure : Marque + Sélecteur d'Immeuble + Profil Bailleur */}
          <div className="py-3.5 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80">
            {/* Marque Conrad Solution */}
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
                    PropTech SaaS
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Compte Bailleur : <strong className="text-white">{settings.ownerName}</strong>
                </p>
              </div>
            </div>

            {/* Sélecteur de Biens Actif + Bouton "+ Ajouter un immeuble" */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 mr-2.5">
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

              <button
                type="button"
                onClick={() => setShowAddBuildingModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-bold text-sm flex items-center gap-2 border border-blue-400/30 transition-all cursor-pointer shadow-sm"
              >
                <PlusCircle className="w-4 h-4 text-blue-200" />
                <span>+ Ajouter un immeuble</span>
              </button>

              <button
                type="button"
                onClick={logout}
                title="Retourner à l'écran de connexion"
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center gap-2 border border-slate-700 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline">Verrouiller</span>
              </button>
            </div>
          </div>

          {/* Barre de Navigation Principale Senior-Friendly (Gros Boutons Explicites) */}
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

      {/* Modale d'ajout d'un nouvel immeuble (Architecture SaaS Multi-Bailleurs / Multi-Biens) */}
      <AnimatePresence>
        {showAddBuildingModal && (
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
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Ajouter un Nouvel Immeuble</h3>
                    <p className="text-xs text-slate-300">
                      Architecture Multi-Biens — {BRAND_CONFIG.companyName}
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
                  Votre bien principal <strong>Résidence Moro (35 unités)</strong> reste conservé intact. Vous pourrez basculer entre vos immeubles en 1 clic dans la barre supérieure.
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Nom du nouvel immeuble / résidence *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Résidence Moro Annexe II"
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Nombre de Chambres (CH)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={newRoomCount}
                      onChange={(e) => setNewRoomCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Nombre de Studios (ST)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={newStudioCount}
                      onChange={(e) => setNewStudioCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A]"
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
                    <span>Créer l’Immeuble</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
