import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BRAND_CONFIG } from '@config/constants';
import { AuthScreen } from './components/AuthScreen';
import { BuildingFloorMap } from './components/BuildingFloorMap';
import { FinancesAndBudgetView } from './components/FinancesAndBudgetView';
import { ReceiptPrintModal } from './components/ReceiptPrintModal';
import { SettingsView } from './components/SettingsView';
import { TenantsAndPaymentsView } from './components/TenantsAndPaymentsView';
import { MainTabId, TopBarAndNav } from './components/TopBarAndNav';
import { UnitSlideOverModal } from './components/UnitSlideOverModal';
import { UtilitiesManagementView } from './components/UtilitiesManagementView';
import { AppProvider, useApp } from './context/AppContext';
import { PaymentRecord, RentalUnit } from './types';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, activeBuilding, settings } = useApp();
  const [activeTab, setActiveTab] = useState<MainTabId>('BUILDING_MAP');
  const [selectedUnit, setSelectedUnit] = useState<RentalUnit | null>(null);
  const [slideOverInitialTab, setSlideOverInitialTab] = useState<
    'INFO' | 'PAYMENT' | 'UTILITIES' | 'DOCUMENTS'
  >('INFO');
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleOpenUnit = (
    unit: RentalUnit,
    initialTab: 'INFO' | 'PAYMENT' | 'UTILITIES' | 'DOCUMENTS' = 'INFO'
  ) => {
    setSlideOverInitialTab(initialTab);
    setSelectedUnit(unit);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Barre Supérieure & Navigation Senior-Friendly */}
      <TopBarAndNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenu Principal */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'BUILDING_MAP' && (
              <BuildingFloorMap onSelectUnit={handleOpenUnit} />
            )}

            {activeTab === 'TENANTS_PAYMENTS' && (
              <TenantsAndPaymentsView
                onSelectUnit={handleOpenUnit}
                onOpenReceipt={(p) => setActiveReceipt(p)}
              />
            )}

            {activeTab === 'UTILITIES' && (
              <UtilitiesManagementView onSelectUnit={handleOpenUnit} />
            )}

            {activeTab === 'FINANCES_BUDGET' && <FinancesAndBudgetView />}

            {activeTab === 'SETTINGS' && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Pied de page sobre */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="text-[#0F172A]">{BRAND_CONFIG.companyName}</strong> —{' '}
            {BRAND_CONFIG.tagline} • Bien actif : <strong>{activeBuilding.name}</strong>
          </div>
          <div>
            Propriétaire : <strong>{settings.ownerName}</strong> • Tarifs de base : Chambre{' '}
            <strong>{settings.defaultRoomPrice.toLocaleString('fr-FR')} FCFA</strong> | Studio{' '}
            <strong>{settings.defaultStudioPrice.toLocaleString('fr-FR')} FCFA</strong>
          </div>
        </div>
      </footer>

      {/* Panneau Latéral (Slide-over) Fiche Locataire, Garant & Moteur de Paiement */}
      {selectedUnit && (
        <UnitSlideOverModal
          unit={selectedUnit}
          initialTab={slideOverInitialTab}
          onClose={() => setSelectedUnit(null)}
          onOpenReceipt={(p) => setActiveReceipt(p)}
        />
      )}

      {/* Modale d'Impression de Quittance Officielle */}
      {activeReceipt && (
        <ReceiptPrintModal
          payment={activeReceipt}
          onClose={() => setActiveReceipt(null)}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

export default App;
