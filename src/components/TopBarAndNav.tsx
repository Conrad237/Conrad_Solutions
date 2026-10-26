import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Download,
  Droplets,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  LayoutGrid,
  LogOut,
  MapPin,
  PlusCircle,
  RotateCcw,
  Save,
  Settings,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { BRAND_CONFIG } from '@config/constants';
import { useApp } from '../context/AppContext';
import { BuildingPhotoRecord } from '../types';
import { downloadMonthlyExcelReport } from '../utils/excelExport';
import {
  deleteBuildingPhotoFromIDB,
  getBuildingPhotosFromIDB,
  saveBuildingPhotoToIDB,
} from '../utils/indexedDbStorage';

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
    updateBuildingInfo,
    deleteBuilding,
    restoreDefaultMoroBuilding,
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
  const [newBldgExactAddress, setNewBldgExactAddress] = useState('');
  const [newBldgLandmark, setNewBldgLandmark] = useState('');
  const [newBldgMapsUrl, setNewBldgMapsUrl] = useState('');
  const [newRoomCount, setNewRoomCount] = useState(8);
  const [newStudioCount, setNewStudioCount] = useState(2);
  const [newApartmentCount, setNewApartmentCount] = useState(2);
  const [newShopCount, setNewShopCount] = useState(2);
  const [newWarehouseCount, setNewWarehouseCount] = useState(0);

  // Modale Fiche Immeuble Actif (Emplacement, Galerie Photos IndexedDB & Suppression d'immeuble)
  const [showBuildingSheetModal, setShowBuildingSheetModal] = useState(false);
  const [editBldgName, setEditBldgName] = useState('');
  const [editBldgCity, setEditBldgCity] = useState('');
  const [editBldgNeighborhood, setEditBldgNeighborhood] = useState('');
  const [editBldgExactAddress, setEditBldgExactAddress] = useState('');
  const [editBldgLandmark, setEditBldgLandmark] = useState('');
  const [editBldgMapsUrl, setEditBldgMapsUrl] = useState('');
  const [bldgSavedToast, setBldgSavedToast] = useState<string | null>(null);

  // Galerie Photos de l'immeuble actif (stockée dans IndexedDB)
  const [buildingPhotos, setBuildingPhotos] = useState<BuildingPhotoRecord[]>([]);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<BuildingPhotoRecord | null>(null);

  // Fenêtres de confirmation de sécurité (Suppression d'immeuble & Restauration Résidence Moro)
  const [confirmDeleteBuilding, setConfirmDeleteBuilding] = useState(false);
  const [confirmRestoreMoro, setConfirmRestoreMoro] = useState(false);

  // Modale Rapport Mensuel Excel (.xlsx)
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Octobre par défaut
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [excelSuccessToast, setExcelSuccessToast] = useState(false);

  // Synchroniser les champs de la fiche immeuble avec l'immeuble actif
  useEffect(() => {
    if (!activeBuilding) return;
    setEditBldgName(activeBuilding.name || '');
    setEditBldgCity(activeBuilding.city || '');
    setEditBldgNeighborhood(activeBuilding.neighborhood || '');
    setEditBldgExactAddress(activeBuilding.exactAddress || '');
    setEditBldgLandmark(activeBuilding.landmarkDescription || '');
    setEditBldgMapsUrl(activeBuilding.googleMapsUrl || '');
    getBuildingPhotosFromIDB(activeBuilding.id).then(setBuildingPhotos);
  }, [activeBuilding, showBuildingSheetModal]);

  const handleSaveBuildingInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBldgName.trim()) return;
    updateBuildingInfo(activeBuilding.id, {
      name: editBldgName.trim(),
      city: editBldgCity.trim(),
      neighborhood: editBldgNeighborhood.trim(),
      exactAddress: editBldgExactAddress.trim(),
      landmarkDescription: editBldgLandmark.trim(),
      googleMapsUrl: editBldgMapsUrl.trim(),
    });
    setBldgSavedToast('Informations et emplacement de l’immeuble enregistrés !');
    setTimeout(() => setBldgSavedToast(null), 3500);
  };

  const handleUploadBuildingPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);

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
            caption: photoCaption.trim() || file.name.replace(/\.[^/.]+$/, ''),
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
    setPhotoCaption('');
    setIsUploadingPhoto(false);
    setBldgSavedToast('Photo(s) ajoutée(s) dans la galerie de l’immeuble (IndexedDB) !');
    setTimeout(() => setBldgSavedToast(null), 3500);
    e.target.value = '';
  };

  const handleDeleteBuildingPhoto = async (photoId: string) => {
    await deleteBuildingPhotoFromIDB(photoId);
    const refreshed = await getBuildingPhotosFromIDB(activeBuilding.id);
    setBuildingPhotos(refreshed);
    if (lightboxPhoto?.id === photoId) {
      setLightboxPhoto(null);
    }
  };

  const handleConfirmDeleteActiveBuilding = () => {
    const deletedName = activeBuilding.name;
    deleteBuilding(activeBuilding.id);
    setConfirmDeleteBuilding(false);
    setShowBuildingSheetModal(false);
    setBldgSavedToast(`L'immeuble "${deletedName}" a été supprimé.`);
    setTimeout(() => setBldgSavedToast(null), 3500);
  };

  const handleConfirmRestoreMoro = () => {
    restoreDefaultMoroBuilding();
    setConfirmRestoreMoro(false);
    setBldgSavedToast('La Résidence Moro (35 unités par défaut) a été restaurée avec succès !');
    setTimeout(() => setBldgSavedToast(null), 4000);
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
      Number(newWarehouseCount) || 0,
      newBldgExactAddress.trim(),
      newBldgLandmark.trim(),
      newBldgMapsUrl.trim()
    );
    setNewBldgName('');
    setNewBldgExactAddress('');
    setNewBldgLandmark('');
    setNewBldgMapsUrl('');
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
          {/* Ligne Supérieure : Marque + Sélecteur d'Immeuble + Actions Rapides Web */}
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
                    Plateforme Web Cloud
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Compte Bailleur : <strong className="text-white">{settings.ownerName}</strong>
                </p>
              </div>
            </div>

            {/* Sélecteur de Biens Actif + Fiche Immeuble/Photos + Rapport Excel + Ajouter Immeuble */}
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

              {/* Bouton Fiche Immeuble, Photos & Gestion/Suppression */}
              <button
                type="button"
                onClick={() => setShowBuildingSheetModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-200 font-extrabold text-xs sm:text-sm flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-xs"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                <span>Fiche Immeuble & Photos ({buildingPhotos.length})</span>
              </button>

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
                  <p>
                    • <strong>Onglet 1 (État Mensuel des Logements) :</strong> 1 ligne par logement
                    avec Loyer, Avance/Mois couverts, Forfait Eau (2000/1500 FCFA), Électricité ENEO
                    (Facturé / Avance / Reste) et Solde Global Net.
                  </p>
                  <p>
                    • <strong>Onglet 2 (Synthèse Financière & Travaux) :</strong> Total encaissé,
                    Reste à recouvrer, Logements vacants et Dépenses de maintenance.
                  </p>
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
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Année</label>
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

      {/* MODALE 2 : Fiche de l'Immeuble Actif — Emplacement, Galerie Photos (IndexedDB + Lightbox) & Suppression */}
      <AnimatePresence>
        {showBuildingSheetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden my-6 max-h-[92vh] flex flex-col"
            >
              {/* En-tête */}
              <div className="bg-[#0F172A] text-white px-6 py-5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#2563EB] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-extrabold">
                      Fiche Immeuble : {activeBuilding.name}
                    </h3>
                    <p className="text-xs text-blue-200">
                      Emplacement géographique, Galerie Photos & Gestion du Bien ({units.length}{' '}
                      unités)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuildingSheetModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {bldgSavedToast && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-[#10B981] text-emerald-950 font-extrabold text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                    <span>{bldgSavedToast}</span>
                  </div>
                )}

                {/* SECTION 1 : EMPLACEMENT & LOCALISATION DE L'IMMEUBLE */}
                <form
                  onSubmit={handleSaveBuildingInfo}
                  className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <h4 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-[#2563EB]" />
                      <span>1. Emplacement & Localisation Géographique de l’Immeuble</span>
                    </h4>
                    {editBldgMapsUrl && (
                      <a
                        href={editBldgMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-[#1E3A8A] font-extrabold text-xs flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ouvrir sur Google Maps</span>
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                        Nom de l’immeuble *
                      </label>
                      <input
                        type="text"
                        required
                        value={editBldgName}
                        onChange={(e) => setEditBldgName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-bold text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                        Ville
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Yaoundé, Cameroun"
                        value={editBldgCity}
                        onChange={(e) => setEditBldgCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                        Quartier
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Ngoa-Ekellé / Bastos"
                        value={editBldgNeighborhood}
                        onChange={(e) => setEditBldgNeighborhood(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                        Adresse précise (Rue / Secteur)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Avenue Principale, entrée carrefour..."
                        value={editBldgExactAddress}
                        onChange={(e) => setEditBldgExactAddress(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#0F172A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                        Repère géographique
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: À 150m du Campus, portail bleu..."
                        value={editBldgLandmark}
                        onChange={(e) => setEditBldgLandmark(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                        Lien Google Maps (URL de localisation)
                      </label>
                      <input
                        type="url"
                        placeholder="https://maps.google.com/?q=..."
                        value={editBldgMapsUrl}
                        onChange={(e) => setEditBldgMapsUrl(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0F172A]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer l’Emplacement</span>
                    </button>
                  </div>
                </form>

                {/* SECTION 2 : PHOTOS & VISUELS DE L'IMMEUBLE (GALERIE + LIGHTBOX PLEIN ÉCRAN) */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-base font-extrabold text-[#0F172A] flex items-center gap-2">
                        <Camera className="w-5 h-5 text-[#2563EB]" />
                        <span>
                          2. Photos & Visuels de l’Immeuble ({buildingPhotos.length} photo
                          {buildingPhotos.length > 1 ? 's' : ''})
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Stockées dans IndexedDB sur votre navigateur. Cliquez sur une photo pour
                        l’ouvrir en grand format.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        placeholder="Légende (ex: Façade principale)"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-[#0F172A]"
                      />
                      <label className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-[#2563EB] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors shadow-xs">
                        <Upload className="w-4 h-4" />
                        <span>
                          {isUploadingPhoto ? 'Ajout en cours...' : '+ Ajouter des Photos'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleUploadBuildingPhotos}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {buildingPhotos.length === 0 ? (
                    <div className="py-8 px-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-center">
                      <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm font-extrabold text-slate-700">
                        Aucune photo enregistrée pour « {activeBuilding.name} »
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Ajoutez des photos de la façade, des couloirs, du forage ou des studios pour
                        illustrer votre propriété.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                      {buildingPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="group relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 shadow-xs flex flex-col"
                        >
                          <div
                            onClick={() => setLightboxPhoto(photo)}
                            className="relative h-36 w-full overflow-hidden cursor-pointer"
                          >
                            <img
                              src={photo.dataUrl}
                              alt={photo.caption}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 transition-colors flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-white/95 text-[#0F172A] font-extrabold text-xs flex items-center gap-1 shadow-md transition-opacity">
                                <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                                <span>Agrandir</span>
                              </span>
                            </div>
                          </div>
                          <div className="p-2.5 bg-white flex items-center justify-between gap-2">
                            <div className="truncate">
                              <div className="text-xs font-extrabold text-[#0F172A] truncate">
                                {photo.caption}
                              </div>
                              <div className="text-[11px] text-slate-400">{photo.uploadedAt}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBuildingPhoto(photo.id)}
                              title="Supprimer cette photo"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-[#EF4444] shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 3 : SÉCURITÉ — SUPPRESSION D'IMMEUBLE & RESTAURATION RÉSIDENCE MORO */}
                <div className="bg-red-50/70 rounded-2xl p-5 border border-red-200 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm sm:text-base font-extrabold text-red-950 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                        <span>3. Administration & Suppression de Propriété</span>
                      </h4>
                      <p className="text-xs text-red-900 mt-0.5">
                        Retirez un immeuble créé en test ou restaurez la configuration initiale de
                        la Résidence Moro (35 unités).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreMoro(true)}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#1E3A8A] border border-blue-300 font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="w-4 h-4 text-[#2563EB]" />
                        <span>Restaurer la Résidence Moro par défaut</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteBuilding(true)}
                        className="px-4 py-2.5 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Supprimer cet immeuble</span>
                      </button>
                    </div>
                  </div>

                  {/* Fenêtre de confirmation de suppression d'immeuble */}
                  {confirmDeleteBuilding && (
                    <div className="p-4 rounded-2xl bg-white border-2 border-[#EF4444] space-y-3 shadow-md">
                      <div className="font-extrabold text-sm sm:text-base text-[#991B1B] flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-[#EF4444] shrink-0" />
                        <span>
                          Attention, êtes-vous sûr de vouloir supprimer ce bien («{' '}
                          {activeBuilding.name} » et ses {units.length} unités) ?
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Cette action retirera l’immeuble « {activeBuilding.name} » de votre liste de
                        propriétés. Si c’est le seul immeuble restant, la Résidence Moro par défaut
                        sera rechargée automatiquement.
                      </p>
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteBuilding(false)}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeleteActiveBuilding}
                          className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-red-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Oui, supprimer définitivement cet immeuble</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fenêtre de confirmation de restauration de la Résidence Moro par défaut */}
                  {confirmRestoreMoro && (
                    <div className="p-4 rounded-2xl bg-white border-2 border-[#2563EB] space-y-3 shadow-md">
                      <div className="font-extrabold text-sm sm:text-base text-[#1E3A8A] flex items-center gap-2">
                        <RotateCcw className="w-5 h-5 text-[#2563EB] shrink-0" />
                        <span>
                          Voulez-vous restaurer la Résidence Moro par défaut (35 unités : 8 RDC + 3
                          étages de 2 studios et 7 chambres) ?
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Toutes les 35 portes d’origine de la Résidence Moro seront réinitialisées
                        dans leur disposition exacte, sans supprimer vos autres immeubles.
                      </p>
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreMoro(false)}
                          className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-100 cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmRestoreMoro}
                          className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirmer la restauration</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBuildingSheetModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-sm cursor-pointer"
                >
                  Fermer la Fiche Immeuble
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APERÇU GRAND FORMAT (LIGHTBOX PLEIN ÉCRAN) D'UNE PHOTO D'IMMEUBLE */}
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
                    onClick={() => handleDeleteBuildingPhoto(lightboxPhoto.id)}
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

      {/* MODALE 3 : Ajouter un nouvel immeuble / propriété multi-types avec Emplacement & Google Maps */}
      <AnimatePresence>
        {showAddBuildingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-6"
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
                      Chambres, Studios, Appartements, Boutiques, Magasins & Localisation Maps
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
                  Votre bien principal <strong>Résidence Moro (35 unités)</strong> reste conservé
                  intact. Vous pourrez aussi supprimer à tout moment un immeuble créé en test.
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
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      Quartier
                    </label>
                    <input
                      type="text"
                      value={newBldgNeighborhood}
                      onChange={(e) => setNewBldgNeighborhood(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-[#0F172A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Adresse précise
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rue principale face pharmacie..."
                      value={newBldgExactAddress}
                      onChange={(e) => setNewBldgExactAddress(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1">
                      Repère géographique / Lien Google Maps
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: À 100m du rond-point ou lien https://maps.google.com/..."
                      value={newBldgLandmark}
                      onChange={(e) => {
                        setNewBldgLandmark(e.target.value);
                        if (e.target.value.startsWith('http')) {
                          setNewBldgMapsUrl(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-[#0F172A]"
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
    </>
  );
};
