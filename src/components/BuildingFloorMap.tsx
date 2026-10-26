import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  Building,
  Clock,
  CreditCard,
  DoorOpen,
  Footprints,
  Home,
  LayoutGrid,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
  Sparkles,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RentalUnit, UnitStatus } from '../types';
import {
  buildGuarantorWhatsAppUrl,
  buildTenantWhatsAppUrl,
  formatDateFR,
  formatFCFA,
  getDaysUntilDue,
  getStatusConfig,
} from '../utils/formatters';
import { AlertCenterBanner } from './AlertCenterBanner';

interface BuildingFloorMapProps {
  onSelectUnit: (unit: RentalUnit, initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES') => void;
}

type FloorFilter = 'ALL' | 0 | 1 | 2 | 3;
type ViewMode = 'CORRIDOR' | 'GRID';

export const BuildingFloorMap: React.FC<BuildingFloorMapProps> = ({ onSelectUnit }) => {
  const { units, settings, activeBuilding, refreshOverdueBalances } = useApp();
  const [selectedFloor, setSelectedFloor] = useState<FloorFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<UnitStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('CORRIDOR');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  // Statistiques globales en temps réel
  const stats = useMemo(() => {
    const totalUnits = units.length;
    const roomsCount = units.filter((u) => u.type === 'ROOM').length;
    const studiosCount = units.filter((u) => u.type === 'STUDIO').length;

    const paidUnits = units.filter((u) => u.status === 'PAID');
    const partialUnits = units.filter((u) => u.status === 'PARTIAL');
    const lateUnits = units.filter((u) => u.status === 'LATE');
    const vacantUnits = units.filter((u) => u.status === 'VACANT');

    const occupiedCount = totalUnits - vacantUnits.length;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

    // Loyer mensuel théorique sur les logements occupés
    const occupiedMonthlyRent = units
      .filter((u) => u.status !== 'VACANT')
      .reduce((acc, u) => acc + u.monthlyRent, 0);

    // Somme des impayés et restes à payer en cours
    const totalArrears = units.reduce((acc, u) => {
      if (u.status === 'LATE') return acc + (u.tenant?.balanceDue || u.monthlyRent);
      if (u.status === 'PARTIAL') return acc + (u.tenant?.balanceDue || 0);
      return acc;
    }, 0);

    // Somme des crédits d'avance positifs reportés sur les comptes courants locataires
    const totalCreditCarryOver = units.reduce(
      (acc, u) => acc + (u.tenant?.creditBalance || 0),
      0
    );

    // Loyer mensuel effectivement encaissé sur le mois courant
    const collectedMonthlyRent = Math.max(0, occupiedMonthlyRent - totalArrears);

    // Manque à gagner lié aux logements vacants
    const vacancyLoss = vacantUnits.reduce((acc, u) => acc + u.monthlyRent, 0);

    return {
      totalUnits,
      roomsCount,
      studiosCount,
      paidCount: paidUnits.length,
      partialCount: partialUnits.length,
      lateCount: lateUnits.length,
      vacantCount: vacantUnits.length,
      occupiedCount,
      occupancyRate,
      occupiedMonthlyRent,
      collectedMonthlyRent,
      totalArrears,
      totalCreditCarryOver,
      vacancyLoss,
    };
  }, [units]);

  // Filtrage des unités
  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (selectedFloor !== 'ALL' && u.floor !== selectedFloor) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = u.code.toLowerCase().includes(q);
        const matchTenant = u.tenant?.fullName.toLowerCase().includes(q);
        const matchGuarantor = u.tenant?.guarantor.fullName.toLowerCase().includes(q);
        return matchCode || matchTenant || matchGuarantor;
      }
      return true;
    });
  }, [units, selectedFloor, statusFilter, searchQuery]);

  const floorsToRender: number[] =
    selectedFloor === 'ALL' ? [0, 1, 2, 3] : [selectedFloor];

  const getFloorTitle = (floor: number) => {
    switch (floor) {
      case 0:
        return {
          title: 'Rez-de-chaussée (Étage 0)',
          subtitle: '8 Chambres (CH01 à CH08) • Aucun Studio au RDC • CH07 & CH08 au fond',
          missingDoor: null,
        };
      case 1:
        return {
          title: '1er Étage (Étage 1)',
          subtitle:
            'Début du couloir (Escaliers) : Studios ST11 & ST12 • Suite : 7 Chambres (Sans CH17) • Fond : CH15 & CH18',
          missingDoor: 'CH17',
        };
      case 2:
        return {
          title: '2ème Étage (Étage 2)',
          subtitle:
            'Début du couloir (Escaliers) : Studios ST21 & ST22 • Suite : 7 Chambres (Sans CH27) • Fond : CH25 & CH28',
          missingDoor: 'CH27',
        };
      case 3:
        return {
          title: '3ème Étage (Étage 3)',
          subtitle:
            'Début du couloir (Escaliers) : Studios ST31 & ST32 • Suite : 7 Chambres (Sans CH37) • Fond : CH35 & CH38',
          missingDoor: 'CH37',
        };
      default:
        return { title: `Étage ${floor}`, subtitle: '', missingDoor: null };
    }
  };

  const handleRefreshCycle = () => {
    const count = refreshOverdueBalances();
    setRefreshMsg(
      count > 0
        ? `${count} compte(s) locataire(s) actualisé(s) avec déduction automatique des crédits d’avance.`
        : 'Tous les comptes courants locataires sont déjà actualisés en temps réel.'
    );
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Bannière Centre d'Alertes & Rappel par E-mail */}
      <AlertCenterBanner onSelectUnit={(u) => onSelectUnit(u, 'INFO')} />

      {/* Cartes KPIs & Jauges Financières Animées */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Jauge 1 : Occupation de la Résidence */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Parc Locatif ({activeBuilding.name})
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563EB] font-extrabold text-xs">
                {stats.occupancyRate}% Occupé
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
              {stats.occupiedCount} / {stats.totalUnits}{' '}
              <span className="text-base font-bold text-slate-500">Portes</span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              {stats.roomsCount} Chambres (CH) • {stats.studiosCount} Studios (ST)
            </p>
          </div>
          <div className="mt-4">
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.occupancyRate}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#1E3A8A] to-[#2563EB]"
              />
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-500 mt-1.5">
              <span>{stats.occupiedCount} occupés</span>
              <span>{stats.vacantCount} vacants</span>
            </div>
          </div>
        </motion.div>

        {/* Jauge 2 : Loyers à Jour & Crédits d'Avance Reportés (Vert Émeraude) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 border border-emerald-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                Loyers à Jour & Avances
              </span>
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#065F46]">
              {formatFCFA(stats.collectedMonthlyRent)}
            </div>
            <p className="text-xs font-semibold text-emerald-800 mt-1">
              Crédits d’avance reportés :{' '}
              <strong>+{formatFCFA(stats.totalCreditCarryOver)}</strong>
            </p>
          </div>
          <div className="mt-4">
            <div className="w-full h-3 rounded-full bg-emerald-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${
                    stats.occupiedMonthlyRent > 0
                      ? Math.round((stats.collectedMonthlyRent / stats.occupiedMonthlyRent) * 100)
                      : 0
                  }%`,
                }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                className="h-full rounded-full bg-[#10B981]"
              />
            </div>
            <div className="flex justify-between text-xs font-bold text-emerald-800 mt-1.5">
              <span>{stats.paidCount} portes à jour / avance</span>
              <span>
                {stats.occupiedMonthlyRent > 0
                  ? Math.round((stats.collectedMonthlyRent / stats.occupiedMonthlyRent) * 100)
                  : 0}
                % recouvré
              </span>
            </div>
          </div>
        </motion.div>

        {/* Jauge 3 : Restes à payer & Impayés (Orange / Rouge) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                Restes à Payer & Retards
              </span>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#B45309]">
              {formatFCFA(stats.totalArrears)}
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              {stats.partialCount} arrangement(s) partiel(s) • {stats.lateCount} impayé(s)
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'PARTIAL' ? 'ALL' : 'PARTIAL')}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold cursor-pointer"
            >
              {stats.partialCount} Partiels
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'LATE' ? 'ALL' : 'LATE')}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 text-xs font-bold cursor-pointer"
            >
              {stats.lateCount} Retards
            </button>
          </div>
        </motion.div>

        {/* Jauge 4 : Manque à gagner Logements Vacants (Gris Ardoise) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Logements Vacants (Manque à gagner)
              </span>
              <span className="w-3 h-3 rounded-full bg-[#64748B]" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-700">
              {formatFCFA(stats.vacancyLoss)}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {stats.vacantCount} logement(s) inoccupé(s) ce mois-ci
            </p>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'VACANT' ? 'ALL' : 'VACANT')}
              className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <DoorOpen className="w-4 h-4 text-slate-600" />
              <span>
                {statusFilter === 'VACANT'
                  ? 'Afficher toutes les portes'
                  : `Voir les ${stats.vacantCount} portes libres`}
              </span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Barre de Contrôle du Plan : Étages + Filtres Couleurs + Mode Couloir/Grille */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Onglets d'étages */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL' as FloorFilter, label: 'Tous les étages', count: units.length },
              {
                id: 0 as FloorFilter,
                label: 'Rez-de-chaussée (RDC)',
                count: units.filter((u) => u.floor === 0).length,
              },
              {
                id: 1 as FloorFilter,
                label: '1er Étage',
                count: units.filter((u) => u.floor === 1).length,
              },
              {
                id: 2 as FloorFilter,
                label: '2ème Étage',
                count: units.filter((u) => u.floor === 2).length,
              },
              {
                id: 3 as FloorFilter,
                label: '3ème Étage',
                count: units.filter((u) => u.floor === 3).length,
              },
            ].map((tab) => {
              const active = selectedFloor === tab.id;
              return (
                <button
                  key={String(tab.id)}
                  type="button"
                  onClick={() => setSelectedFloor(tab.id)}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0F172A] text-white shadow-md'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Building className={`w-4 h-4 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      active ? 'bg-[#2563EB] text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mode Vue Couloir (Depuis les Escaliers) vs Grille + Actualisation Compte Courant */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshCycle}
              title="Actualiser automatiquement les soldes glissants par rapport aux échéances"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-[#1E3A8A] border border-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#2563EB]" />
              <span>Actualiser Soldes Glissants</span>
            </button>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('CORRIDOR')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                  viewMode === 'CORRIDOR'
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-700 hover:text-[#0F172A]'
                }`}
              >
                <Footprints className="w-4 h-4" />
                <span>Vue Couloir (Depuis les Escaliers)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                  viewMode === 'GRID'
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-700 hover:text-[#0F172A]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Vue Grille</span>
              </button>
            </div>
          </div>
        </div>

        {refreshMsg && (
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#1E3A8A] text-xs sm:text-sm font-bold">
            ✅ {refreshMsg}
          </div>
        )}

        {/* Deuxième ligne : Recherche + Légende Interactive des Statuts Universels */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Légende / Filtres Couleurs Universels */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-[#0F172A] text-white border-[#0F172A]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              Tous ({units.length})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'PAID' ? 'ALL' : 'PAID')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                statusFilter === 'PAID'
                  ? 'bg-[#10B981] text-white border-[#10B981] shadow-sm'
                  : 'bg-emerald-50/70 text-[#065F46] border-emerald-300 hover:bg-emerald-100/80'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  statusFilter === 'PAID' ? 'bg-white' : 'bg-[#10B981]'
                }`}
              />
              <span>À jour / Avance ({stats.paidCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'PARTIAL' ? 'ALL' : 'PARTIAL')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                statusFilter === 'PARTIAL'
                  ? 'bg-[#F59E0B] text-white border-[#F59E0B] shadow-sm'
                  : 'bg-amber-50/80 text-[#92400E] border-amber-300 hover:bg-amber-100/80'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  statusFilter === 'PARTIAL' ? 'bg-white' : 'bg-[#F59E0B]'
                }`}
              />
              <span>Arrangement / Partiel ({stats.partialCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'LATE' ? 'ALL' : 'LATE')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                statusFilter === 'LATE'
                  ? 'bg-[#EF4444] text-white border-[#EF4444] shadow-sm'
                  : 'bg-red-50/80 text-[#991B1B] border-red-300 hover:bg-red-100/80'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  statusFilter === 'LATE' ? 'bg-white' : 'bg-[#EF4444]'
                }`}
              />
              <span>Impayé / Retard ({stats.lateCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === 'VACANT' ? 'ALL' : 'VACANT')}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                statusFilter === 'VACANT'
                  ? 'bg-[#64748B] text-white border-[#64748B] shadow-sm'
                  : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  statusFilter === 'VACANT' ? 'bg-white' : 'bg-[#64748B]'
                }`}
              />
              <span>Vacant ({stats.vacantCount})</span>
            </button>
          </div>

          {/* Barre de recherche rapide */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Chercher CH15, ST21, nom, garant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Affichage Dynamique des Étages avec Transitions Framer Motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedFloor}-${viewMode}-${statusFilter}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="space-y-8"
        >
          {floorsToRender.map((floorNum) => {
            const floorUnits = filteredUnits.filter((u) => u.floor === floorNum);
            if (floorUnits.length === 0) return null;

            const floorMeta = getFloorTitle(floorNum);
            const leftOddUnits = floorUnits
              .filter((u) => u.side === 'LEFT_ODD')
              .sort((a, b) => a.corridorPosition - b.corridorPosition);
            const rightEvenUnits = floorUnits
              .filter((u) => u.side === 'RIGHT_EVEN')
              .sort((a, b) => a.corridorPosition - b.corridorPosition);

            const maxPositions = floorNum === 0 ? [1, 2, 3, 4] : [1, 2, 3, 4, 5];

            return (
              <section
                key={floorNum}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* En-tête de l'Étage */}
                <div className="bg-[#0F172A] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#2563EB] flex items-center justify-center font-extrabold text-lg shadow-sm">
                      {floorNum === 0 ? 'RDC' : `E${floorNum}`}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-extrabold text-white">
                        {floorMeta.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-blue-200 font-medium">
                        {floorMeta.subtitle}
                      </p>
                    </div>
                  </div>

                  {floorMeta.missingDoor && (
                    <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-amber-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>
                        Pas de {floorMeta.missingDoor} • ST{floorNum}1 & ST{floorNum}2 dès les
                        escaliers • CH{floorNum}5 & CH{floorNum}8 tout au fond
                      </span>
                    </div>
                  )}
                </div>

                {/* Contenu de l'étage : VUE COULOIR ARCHITECTURALE ou VUE GRILLE */}
                {viewMode === 'CORRIDOR' && statusFilter === 'ALL' && !searchQuery.trim() ? (
                  <div className="p-4 sm:p-6 bg-[#F8FAFC]">
                    {/* En-tête des deux ailes du couloir */}
                    <div className="hidden lg:grid lg:grid-cols-11 gap-4 mb-4">
                      <div className="col-span-5 px-4 py-2.5 rounded-xl bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#1E3A8A]">
                          ⬅️ Côté Gauche — Portes Impaires (
                          {floorNum > 0
                            ? `ST${floorNum}1 puis CH${floorNum}1, CH${floorNum}3, CH${floorNum}5`
                            : 'CH01, CH03, CH05, CH07'}
                          )
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {leftOddUnits.length} portes
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                          Couloir
                        </span>
                      </div>
                      <div className="col-span-5 px-4 py-2.5 rounded-xl bg-[#1E3A8A]/10 border border-[#1E3A8A]/20 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#1E3A8A]">
                          Côté Droit — Portes Paires (
                          {floorNum > 0
                            ? `ST${floorNum}2 puis CH${floorNum}2, CH${floorNum}4, CH${floorNum}6, CH${floorNum}8`
                            : 'CH02, CH04, CH06, CH08'}
                          ) ➡️
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          {rightEvenUnits.length} portes
                        </span>
                      </div>
                    </div>

                    {/* Rangées du couloir position par position depuis l'entrée / escaliers jusqu'au fond */}
                    <div className="space-y-4">
                      {maxPositions.map((pos) => {
                        const leftUnit = leftOddUnits.find((u) => u.corridorPosition === pos);
                        const rightUnit = rightEvenUnits.find((u) => u.corridorPosition === pos);
                        const isEntranceStairsRow = pos === 1;
                        const isBackOfCorridorRow =
                          (floorNum === 0 && pos === 4) || (floorNum > 0 && pos === 5);
                        const isMissingOddDoor = floorNum > 0 && pos === 4 && !leftUnit;

                        return (
                          <div key={pos} className="space-y-2">
                            {/* Repère Visuel Début du Couloir / Arrivée des Escaliers */}
                            {isEntranceStairsRow && (
                              <div className="pb-1 flex items-center gap-3">
                                <div className="h-px bg-blue-300 flex-grow" />
                                <span className="px-4 py-1.5 rounded-full bg-[#1E3A8A] text-white text-xs font-extrabold uppercase tracking-wider shadow-xs">
                                  {floorNum === 0
                                    ? '🚪 Entrée Principale RDC — Début du Couloir (CH01 & CH02)'
                                    : `🪜 Arrivée des Escaliers (Début du Couloir) — Studios ST${floorNum}1 (Gauche) & ST${floorNum}2 (Droite)`}
                                </span>
                                <div className="h-px bg-blue-300 flex-grow" />
                              </div>
                            )}

                            {/* Repère Visuel Passage des Studios aux Chambres */}
                            {floorNum > 0 && pos === 2 && (
                              <div className="pt-2 pb-1 flex items-center gap-3">
                                <div className="h-px bg-slate-300 flex-grow" />
                                <span className="px-3.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                                  Suite du Couloir — Alignement des Chambres (Impairs à gauche /
                                  Pairs à droite)
                                </span>
                                <div className="h-px bg-slate-300 flex-grow" />
                              </div>
                            )}

                            {/* Repère Visuel Tout au Fond du Couloir (CHX5 & CHX8) */}
                            {isBackOfCorridorRow && (
                              <div className="pt-2 pb-1 flex items-center gap-3">
                                <div className="h-px bg-slate-300 flex-grow" />
                                <span className="px-3.5 py-1 rounded-full bg-[#0F172A] text-blue-200 text-xs font-extrabold uppercase tracking-wider">
                                  {floorNum === 0
                                    ? '🏁 Tout au Fond du Couloir RDC (CH07 Gauche & CH08 Droite)'
                                    : `🏁 Tout au Fond du Couloir — Chambres CH${floorNum}5 (Gauche) & CH${floorNum}8 (Droite)`}
                                </span>
                                <div className="h-px bg-slate-300 flex-grow" />
                              </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
                              {/* Porte Côté Gauche (Impair) */}
                              <div className="lg:col-span-5 flex">
                                {leftUnit ? (
                                  <UnitDoorCard
                                    unit={leftUnit}
                                    onSelectUnit={onSelectUnit}
                                    settings={settings}
                                  />
                                ) : isMissingOddDoor ? (
                                  <div className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100/70 p-5 flex flex-col items-center justify-center text-center">
                                    <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider mb-1.5">
                                      Pas de porte {floorMeta.missingDoor}
                                    </span>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-500">
                                      Aucun numéro {floorMeta.missingDoor} sur cet étage (en face de{' '}
                                      {rightUnit?.code}). La chambre impaire suivante (CH{floorNum}
                                      5) est tout au fond face à CH{floorNum}8.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="w-full" />
                                )}
                              </div>

                              {/* Couloir Central */}
                              <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center relative">
                                <div className="w-full h-full rounded-xl bg-slate-200/70 border border-slate-300/60 flex flex-col items-center justify-center py-2">
                                  <Footprints className="w-4 h-4 text-slate-400 mb-1" />
                                  <span className="text-[11px] font-extrabold text-slate-500">
                                    {pos === 1
                                      ? 'Début'
                                      : isBackOfCorridorRow
                                      ? 'Fond'
                                      : `Rang ${pos}`}
                                  </span>
                                </div>
                              </div>

                              {/* Porte Côté Droit (Pair) */}
                              <div className="lg:col-span-5 flex">
                                {rightUnit ? (
                                  <UnitDoorCard
                                    unit={rightUnit}
                                    onSelectUnit={onSelectUnit}
                                    settings={settings}
                                  />
                                ) : (
                                  <div className="w-full" />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* VUE GRILLE EN CASCADE */
                  <div className="p-4 sm:p-6 bg-[#F8FAFC] grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {floorUnits.map((unit, idx) => (
                      <motion.div
                        key={unit.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="flex"
                      >
                        <UnitDoorCard
                          unit={unit}
                          onSelectUnit={onSelectUnit}
                          settings={settings}
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

interface UnitDoorCardProps {
  unit: RentalUnit;
  onSelectUnit: (unit: RentalUnit, initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES') => void;
  settings: ReturnType<typeof useApp>['settings'];
}

const UnitDoorCard: React.FC<UnitDoorCardProps> = ({ unit, onSelectUnit, settings }) => {
  const statusCfg = getStatusConfig(unit.status);
  const daysUntilDue = unit.tenant ? getDaysUntilDue(unit.tenant.rentValidUntil) : 999;
  const isDueSoon =
    unit.status === 'PAID' && daysUntilDue >= 0 && daysUntilDue <= settings.alertDaysBeforeDue;

  const depositRemaining = unit.tenant
    ? Math.max(0, unit.tenant.depositRequired - unit.tenant.depositPaid)
    : 0;

  const creditCarryOver = unit.tenant?.creditBalance || 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`w-full bg-white rounded-2xl border-2 ${statusCfg.borderCard} shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between`}
    >
      <div>
        {/* Ligne 1 : Code Porte (CHxx / STxx) + Type + Statut Couleur */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectUnit(unit, 'INFO')}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1.5 cursor-pointer shadow-xs ${
                unit.type === 'STUDIO'
                  ? 'bg-[#1E3A8A] text-white'
                  : 'bg-[#0F172A] text-white'
              }`}
            >
              <Home className="w-4 h-4 text-blue-300" />
              <span>{unit.code}</span>
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {unit.type === 'STUDIO' ? 'Studio (Début Couloir)' : 'Chambre'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {unit.side === 'LEFT_ODD' ? 'Gauche (Impair)' : 'Droite (Pair)'}
                </span>
              </div>
              <div className="text-sm font-extrabold text-[#2563EB] mt-0.5">
                {formatFCFA(unit.monthlyRent)}{' '}
                <span className="text-xs font-medium text-slate-500">/ mois</span>
              </div>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 shrink-0 ${statusCfg.bgBadge}`}
          >
            <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
            <span>{statusCfg.label}</span>
          </span>
        </div>

        {/* Contenu : Locataire ou Logement Vacant */}
        {unit.tenant ? (
          <div className="space-y-2.5">
            <div
              onClick={() => onSelectUnit(unit, 'INFO')}
              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-blue-50/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-extrabold text-base text-[#0F172A] truncate">
                  {unit.tenant.fullName}
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                  {unit.tenant.profileType === 'STUDENT'
                    ? 'Étudiant(e)'
                    : unit.tenant.profileType === 'EMPLOYEE'
                    ? 'Salarié(e)'
                    : 'Indépendant'}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5 text-xs text-slate-600 font-medium">
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {unit.tenant.phone}
                </span>
                <span>
                  Valide jusqu’au :{' '}
                  <strong className="text-[#0F172A]">
                    {formatDateFR(unit.tenant.rentValidUntil)}
                  </strong>
                </span>
              </div>

              {/* Information Garant */}
              {!unit.tenant.guarantor.noGuarantorRequired && unit.tenant.guarantor.fullName && (
                <div className="mt-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-2">
                  <span className="truncate">
                    Garant ({unit.tenant.guarantor.relationship}) :{' '}
                    <strong className="text-slate-800">{unit.tenant.guarantor.fullName}</strong>
                  </span>
                  <span className="text-slate-500 shrink-0">{unit.tenant.guarantor.phone}</span>
                </div>
              )}
            </div>

            {/* Crédit d'avance positif reporté (Compte courant glissant) */}
            {creditCarryOver > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-[#065F46] font-extrabold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#10B981]" />
                  <span>Crédit d’avance reporté :</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#10B981] text-white">
                  +{formatFCFA(creditCarryOver)}
                </span>
              </div>
            )}

            {/* Indicateurs Financiers Spécifiques (Reste à payer, Caution incomplète, Échéance proche) */}
            {unit.status === 'PARTIAL' && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center justify-between">
                <span className="font-bold">
                  Payé : {formatFCFA(unit.tenant.amountPaidCurrentPeriod)}
                </span>
                <span className="font-extrabold text-[#B45309]">
                  Reste à payer : {formatFCFA(unit.tenant.balanceDue)}
                </span>
              </div>
            )}

            {unit.status === 'LATE' && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-950 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1 text-[#EF4444]">
                  <AlertCircle className="w-4 h-4" />
                  Loyer en retard
                </span>
                <span className="font-extrabold text-[#991B1B]">
                  Attendu : {formatFCFA(unit.tenant.balanceDue || unit.monthlyRent)}
                </span>
              </div>
            )}

            {isDueSoon && (
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1E3A8A] font-bold flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span>Échéance proche : arrive à terme dans {daysUntilDue} jour(s)</span>
              </div>
            )}

            {depositRemaining > 0 && (
              <div className="text-xs font-bold text-amber-800 bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-200">
                ⚠️ Caution incomplète : reste {formatFCFA(depositRemaining)} à verser
              </div>
            )}

            {unit.tenant.arrangementNotes && (
              <p className="text-xs text-slate-600 italic bg-slate-50 px-3 py-2 rounded-lg border-l-4 border-[#2563EB] line-clamp-2">
                « {unit.tenant.arrangementNotes} »
              </p>
            )}
          </div>
        ) : (
          /* Carte Logement Vacant */
          <div className="py-5 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center my-2">
            <DoorOpen className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
            <div className="text-sm font-extrabold text-slate-700">Logement Libre / Vacant</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Prêt à accueillir un nouveau locataire ({formatFCFA(unit.monthlyRent)}/mois)
            </p>
          </div>
        )}
      </div>

      {/* Barre de Boutons d'Action Senior-Friendly en bas de la carte */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {unit.tenant ? (
          <>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectUnit(unit, 'INFO')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Dossier & Garant</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelectUnit(unit, 'PAYMENT')}
                className="px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Encaisser</span>
              </button>
            </div>

            {/* Raccourcis WhatsApp Locataire & Garant */}
            <div className="flex items-center gap-1.5">
              <a
                href={buildTenantWhatsAppUrl(unit, settings)}
                target="_blank"
                rel="noopener noreferrer"
                title="Relancer ou écrire au locataire sur WhatsApp"
                className="px-2.5 py-2 rounded-xl bg-emerald-50 hover:bg-[#10B981] text-[#065F46] hover:text-white border border-emerald-200 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WA</span>
              </a>

              {!unit.tenant.guarantor.noGuarantorRequired && unit.tenant.guarantor.phone && (
                <a
                  href={buildGuarantorWhatsAppUrl(unit, settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Contacter le garant (${unit.tenant.guarantor.fullName}) sur WhatsApp`}
                  className="px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-[#1E3A8A] text-[#1E3A8A] hover:text-white border border-blue-200 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Garant</span>
                </a>
              )}
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onSelectUnit(unit, 'INFO')}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-[#2563EB] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Installer un Locataire dans {unit.code}</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
