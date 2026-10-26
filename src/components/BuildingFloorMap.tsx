import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Building,
  CalendarClock,
  Camera,
  Check,
  Clock,
  CreditCard,
  DoorOpen,
  ExternalLink,
  Eye,
  FileText,
  Footprints,
  Home,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Wallet,
  X,
} from 'lucide-react';
import {
  DEFAULT_APARTMENT_PRICE,
  DEFAULT_ROOM_PRICE,
  DEFAULT_SHOP_PRICE,
  DEFAULT_STUDIO_PRICE,
  DEFAULT_WAREHOUSE_PRICE,
  DEFAULT_WATER_FLAT_FEE,
  REDUCED_WATER_FLAT_FEE,
} from '@config/constants';
import { useApp } from '../context/AppContext';
import { BuildingPhotoRecord, RentalUnit, UnitStatus, UnitType } from '../types';
import {
  buildGuarantorWhatsAppUrl,
  buildPreventiveThreeMonthsWhatsAppUrl,
  buildTenantWhatsAppUrl,
  calculateUnitSeparatedBalances,
  formatDateFR,
  formatFCFA,
  getDaysUntilDue,
  getRemainingMonthsCovered,
  getStatusConfig,
  getUnitTypeLabel,
  isPreventiveThreeMonthsAlert,
} from '../utils/formatters';
import {
  deleteBuildingPhotoFromIDB,
  getBuildingPhotosFromIDB,
  saveBuildingPhotoToIDB,
} from '../utils/indexedDbStorage';
import { AlertCenterBanner } from './AlertCenterBanner';

interface BuildingFloorMapProps {
  onSelectUnit: (
    unit: RentalUnit,
    initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES' | 'DOCUMENTS'
  ) => void;
}

type FloorFilter = 'ALL' | 0 | 1 | 2 | 3;
type ViewMode = 'CORRIDOR' | 'GRID';

export const BuildingFloorMap: React.FC<BuildingFloorMapProps> = ({ onSelectUnit }) => {
  const {
    units,
    settings,
    activeBuilding,
    refreshOverdueBalances,
    addCustomUnit,
    updateBuildingInfo,
    deleteBuilding,
    restoreDefaultMoroBuilding,
    deleteUnit,
  } = useApp();
  const [selectedFloor, setSelectedFloor] = useState<FloorFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<UnitStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('CORRIDOR');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  // Galerie Photos & Emplacement de l'Immeuble Actif (IndexedDB)
  const [buildingPhotos, setBuildingPhotos] = useState<BuildingPhotoRecord[]>([]);
  const [photoCaptionInput, setPhotoCaptionInput] = useState('');
  const [isUploadingBldgPhoto, setIsUploadingBldgPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<BuildingPhotoRecord | null>(null);
  const [showLocationEditor, setShowLocationEditor] = useState(false);
  const [bldgCityInput, setBldgCityInput] = useState('');
  const [bldgNeighborhoodInput, setBldgNeighborhoodInput] = useState('');
  const [bldgExactAddressInput, setBldgExactAddressInput] = useState('');
  const [bldgLandmarkInput, setBldgLandmarkInput] = useState('');
  const [bldgMapsUrlInput, setBldgMapsUrlInput] = useState('');

  // Modales de confirmation de suppression (Unité, Immeuble & Restauration Résidence Moro)
  const [unitToDelete, setUnitToDelete] = useState<RentalUnit | null>(null);
  const [confirmDeleteActiveBuilding, setConfirmDeleteActiveBuilding] = useState(false);
  const [confirmRestoreDefaultMoro, setConfirmRestoreDefaultMoro] = useState(false);

  useEffect(() => {
    if (!activeBuilding) return;
    setBldgCityInput(activeBuilding.city || '');
    setBldgNeighborhoodInput(activeBuilding.neighborhood || '');
    setBldgExactAddressInput(activeBuilding.exactAddress || '');
    setBldgLandmarkInput(activeBuilding.landmarkDescription || '');
    setBldgMapsUrlInput(activeBuilding.googleMapsUrl || '');
    getBuildingPhotosFromIDB(activeBuilding.id).then(setBuildingPhotos);
  }, [activeBuilding]);

  const handleSaveBuildingLocation = (e: React.FormEvent) => {
    e.preventDefault();
    updateBuildingInfo(activeBuilding.id, {
      city: bldgCityInput.trim(),
      neighborhood: bldgNeighborhoodInput.trim(),
      exactAddress: bldgExactAddressInput.trim(),
      landmarkDescription: bldgLandmarkInput.trim(),
      googleMapsUrl: bldgMapsUrlInput.trim(),
    });
    setShowLocationEditor(false);
    setRefreshMsg(`Emplacement et repère géographique de « ${activeBuilding.name} » mis à jour !`);
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  const handleUploadBuildingPhotoInline = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingBldgPhoto(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = String(reader.result || '');
          const record: BuildingPhotoRecord = {
            id: `bldg-photo-${activeBuilding.id}-${Date.now()}-${i}`,
            buildingId: activeBuilding.id,
            buildingName: activeBuilding.name,
            caption: photoCaptionInput.trim() || file.name.replace(/\.[^/.]+$/, ''),
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            fileSize: file.size,
            uploadedAt: new Date().toISOString().slice(0, 10),
            dataUrl,
          };
          await saveBuildingPhotoToIDB(record);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    const refreshed = await getBuildingPhotosFromIDB(activeBuilding.id);
    setBuildingPhotos(refreshed);
    setPhotoCaptionInput('');
    setIsUploadingBldgPhoto(false);
    setRefreshMsg(`Photo(s) ajoutée(s) à la galerie de « ${activeBuilding.name} » (IndexedDB) !`);
    setTimeout(() => setRefreshMsg(null), 4000);
    e.target.value = '';
  };

  const handleRemoveBuildingPhoto = async (photoId: string) => {
    await deleteBuildingPhotoFromIDB(photoId);
    const refreshed = await getBuildingPhotosFromIDB(activeBuilding.id);
    setBuildingPhotos(refreshed);
    if (lightboxPhoto?.id === photoId) setLightboxPhoto(null);
  };

  const handleConfirmDeleteUnit = () => {
    if (!unitToDelete) return;
    const code = unitToDelete.code;
    deleteUnit(unitToDelete.id);
    setUnitToDelete(null);
    setRefreshMsg(`Le bien « ${code} » a été supprimé du plan.`);
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  const handleConfirmDeleteBuilding = () => {
    const name = activeBuilding.name;
    deleteBuilding(activeBuilding.id);
    setConfirmDeleteActiveBuilding(false);
    setRefreshMsg(`L'immeuble « ${name} » a été supprimé.`);
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  const handleConfirmRestoreMoro = () => {
    restoreDefaultMoroBuilding();
    setConfirmRestoreDefaultMoro(false);
    setRefreshMsg('La Résidence Moro (35 unités par défaut) a été restaurée avec succès !');
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  // Modale "+ Ajouter un bien personnalisé" (Appartement, Boutique, Magasin, Studio, Chambre)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false);
  const [customType, setCustomType] = useState<UnitType>('APARTMENT');
  const [customCode, setCustomCode] = useState('APT01');
  const [customSubType, setCustomSubType] = useState('Appartement T3');
  const [customLocation, setCustomLocation] = useState('');
  const [customFloor, setCustomFloor] = useState(0);
  const [customRent, setCustomRent] = useState(DEFAULT_APARTMENT_PRICE);
  const [customWaterFee, setCustomWaterFee] = useState(DEFAULT_WATER_FLAT_FEE);
  const [customElecMode, setCustomElecMode] = useState<'METER' | 'FLAT'>('METER');

  const handleUnitTypeChange = (t: UnitType) => {
    setCustomType(t);
    if (t === 'ROOM') {
      setCustomCode(`CH${units.length + 1}`);
      setCustomSubType('Chambre Moderne');
      setCustomRent(DEFAULT_ROOM_PRICE);
      setCustomWaterFee(DEFAULT_WATER_FLAT_FEE);
    } else if (t === 'STUDIO') {
      setCustomCode(`ST${units.length + 1}`);
      setCustomSubType('Studio Moderne');
      setCustomRent(DEFAULT_STUDIO_PRICE);
      setCustomWaterFee(DEFAULT_WATER_FLAT_FEE);
    } else if (t === 'APARTMENT') {
      setCustomCode('APT01');
      setCustomSubType('Appartement T3');
      setCustomRent(DEFAULT_APARTMENT_PRICE);
      setCustomWaterFee(DEFAULT_WATER_FLAT_FEE);
    } else if (t === 'SHOP') {
      setCustomCode('BTQ01');
      setCustomSubType('Boutique / Local Commercial');
      setCustomLocation('Façade Rue (RDC)');
      setCustomRent(DEFAULT_SHOP_PRICE);
      setCustomWaterFee(REDUCED_WATER_FLAT_FEE);
    } else if (t === 'WAREHOUSE') {
      setCustomCode('MAG01');
      setCustomSubType('Magasin / Entrepôt');
      setCustomLocation('Zone Commerciale RDC');
      setCustomRent(DEFAULT_WAREHOUSE_PRICE);
      setCustomWaterFee(0);
    }
  };

  const handleCreateCustomUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCode.trim()) return;
    const created = addCustomUnit({
      code: customCode.trim(),
      type: customType,
      subTypeLabel: customSubType.trim(),
      locationLabel: customLocation.trim(),
      floor: Number(customFloor) || 0,
      monthlyRent: Number(customRent) || 32000,
      waterFlatFee: Number(customWaterFee) || 0,
      electricityMode: customElecMode,
    });
    setShowAddUnitModal(false);
    setRefreshMsg(
      `Nouveau bien "${created.code} (${getUnitTypeLabel(created.type, created.subTypeLabel)})" ajouté avec succès !`
    );
    setTimeout(() => setRefreshMsg(null), 4000);
  };

  // Statistiques globales en temps réel
  const stats = useMemo(() => {
    const totalUnits = units.length;
    const roomsCount = units.filter((u) => u.type === 'ROOM').length;
    const studiosCount = units.filter((u) => u.type === 'STUDIO').length;
    const otherTypesCount = units.filter(
      (u) => u.type !== 'ROOM' && u.type !== 'STUDIO'
    ).length;

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

    // Somme des impayés et restes à payer en cours (Solde Global Net : Loyer + Eau + Élec)
    const totalArrears = units.reduce((acc, u) => {
      if (u.status === 'VACANT') return acc;
      return acc + calculateUnitSeparatedBalances(u).globalNetDue;
    }, 0);

    // Somme des crédits d'avance positifs reportés sur les comptes courants locataires
    const totalCreditCarryOver = units.reduce(
      (acc, u) => acc + (u.tenant?.creditBalance || 0),
      0
    );

    const rentArrearsOnly = units.reduce((acc, u) => {
      if (u.status === 'VACANT') return acc;
      return acc + calculateUnitSeparatedBalances(u).rentBalanceDue;
    }, 0);

    // Loyer mensuel effectivement encaissé sur le mois courant
    const collectedMonthlyRent = Math.max(0, occupiedMonthlyRent - rentArrearsOnly);

    // Manque à gagner lié aux logements vacants
    const vacancyLoss = vacantUnits.reduce((acc, u) => acc + u.monthlyRent, 0);

    return {
      totalUnits,
      roomsCount,
      studiosCount,
      otherTypesCount,
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
        const matchSub = u.subTypeLabel?.toLowerCase().includes(q);
        const matchTenant = u.tenant?.fullName.toLowerCase().includes(q);
        const matchGuarantor = u.tenant?.guarantor.fullName.toLowerCase().includes(q);
        return matchCode || matchSub || matchTenant || matchGuarantor;
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
      {/* Bannière Centre d'Alertes (inclut la Bannière d'Alerte Préventive à 3 Mois) */}
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
              <span className="text-base font-bold text-slate-500">Biens</span>
            </div>
            <p className="text-xs font-semibold text-slate-600 mt-1">
              {stats.roomsCount} Chambres • {stats.studiosCount} Studios
              {stats.otherTypesCount > 0 ? ` • ${stats.otherTypesCount} Autres biens` : ''}
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

        {/* Jauge 3 : Solde Global Net à Recouvrer (Loyer + Forfait Eau + Reste Élec) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-800">
                Solde Global Net à Recouvrer
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
              Loyers + Forfaits Eau (2000/1500) + Reste Élec ENEO
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
              {stats.vacantCount} bien(s) inoccupé(s) ce mois-ci
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

      {/* FICHE DE L'IMMEUBLE ACTIF : EMPLACEMENT, GOOGLE MAPS, GALERIE PHOTOS (INDEXEDDB) & SUPPRESSION */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-xl bg-[#0F172A] text-white font-extrabold text-sm flex items-center gap-1.5">
                <Building className="w-4 h-4 text-blue-400" />
                <span>{activeBuilding.name}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 text-[#1E3A8A] border border-blue-200 text-xs sm:text-sm font-bold">
                <MapPin className="w-4 h-4 text-[#2563EB]" />
                <span>
                  {activeBuilding.city} — {activeBuilding.neighborhood}
                  {activeBuilding.exactAddress ? ` • ${activeBuilding.exactAddress}` : ''}
                </span>
              </span>
              {activeBuilding.googleMapsUrl && (
                <a
                  href={activeBuilding.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#065F46] border border-emerald-200 text-xs font-extrabold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Voir sur Google Maps</span>
                </a>
              )}
            </div>
            {activeBuilding.landmarkDescription && (
              <p className="text-xs sm:text-sm text-slate-600 font-medium pl-1">
                📍 <strong>Repère géographique :</strong> {activeBuilding.landmarkDescription}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowLocationEditor(!showLocationEditor)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>{showLocationEditor ? 'Fermer l’éditeur' : 'Modifier l’emplacement'}</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmRestoreDefaultMoro(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Restaurer la Résidence Moro par défaut</span>
            </button>

            <button
              type="button"
              onClick={() => setConfirmDeleteActiveBuilding(true)}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-red-200 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer cet immeuble</span>
            </button>
          </div>
        </div>

        {/* Formulaire dépliable d'édition rapide de l'emplacement / localisation de l'immeuble */}
        {showLocationEditor && (
          <form
            onSubmit={handleSaveBuildingLocation}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  value={bldgCityInput}
                  onChange={(e) => setBldgCityInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Quartier
                </label>
                <input
                  type="text"
                  value={bldgNeighborhoodInput}
                  onChange={(e) => setBldgNeighborhoodInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-[#0F172A]"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Adresse précise
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rue Principale, entrée carrefour..."
                  value={bldgExactAddressInput}
                  onChange={(e) => setBldgExactAddressInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#0F172A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                  Repère géographique
                </label>
                <input
                  type="text"
                  placeholder="Ex: À 150m du Campus, portail bleu..."
                  value={bldgLandmarkInput}
                  onChange={(e) => setBldgLandmarkInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#0F172A]"
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                    Lien Google Maps
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/?q=..."
                    value={bldgMapsUrlInput}
                    onChange={(e) => setBldgMapsUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-sm text-[#0F172A]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Section Galerie : Photos & Visuels de l'Immeuble (Upload multiple IndexedDB + Lightbox plein écran) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-sm sm:text-base font-extrabold text-[#0F172A]">
                Photos & Visuels de l’Immeuble ({buildingPhotos.length})
              </h3>
              <span className="text-xs text-slate-500 hidden sm:inline">
                • Stockage local IndexedDB haute capacité (cliquez sur une photo pour l’agrandir)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Légende photo (optionnel)"
                value={photoCaptionInput}
                onChange={(e) => setPhotoCaptionInput(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-[#0F172A] bg-slate-50"
              />
              <label className="px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#2563EB] text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isUploadingBldgPhoto ? 'Ajout...' : '+ Ajouter des Photos de l’Immeuble'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleUploadBuildingPhotoInline}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {buildingPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              {buildingPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs flex flex-col"
                >
                  <div
                    onClick={() => setLightboxPhoto(photo)}
                    className="relative h-28 w-full overflow-hidden cursor-pointer"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 px-2.5 py-1 rounded-lg bg-white/95 text-[#0F172A] font-extrabold text-[11px] flex items-center gap-1 shadow-sm">
                        <Eye className="w-3 h-3 text-[#2563EB]" />
                        <span>Grand format</span>
                      </span>
                    </div>
                  </div>
                  <div className="p-2 bg-white flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#0F172A] truncate">
                      {photo.caption}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBuildingPhoto(photo.id)}
                      title="Supprimer cette photo"
                      className="p-1 rounded-lg bg-red-50 hover:bg-red-100 text-[#EF4444] shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Barre de Contrôle du Plan : Étages + Ajout de Bien Multi-Types + Mode Couloir/Grille */}
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

          {/* Boutons : + Ajouter une Unité (Appartement, Boutique, Magasin...) + Vue Couloir/Grille */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddUnitModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Ajouter Appartement / Boutique / Magasin</span>
            </button>

            <button
              type="button"
              onClick={handleRefreshCycle}
              title="Actualiser automatiquement les soldes glissants par rapport aux échéances"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-[#1E3A8A] border border-slate-200 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-[#2563EB]" />
              <span>Actualiser Soldes</span>
            </button>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('CORRIDOR')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'CORRIDOR'
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-700 hover:text-[#0F172A]'
                }`}
              >
                <Footprints className="w-4 h-4" />
                <span>Vue Couloir</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
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

            const maxPosOnFloor = Math.max(
              floorNum === 0 ? 4 : 5,
              ...floorUnits.map((u) => u.corridorPosition)
            );
            const maxPositions = Array.from({ length: maxPosOnFloor }, (_, i) => i + 1);

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

                    <div className="space-y-4">
                      {maxPositions.map((pos) => {
                        const leftUnit = leftOddUnits.find((u) => u.corridorPosition === pos);
                        const rightUnit = rightEvenUnits.find((u) => u.corridorPosition === pos);
                        if (!leftUnit && !rightUnit && !(floorNum > 0 && pos === 4)) return null;

                        const isEntranceStairsRow = pos === 1;
                        const isBackOfCorridorRow =
                          (floorNum === 0 && pos === 4) || (floorNum > 0 && pos === 5);
                        const isMissingOddDoor = floorNum > 0 && pos === 4 && !leftUnit;

                        return (
                          <div key={pos} className="space-y-2">
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
                              <div className="lg:col-span-5 flex">
                                {leftUnit ? (
                                  <UnitDoorCard
                                    unit={leftUnit}
                                    onSelectUnit={onSelectUnit}
                                    onRequestDeleteUnit={(u) => setUnitToDelete(u)}
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

                              <div className="lg:col-span-5 flex">
                                {rightUnit ? (
                                  <UnitDoorCard
                                    unit={rightUnit}
                                    onSelectUnit={onSelectUnit}
                                    onRequestDeleteUnit={(u) => setUnitToDelete(u)}
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
                          onRequestDeleteUnit={(u) => setUnitToDelete(u)}
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

      {/* MODALE : Ajouter un bien personnalisé sans limite (Appartement, Boutique, Magasin, Studio, Chambre) */}
      <AnimatePresence>
        {showAddUnitModal && (
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
                    <PlusCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Ajouter un Nouveau Bien dans « {activeBuilding.name} »
                    </h3>
                    <p className="text-xs text-slate-300">
                      Extension Multi-Biens sans limite : Appartement, Boutique, Magasin, Studio, Chambre
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomUnit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    1. Choisissez la catégorie du bien *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'APARTMENT', label: 'Appartement (T2/T3)' },
                        { id: 'SHOP', label: 'Boutique / Commerce' },
                        { id: 'WAREHOUSE', label: 'Magasin / Entrepôt' },
                        { id: 'STUDIO', label: 'Studio' },
                        { id: 'ROOM', label: 'Chambre' },
                      ] as { id: UnitType; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleUnitTypeChange(opt.id)}
                        className={`px-3 py-2.5 rounded-xl font-extrabold text-xs border transition-all cursor-pointer ${
                          customType === opt.id
                            ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Code / Numéro du bien *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: APT01, BTQ01, MAG01"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-extrabold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Appellation précise (Optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Appartement T3, Boutique Façade"
                      value={customSubType}
                      onChange={(e) => setCustomSubType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-semibold text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Étage de rattachement
                    </label>
                    <select
                      value={customFloor}
                      onChange={(e) => setCustomFloor(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-bold text-[#0F172A] bg-white"
                    >
                      <option value={0}>Rez-de-chaussée (Étage 0)</option>
                      <option value={1}>1er Étage</option>
                      <option value={2}>2ème Étage</option>
                      <option value={3}>3ème Étage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Emplacement spécifique (Optionnel)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Annexe Rue Principale"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Loyer de Base (FCFA/mois)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={customRent}
                      onChange={(e) => setCustomRent(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-base font-extrabold text-[#2563EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Forfait Eau (FCFA/mois)
                    </label>
                    <div className="flex gap-1 mb-1">
                      {[2000, 1500, 0].map((fee) => (
                        <button
                          key={fee}
                          type="button"
                          onClick={() => setCustomWaterFee(fee)}
                          className={`flex-1 py-1 rounded-lg text-xs font-extrabold border cursor-pointer ${
                            customWaterFee === fee
                              ? 'bg-[#1E3A8A] text-white border-[#1E3A8A]'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {fee === 0 ? 'Exonéré' : `${fee}`}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={customWaterFee}
                      onChange={(e) => setCustomWaterFee(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-bold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-700 mb-1">
                      Mode Électricité ENEO
                    </label>
                    <select
                      value={customElecMode}
                      onChange={(e) => setCustomElecMode(e.target.value as 'METER' | 'FLAT')}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-[#0F172A] bg-white"
                    >
                      <option value="METER">Sous-compteur + Avances</option>
                      <option value="FLAT">Forfait mensuel ENEO</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAddUnitModal(false)}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-sm flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ajouter ce Bien au Plan</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APERÇU GRAND FORMAT (LIGHTBOX) DES PHOTOS DE L'IMMEUBLE */}
      <AnimatePresence>
        {lightboxPhoto && (
          <div
            onClick={() => setLightboxPhoto(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full bg-[#0F172A] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl"
            >
              <div className="px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white">
                <div>
                  <h4 className="font-extrabold text-base sm:text-lg">{lightboxPhoto.caption}</h4>
                  <p className="text-xs text-slate-400">
                    {lightboxPhoto.buildingName} • Ajoutée le {lightboxPhoto.uploadedAt}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveBuildingPhoto(lightboxPhoto.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Supprimer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-center bg-slate-950 max-h-[78vh]">
                <img
                  src={lightboxPhoto.dataUrl}
                  alt={lightboxPhoto.caption}
                  className="max-h-[74vh] w-auto object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FENÊTRE DE CONFIRMATION : SUPPRESSION D'UNE UNITÉ INDIVIDUELLE */}
      <AnimatePresence>
        {unitToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border-2 border-[#EF4444] max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3 text-[#EF4444]">
                <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                    Attention, êtes-vous sûr de vouloir supprimer ce bien ?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unité :{' '}
                    <strong>
                      {unitToDelete.code} ({getUnitTypeLabel(unitToDelete.type, unitToDelete.subTypeLabel)})
                    </strong>
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cette unité sera retirée du plan de l’immeuble « {activeBuilding.name} ». Vous
                pourrez toujours restaurer la Résidence Moro par défaut en cas de besoin.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUnitToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUnit}
                  className="px-5 py-2.5 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Oui, supprimer cette unité</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FENÊTRE DE CONFIRMATION : SUPPRESSION DE L'IMMEUBLE ACTIF */}
      <AnimatePresence>
        {confirmDeleteActiveBuilding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border-2 border-[#EF4444] max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                    Attention, êtes-vous sûr de vouloir supprimer ce bien ?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Immeuble : <strong>{activeBuilding.name}</strong> ({units.length} unités)
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cette action retirera l’immeuble « {activeBuilding.name} » de votre gestionnaire de
                propriétés. Si c’est le seul immeuble restant, la Résidence Moro par défaut sera
                rechargée automatiquement.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteActiveBuilding(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteBuilding}
                  className="px-5 py-2.5 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Oui, supprimer cet immeuble</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FENÊTRE DE CONFIRMATION : RESTAURER LA RÉSIDENCE MORO PAR DÉFAUT */}
      <AnimatePresence>
        {confirmRestoreDefaultMoro && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border-2 border-[#2563EB] max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-6 h-6 text-[#2563EB]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                    Restaurer la Résidence Moro par défaut
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configuration initiale : 35 unités (8 au RDC + 3 étages de 9 portes)
                  </p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Voulez-vous restaurer l’intégralité des 35 unités par défaut de la Résidence Moro
                (chambres et studios dans leur disposition d’origine) ?
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreDefaultMoro(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestoreMoro}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer la restauration</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface UnitDoorCardProps {
  unit: RentalUnit;
  onSelectUnit: (
    unit: RentalUnit,
    initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES' | 'DOCUMENTS'
  ) => void;
  onRequestDeleteUnit: (unit: RentalUnit) => void;
  settings: ReturnType<typeof useApp>['settings'];
}

const UnitDoorCard: React.FC<UnitDoorCardProps> = ({
  unit,
  onSelectUnit,
  onRequestDeleteUnit,
  settings,
}) => {
  const statusCfg = getStatusConfig(unit.status);
  const daysUntilDue = unit.tenant ? getDaysUntilDue(unit.tenant.rentValidUntil) : 999;
  const isDueSoon =
    unit.status === 'PAID' && daysUntilDue >= 0 && daysUntilDue <= settings.alertDaysBeforeDue;

  // Alerte préventive à 3 mois (<= 3 mois restants)
  const isPreventiveAlert = isPreventiveThreeMonthsAlert(unit);
  const remainingMonths = getRemainingMonthsCovered(unit);

  // Soldes séparés (Loyer, Forfait Eau, Électricité ENEO et Solde Global Net)
  const balances = calculateUnitSeparatedBalances(unit);

  const depositRemaining = unit.tenant
    ? Math.max(0, unit.tenant.depositRequired - unit.tenant.depositPaid)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`w-full bg-white rounded-2xl border-2 ${statusCfg.borderCard} shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between`}
    >
      <div>
        {/* Ligne 1 : Code Porte + Type + Statut Couleur + Bouton Supprimer Unité */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectUnit(unit, 'INFO')}
              className={`px-3.5 py-2 rounded-xl font-extrabold text-base sm:text-lg tracking-tight flex items-center gap-1.5 cursor-pointer shadow-xs ${
                unit.type === 'STUDIO'
                  ? 'bg-[#1E3A8A] text-white'
                  : unit.type === 'ROOM'
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-[#2563EB] text-white'
              }`}
            >
              <Home className="w-4 h-4 text-blue-300" />
              <span>{unit.code}</span>
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  {unit.type === 'STUDIO'
                    ? 'Studio (Début Couloir)'
                    : getUnitTypeLabel(unit.type, unit.subTypeLabel)}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {unit.locationLabel ||
                    (unit.side === 'LEFT_ODD' ? 'Gauche (Impair)' : 'Droite (Pair)')}
                </span>
              </div>
              <div className="text-sm font-extrabold text-[#2563EB] mt-0.5">
                {formatFCFA(unit.monthlyRent)}{' '}
                <span className="text-xs font-medium text-slate-500">
                  / mois • Eau : {formatFCFA(balances.waterFlatFee)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${statusCfg.bgBadge}`}
            >
              <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
              <span>{statusCfg.label}</span>
            </span>

            <button
              type="button"
              onClick={() => onRequestDeleteUnit(unit)}
              title={`Supprimer l'unité ${unit.code}`}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-[#EF4444] border border-transparent hover:border-red-200 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ALERTE PRÉVENTIVE À 3 MOIS (<= 3 MOIS RESTANTS) SUR LA CARTE DU LOGEMENT */}
        {isPreventiveAlert && unit.tenant && (
          <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50 border-2 border-[#F59E0B] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarClock className="w-4 h-4 text-[#D97706] shrink-0" />
              <div className="text-xs font-extrabold text-[#92400E] leading-tight">
                Échéance proche : &lt;= 3 mois restants ({remainingMonths} mois)
              </div>
            </div>
            <a
              href={buildPreventiveThreeMonthsWhatsAppUrl(unit, settings)}
              target="_blank"
              rel="noopener noreferrer"
              title="Envoyer l'alerte préventive à 3 mois sur WhatsApp"
              className="px-2.5 py-1 rounded-lg bg-[#F59E0B] hover:bg-amber-600 text-white text-[11px] font-extrabold flex items-center gap-1 shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Rappel 3 Mois</span>
            </a>
          </div>
        )}

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

            {/* SÉPARATION VISUELLE : LOYER | FORFAIT EAU | ÉLECTRICITÉ ENEO | SOLDE GLOBAL NET */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-500 uppercase">Loyer</div>
                <div
                  className={`font-extrabold ${
                    balances.rentBalanceDue > 0 ? 'text-[#EF4444]' : 'text-[#065F46]'
                  }`}
                >
                  {balances.rentBalanceDue > 0
                    ? `Dû ${formatFCFA(balances.rentBalanceDue, false)}`
                    : balances.rentCreditCarry > 0
                    ? `+${formatFCFA(balances.rentCreditCarry, false)}`
                    : 'À jour'}
                </div>
              </div>

              <div
                onClick={() => onSelectUnit(unit, 'UTILITIES')}
                className="p-2 rounded-lg bg-blue-50/60 border border-blue-200 cursor-pointer hover:bg-blue-100/60"
              >
                <div className="font-bold text-[#1E3A8A] uppercase">
                  Eau ({balances.waterFlatFee})
                </div>
                <div
                  className={`font-extrabold ${
                    balances.waterRemainingDue > 0 ? 'text-[#B45309]' : 'text-[#065F46]'
                  }`}
                >
                  {balances.waterRemainingDue > 0
                    ? `Dû ${formatFCFA(balances.waterRemainingDue, false)}`
                    : 'Payé'}
                </div>
              </div>

              <div
                onClick={() => onSelectUnit(unit, 'UTILITIES')}
                className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 cursor-pointer hover:bg-amber-100/60"
              >
                <div className="font-bold text-amber-900 uppercase">Élec ENEO</div>
                <div
                  className={`font-extrabold ${
                    balances.electricityRemainingDue > 0 ? 'text-[#B45309]' : 'text-[#065F46]'
                  }`}
                >
                  {balances.electricityRemainingDue > 0
                    ? `Reste ${formatFCFA(balances.electricityRemainingDue, false)}`
                    : 'Soldé'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[#0F172A] text-white">
                <div className="font-bold text-slate-300 uppercase">Solde Net</div>
                <div
                  className={`font-extrabold ${
                    balances.globalNetDue > 0 ? 'text-amber-300' : 'text-emerald-300'
                  }`}
                >
                  {balances.globalNetDue > 0
                    ? `${formatFCFA(balances.globalNetDue, false)} F`
                    : balances.globalNetCredit > 0
                    ? `+${formatFCFA(balances.globalNetCredit, false)} F`
                    : '0 FCFA'}
                </div>
              </div>
            </div>

            {/* Crédit d'avance positif reporté */}
            {balances.rentCreditCarry > 0 && (
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-[#065F46] font-extrabold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-[#10B981]" />
                  <span>Crédit d’avance Loyer reporté :</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#10B981] text-white">
                  +{formatFCFA(balances.rentCreditCarry)}
                </span>
              </div>
            )}

            {unit.status === 'PARTIAL' && (
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center justify-between">
                <span className="font-bold">
                  Versé : {formatFCFA(unit.tenant.amountPaidCurrentPeriod)}
                </span>
                <span className="font-extrabold text-[#B45309]">
                  Reste Loyer : {formatFCFA(unit.tenant.balanceDue)}
                </span>
              </div>
            )}

            {unit.status === 'LATE' && (
              <div className="p-2 rounded-xl bg-red-50 border border-red-300 text-xs text-red-950 flex items-center justify-between">
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
                <span>Échéance imminente : arrive à terme dans {daysUntilDue} jour(s)</span>
              </div>
            )}

            {depositRemaining > 0 && (
              <div className="text-xs font-bold text-amber-800 bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-200">
                ⚠️ Caution incomplète : reste {formatFCFA(depositRemaining)} à verser
              </div>
            )}

            {unit.tenant.arrangementNotes && (
              <p className="text-xs text-slate-600 italic bg-slate-50 px-3 py-1.5 rounded-lg border-l-4 border-[#2563EB] line-clamp-2">
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
              Prêt à accueillir un locataire ({formatFCFA(unit.monthlyRent)}/mois • Forfait Eau{' '}
              {formatFCFA(balances.waterFlatFee)})
            </p>
          </div>
        )}
      </div>

      {/* Barre de Boutons d'Action Senior-Friendly en bas de la carte */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {unit.tenant ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectUnit(unit, 'INFO')}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0F172A] font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Dossier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onSelectUnit(unit, 'DOCUMENTS')}
                title="CNI, Contrat de Bail & Règlement Intérieur"
                className="px-2.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>CNI & Bail</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectUnit(unit, 'PAYMENT')}
                className="px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
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
