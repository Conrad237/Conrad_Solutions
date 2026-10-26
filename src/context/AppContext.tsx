import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_APARTMENT_PRICE,
  DEFAULT_SHOP_PRICE,
  DEFAULT_WAREHOUSE_PRICE,
  DEFAULT_WATER_FLAT_FEE,
} from '@config/constants';
import {
  BASE_ANNUAL_HISTORY,
  generateInitialUnits,
  INITIAL_BUILDINGS,
  INITIAL_EXPENSES,
  INITIAL_LANDLORD_SETTINGS,
  INITIAL_PAYMENTS,
  MORO_BUILDING_ID,
} from '../data/seedData';
import {
  BuildingConfig,
  CorridorSide,
  ExpenseRecord,
  LandlordSettings,
  MonthlyFinancialPoint,
  PaymentMethod,
  PaymentRecord,
  RentalUnit,
  TenantInfo,
  UnitStatus,
  UnitType,
  UtilityMeterReading,
} from '../types';
import { addMonthsToDate, calculateSlidingRentPayment } from '../utils/formatters';

interface RecordPaymentInput {
  unitId: string;
  monthsCovered: number;
  periodLabel: string;
  rentAmountPaid: number;
  waterAmountPaid: number;
  electricityAmountPaid: number;
  depositAmountPaid: number;
  paymentMethod: PaymentMethod;
  notes: string;
  customRemainingBalance?: number;
  customCreditCarryOver?: number;
}

export interface AddCustomUnitInput {
  code: string;
  type: UnitType;
  subTypeLabel?: string;
  locationLabel?: string;
  floor: number;
  side?: CorridorSide;
  monthlyRent: number;
  waterFlatFee: number;
  electricityMode: 'METER' | 'FLAT';
}

interface AppContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  buildings: BuildingConfig[];
  activeBuildingId: string;
  activeBuilding: BuildingConfig;
  setActiveBuildingId: (id: string) => void;
  addBuilding: (
    name: string,
    city: string,
    neighborhood: string,
    roomCount: number,
    studioCount: number,
    apartmentCount?: number,
    shopCount?: number,
    warehouseCount?: number,
    exactAddress?: string,
    landmarkDescription?: string,
    googleMapsUrl?: string
  ) => void;
  updateBuildingInfo: (buildingId: string, updates: Partial<BuildingConfig>) => void;
  deleteBuilding: (buildingId: string) => boolean;
  restoreDefaultMoroBuilding: () => void;
  addCustomUnit: (input: AddCustomUnitInput) => RentalUnit;
  deleteUnit: (unitId: string) => void;
  units: RentalUnit[];
  allUnits: RentalUnit[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  settings: LandlordSettings;
  updateSettings: (newSettings: LandlordSettings, applyPricesToUnits?: boolean) => void;
  updateUnitAndTenant: (
    unitId: string,
    updatedMonthlyRent: number,
    updatedStatus: UnitStatus,
    updatedTenant: TenantInfo | null
  ) => void;
  vacateUnit: (unitId: string) => void;
  updateUtilityReading: (unitId: string, utilities: UtilityMeterReading) => void;
  recordPayment: (input: RecordPaymentInput) => PaymentRecord | null;
  refreshOverdueBalances: () => number;
  addExpense: (expense: Omit<ExpenseRecord, 'id' | 'buildingId'>) => void;
  updateExpense: (expense: ExpenseRecord) => void;
  deleteExpense: (id: string) => void;
  resetDemoData: () => void;
  annualFinancials: MonthlyFinancialPoint[];
}

const STORAGE_KEYS = {
  AUTH: 'conrad_solutions_auth_v2',
  BUILDINGS: 'conrad_solutions_buildings_v2',
  ACTIVE_BLDG: 'conrad_solutions_active_bldg_v2',
  UNITS: 'conrad_solutions_units_v2',
  PAYMENTS: 'conrad_solutions_payments_v2',
  EXPENSES: 'conrad_solutions_expenses_v2',
  SETTINGS: 'conrad_solutions_settings_v2',
};

/**
 * ============================================================================
 * MOTEUR DE MIGRATION DOUCE (`mergeState`) SANS AUCUNE PERTE DE DONNÉES
 * ============================================================================
 * Lorsqu'une mise à jour du code est déployée à distance sur Vercel,
 * ces fonctions fusionnent les nouvelles propriétés avec les données déjà
 * enregistrées dans le navigateur du propriétaire (localStorage), SANS JAMAIS
 * écraser ses locataires, paiements, montants ou suppressions.
 */
function mergeUnitState(unit: RentalUnit, defaultUnit?: RentalUnit): RentalUnit {
  const baseUnit = defaultUnit ? { ...defaultUnit, ...unit } : { ...unit };
  const u = (unit.utilities || defaultUnit?.utilities || {}) as UtilityMeterReading;

  const waterFlatFee =
    typeof u.waterFlatFee === 'number' ? u.waterFlatFee : DEFAULT_WATER_FLAT_FEE;
  const electricityAmountDue = Math.max(0, u.electricityAmountDue || 0);
  const electricityAmountPaid =
    typeof u.electricityAmountPaid === 'number'
      ? u.electricityAmountPaid
      : u.electricityPaid
      ? electricityAmountDue
      : 0;
  const electricityBalanceDue = Math.max(0, electricityAmountDue - electricityAmountPaid);
  const electricityCredit = Math.max(0, electricityAmountPaid - electricityAmountDue);

  return {
    ...baseUnit,
    // Préserve strictement le locataire, le loyer et le statut saisis par le propriétaire
    monthlyRent: typeof unit.monthlyRent === 'number' ? unit.monthlyRent : baseUnit.monthlyRent,
    status: unit.status || baseUnit.status,
    tenant: unit.tenant !== undefined ? unit.tenant : baseUnit.tenant,
    utilities: {
      ...u,
      waterMode: 'FLAT',
      waterFlatFee,
      waterAmountDue: waterFlatFee,
      electricityMode: u.electricityMode || 'METER',
      electricityAmountDue,
      electricityAmountPaid,
      electricityBalanceDue,
      electricityCredit,
      electricityPaid: u.electricityPaid || electricityBalanceDue === 0,
    },
  };
}

export function mergeState<T extends 'BUILDINGS' | 'UNITS' | 'SETTINGS'>(
  type: T,
  savedRaw: string | null
): T extends 'BUILDINGS'
  ? BuildingConfig[]
  : T extends 'UNITS'
  ? RentalUnit[]
  : LandlordSettings {
  if (type === 'BUILDINGS') {
    const defaultMoro = INITIAL_BUILDINGS[0];
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: BuildingConfig) => ({
            ...defaultMoro,
            ...b,
            exactAddress:
              b.exactAddress !== undefined
                ? b.exactAddress
                : b.id === MORO_BUILDING_ID
                ? defaultMoro.exactAddress
                : '',
            landmarkDescription:
              b.landmarkDescription !== undefined
                ? b.landmarkDescription
                : b.id === MORO_BUILDING_ID
                ? defaultMoro.landmarkDescription
                : '',
            googleMapsUrl:
              b.googleMapsUrl !== undefined
                ? b.googleMapsUrl
                : b.id === MORO_BUILDING_ID
                ? defaultMoro.googleMapsUrl
                : '',
          })) as never;
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_BUILDINGS as never;
  }

  if (type === 'UNITS') {
    const defaults = generateInitialUnits();
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const defaultMap = new Map(defaults.map((d) => [d.id, d]));
          return parsed.map((u: RentalUnit) =>
            mergeUnitState(u, defaultMap.get(u.id))
          ) as never;
        }
      } catch {
        // fallback
      }
    }
    return defaults as never;
  }

  // SETTINGS
  if (savedRaw) {
    try {
      const parsed = JSON.parse(savedRaw);
      return {
        ...INITIAL_LANDLORD_SETTINGS,
        ...parsed,
        waterFlatFee: parsed.waterFlatFee || DEFAULT_WATER_FLAT_FEE,
      } as never;
    } catch {
      // fallback
    }
  }
  return INITIAL_LANDLORD_SETTINGS as never;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [buildings, setBuildings] = useState<BuildingConfig[]>(() =>
    mergeState('BUILDINGS', localStorage.getItem(STORAGE_KEYS.BUILDINGS))
  );

  const [activeBuildingId, setActiveBuildingId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BLDG) || MORO_BUILDING_ID;
  });

  const [allUnits, setAllUnits] = useState<RentalUnit[]>(() =>
    mergeState('UNITS', localStorage.getItem(STORAGE_KEYS.UNITS))
  );

  const [allPayments, setAllPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_PAYMENTS;
  });

  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fallback
      }
    }
    return INITIAL_EXPENSES;
  });

  const [settings, setSettings] = useState<LandlordSettings>(() =>
    mergeState('SETTINGS', localStorage.getItem(STORAGE_KEYS.SETTINGS))
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BUILDINGS, JSON.stringify(buildings));
  }, [buildings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BLDG, activeBuildingId);
  }, [activeBuildingId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.UNITS, JSON.stringify(allUnits));
  }, [allUnits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(allPayments));
  }, [allPayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(allExpenses));
  }, [allExpenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const activeBuilding = useMemo(() => {
    return buildings.find((b) => b.id === activeBuildingId) || buildings[0] || INITIAL_BUILDINGS[0];
  }, [buildings, activeBuildingId]);

  const units = useMemo(() => {
    return allUnits.filter((u) => u.buildingId === activeBuilding.id);
  }, [allUnits, activeBuilding.id]);

  const payments = useMemo(() => {
    return allPayments.filter((p) => p.buildingId === activeBuilding.id);
  }, [allPayments, activeBuilding.id]);

  const expenses = useMemo(() => {
    return allExpenses.filter((e) => e.buildingId === activeBuilding.id);
  }, [allExpenses, activeBuilding.id]);

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  const createDefaultUtilities = (waterFee = DEFAULT_WATER_FLAT_FEE): UtilityMeterReading => ({
    waterMode: 'FLAT',
    waterFlatFee: waterFee,
    waterOldIndex: 0,
    waterNewIndex: 0,
    waterUnitPrice: settings.waterM3Price,
    waterAmountDue: waterFee,
    waterPaid: true,
    electricityMode: 'METER',
    electricityOldIndex: 0,
    electricityNewIndex: 0,
    electricityUnitPrice: settings.electricityKwhPrice,
    electricityAmountDue: 0,
    electricityAmountPaid: 0,
    electricityBalanceDue: 0,
    electricityCredit: 0,
    electricityPaid: true,
    lastReadingDate: new Date().toISOString().slice(0, 10),
  });

  const addBuilding = (
    name: string,
    city: string,
    neighborhood: string,
    roomCount: number,
    studioCount: number,
    apartmentCount = 0,
    shopCount = 0,
    warehouseCount = 0,
    exactAddress = '',
    landmarkDescription = '',
    googleMapsUrl = ''
  ) => {
    const newId = `bldg-${Date.now()}`;
    const newBuilding: BuildingConfig = {
      id: newId,
      name,
      city,
      neighborhood,
      exactAddress,
      landmarkDescription,
      googleMapsUrl,
      defaultRoomPrice: settings.defaultRoomPrice,
      defaultStudioPrice: settings.defaultStudioPrice,
      defaultApartmentPrice: DEFAULT_APARTMENT_PRICE,
      defaultShopPrice: DEFAULT_SHOP_PRICE,
      defaultWarehousePrice: DEFAULT_WAREHOUSE_PRICE,
      waterM3Price: settings.waterM3Price,
      waterFlatFee: DEFAULT_WATER_FLAT_FEE,
      electricityKwhPrice: settings.electricityKwhPrice,
      electricityFlatFee: settings.electricityFlatFee,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const generatedUnits: RentalUnit[] = [];

    // Studios
    for (let s = 1; s <= studioCount; s++) {
      const floor = Math.min(3, Math.ceil(s / 2));
      const numOnFloor = ((s - 1) % 2) + 1;
      const code = `ST${floor}${numOnFloor}`;
      generatedUnits.push({
        id: `${newId}-${code.toLowerCase()}-${s}`,
        buildingId: newId,
        code,
        type: 'STUDIO',
        floor,
        side: numOnFloor % 2 === 1 ? 'LEFT_ODD' : 'RIGHT_EVEN',
        corridorPosition: 1,
        monthlyRent: settings.defaultStudioPrice,
        status: 'VACANT',
        tenant: null,
        utilities: createDefaultUtilities(DEFAULT_WATER_FLAT_FEE),
      });
    }

    // Chambres
    for (let i = 1; i <= roomCount; i++) {
      const floor = Math.floor((i - 1) / 8);
      const numOnFloor = ((i - 1) % 8) + 1;
      const code = `CH${floor}${numOnFloor}`;
      generatedUnits.push({
        id: `${newId}-${code.toLowerCase()}-${i}`,
        buildingId: newId,
        code,
        type: 'ROOM',
        floor: Math.min(3, floor),
        side: numOnFloor % 2 === 1 ? 'LEFT_ODD' : 'RIGHT_EVEN',
        corridorPosition: Math.ceil(numOnFloor / 2) + (floor > 0 ? 1 : 0),
        monthlyRent: settings.defaultRoomPrice,
        status: 'VACANT',
        tenant: null,
        utilities: createDefaultUtilities(DEFAULT_WATER_FLAT_FEE),
      });
    }

    // Appartements (T2, T3, etc.)
    for (let a = 1; a <= apartmentCount; a++) {
      const floor = Math.min(3, Math.ceil(a / 2));
      const code = `APT0${a}`;
      generatedUnits.push({
        id: `${newId}-${code.toLowerCase()}-${a}`,
        buildingId: newId,
        code,
        type: 'APARTMENT',
        subTypeLabel: 'Appartement T3',
        floor,
        side: a % 2 === 1 ? 'LEFT_ODD' : 'RIGHT_EVEN',
        corridorPosition: 6 + Math.ceil(a / 2),
        monthlyRent: DEFAULT_APARTMENT_PRICE,
        status: 'VACANT',
        tenant: null,
        utilities: createDefaultUtilities(DEFAULT_WATER_FLAT_FEE),
      });
    }

    // Boutiques / Locaux Commerciaux
    for (let sh = 1; sh <= shopCount; sh++) {
      const code = `BTQ0${sh}`;
      generatedUnits.push({
        id: `${newId}-${code.toLowerCase()}-${sh}`,
        buildingId: newId,
        code,
        type: 'SHOP',
        subTypeLabel: 'Boutique Commerciale',
        locationLabel: 'Façade Rue (RDC)',
        floor: 0,
        side: sh % 2 === 1 ? 'LEFT_ODD' : 'RIGHT_EVEN',
        corridorPosition: 10 + Math.ceil(sh / 2),
        monthlyRent: DEFAULT_SHOP_PRICE,
        status: 'VACANT',
        tenant: null,
        utilities: createDefaultUtilities(DEFAULT_WATER_FLAT_FEE),
      });
    }

    // Magasins / Entrepôts
    for (let w = 1; w <= warehouseCount; w++) {
      const code = `MAG0${w}`;
      generatedUnits.push({
        id: `${newId}-${code.toLowerCase()}-${w}`,
        buildingId: newId,
        code,
        type: 'WAREHOUSE',
        subTypeLabel: 'Magasin / Entrepôt',
        locationLabel: 'Zone Commerciale RDC',
        floor: 0,
        side: w % 2 === 1 ? 'LEFT_ODD' : 'RIGHT_EVEN',
        corridorPosition: 15 + Math.ceil(w / 2),
        monthlyRent: DEFAULT_WAREHOUSE_PRICE,
        status: 'VACANT',
        tenant: null,
        utilities: createDefaultUtilities(0),
      });
    }

    setBuildings((prev) => [...prev, newBuilding]);
    setAllUnits((prev) => [...prev, ...generatedUnits]);
    setActiveBuildingId(newId);
  };

  /**
   * Met à jour les informations et l'emplacement d'un immeuble (Nom, Ville, Quartier, Adresse précise, Repère, Lien Google Maps)
   */
  const updateBuildingInfo = (buildingId: string, updates: Partial<BuildingConfig>) => {
    setBuildings((prev) =>
      prev.map((b) => (b.id === buildingId ? { ...b, ...updates } : b))
    );
  };

  /**
   * Supprime un immeuble et toutes ses unités associées
   */
  const deleteBuilding = (buildingId: string): boolean => {
    const remainingBuildings = buildings.filter((b) => b.id !== buildingId);
    if (remainingBuildings.length === 0) {
      // S'il ne reste plus aucun immeuble, on restaure la Résidence Moro par défaut pour éviter un écran vide
      setBuildings(INITIAL_BUILDINGS);
      setAllUnits(generateInitialUnits());
      setActiveBuildingId(MORO_BUILDING_ID);
      return true;
    }

    setBuildings(remainingBuildings);
    setAllUnits((prev) => prev.filter((u) => u.buildingId !== buildingId));
    if (activeBuildingId === buildingId) {
      setActiveBuildingId(remainingBuildings[0].id);
    }
    return true;
  };

  /**
   * Restaure la Résidence Moro par défaut (35 unités) en toute sécurité
   * tout en conservant les éventuels autres immeubles créés par le propriétaire
   */
  const restoreDefaultMoroBuilding = () => {
    const defaultMoro = INITIAL_BUILDINGS[0];
    const defaultMoroUnits = generateInitialUnits();

    setBuildings((prev) => {
      const others = prev.filter((b) => b.id !== MORO_BUILDING_ID);
      return [defaultMoro, ...others];
    });

    setAllUnits((prev) => {
      const otherUnits = prev.filter((u) => u.buildingId !== MORO_BUILDING_ID);
      return [...defaultMoroUnits, ...otherUnits];
    });

    setActiveBuildingId(MORO_BUILDING_ID);
  };

  /**
   * Ajoute un bien personnalisé (Chambre, Studio, Appartement T2/T3, Boutique, Magasin) à l'immeuble actif
   */
  const addCustomUnit = (input: AddCustomUnitInput): RentalUnit => {
    const sameFloorUnits = units.filter((u) => u.floor === input.floor);
    const maxPos = sameFloorUnits.reduce((m, u) => Math.max(m, u.corridorPosition), 0);
    const nextSide: CorridorSide =
      input.side || (sameFloorUnits.length % 2 === 0 ? 'LEFT_ODD' : 'RIGHT_EVEN');
    const nextPos = sameFloorUnits.length % 2 === 0 ? maxPos + 1 : Math.max(1, maxPos);

    const newUnit: RentalUnit = {
      id: `unit-custom-${Date.now()}`,
      buildingId: activeBuilding.id,
      code: input.code.trim().toUpperCase(),
      type: input.type,
      subTypeLabel: input.subTypeLabel?.trim() || undefined,
      locationLabel: input.locationLabel?.trim() || undefined,
      floor: input.floor,
      side: nextSide,
      corridorPosition: nextPos,
      monthlyRent: input.monthlyRent,
      status: 'VACANT',
      tenant: null,
      utilities: {
        ...createDefaultUtilities(input.waterFlatFee),
        electricityMode: input.electricityMode,
      },
    };

    setAllUnits((prev) => [...prev, newUnit]);
    return newUnit;
  };

  /**
   * Supprime une unité individuelle (chambre, studio, appartement, boutique, magasin)
   */
  const deleteUnit = (unitId: string) => {
    setAllUnits((prev) => prev.filter((u) => u.id !== unitId));
  };

  const updateSettings = (newSettings: LandlordSettings, applyPricesToUnits = false) => {
    setSettings(newSettings);
    if (applyPricesToUnits) {
      setAllUnits((prev) =>
        prev.map((u) => {
          if (u.buildingId !== activeBuilding.id) return u;
          const updatedRent =
            u.type === 'ROOM'
              ? newSettings.defaultRoomPrice
              : u.type === 'STUDIO'
              ? newSettings.defaultStudioPrice
              : u.monthlyRent;
          return {
            ...u,
            monthlyRent: updatedRent,
            utilities: {
              ...u.utilities,
              waterFlatFee: newSettings.waterFlatFee,
              waterAmountDue: newSettings.waterFlatFee,
              waterUnitPrice: newSettings.waterM3Price,
              electricityUnitPrice: newSettings.electricityKwhPrice,
            },
          };
        })
      );
    }
  };

  const updateUnitAndTenant = (
    unitId: string,
    updatedMonthlyRent: number,
    updatedStatus: UnitStatus,
    updatedTenant: TenantInfo | null
  ) => {
    setAllUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          monthlyRent: updatedMonthlyRent,
          status: updatedTenant ? updatedStatus : 'VACANT',
          tenant: updatedTenant,
        };
      })
    );
  };

  const vacateUnit = (unitId: string) => {
    setAllUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        return {
          ...u,
          status: 'VACANT',
          tenant: null,
        };
      })
    );
  };

  const updateUtilityReading = (unitId: string, utilities: UtilityMeterReading) => {
    setAllUnits((prev) =>
      prev.map((u) => {
        if (u.id !== unitId) return u;
        const elecBilled = Math.max(0, utilities.electricityAmountDue || 0);
        const elecPaidAmt = Math.max(0, utilities.electricityAmountPaid || 0);
        const elecRemaining = Math.max(0, elecBilled - elecPaidAmt);
        const elecCredit = Math.max(0, elecPaidAmt - elecBilled);
        const waterFee =
          typeof utilities.waterFlatFee === 'number'
            ? utilities.waterFlatFee
            : DEFAULT_WATER_FLAT_FEE;

        return {
          ...u,
          utilities: {
            ...utilities,
            waterMode: 'FLAT',
            waterFlatFee: waterFee,
            waterAmountDue: waterFee,
            electricityBalanceDue: elecRemaining,
            electricityCredit: elecCredit,
            electricityPaid: utilities.electricityPaid || elecRemaining === 0,
          },
        };
      })
    );
  };

  const recordPayment = (input: RecordPaymentInput): PaymentRecord | null => {
    const targetUnit = allUnits.find((u) => u.id === input.unitId);
    if (!targetUnit || !targetUnit.tenant) return null;

    const tenant = targetUnit.tenant;
    const sliding = calculateSlidingRentPayment(
      input.rentAmountPaid,
      targetUnit.monthlyRent,
      tenant.balanceDue,
      tenant.creditBalance || 0
    );

    const remainingBalance =
      input.customRemainingBalance !== undefined
        ? input.customRemainingBalance
        : sliding.newBalanceDue;

    const creditCarryOver =
      input.customCreditCarryOver !== undefined
        ? input.customCreditCarryOver
        : sliding.newCreditBalance;

    const effectiveMonths = sliding.monthsCovered || input.monthsCovered || 1;
    const newStatus: UnitStatus = remainingBalance > 0 ? 'PARTIAL' : 'PAID';

    const newValidUntil =
      remainingBalance === 0
        ? addMonthsToDate(tenant.rentValidUntil || '2026-10-26', effectiveMonths)
        : tenant.rentValidUntil;

    const totalPaid =
      input.rentAmountPaid +
      input.waterAmountPaid +
      input.electricityAmountPaid +
      input.depositAmountPaid;

    const receiptNumber = `QM-2026-${1000 + allPayments.length + 1}`;
    const paymentDate = '2026-10-26';

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      buildingId: targetUnit.buildingId,
      unitId: targetUnit.id,
      unitCode: targetUnit.code,
      unitType: targetUnit.type,
      tenantName: tenant.fullName,
      tenantPhone: tenant.phone,
      receiptNumber,
      paymentDate,
      periodLabel: input.periodLabel,
      monthsCovered: effectiveMonths,
      newValidUntil,
      rentAmountPaid: input.rentAmountPaid,
      waterAmountPaid: input.waterAmountPaid,
      electricityAmountPaid: input.electricityAmountPaid,
      depositAmountPaid: input.depositAmountPaid,
      totalPaid,
      remainingBalanceAfterPayment: remainingBalance,
      creditCarryOver,
      paymentMethod: input.paymentMethod,
      notes: input.notes || sliding.summaryText,
    };

    setAllPayments((prev) => [newPayment, ...prev]);

    setAllUnits((prev) =>
      prev.map((u) => {
        if (u.id !== targetUnit.id || !u.tenant) return u;
        const newElecPaidAmount =
          (u.utilities.electricityAmountPaid || 0) + input.electricityAmountPaid;
        const elecBilled = u.utilities.electricityAmountDue || 0;
        const newElecBalanceDue = Math.max(0, elecBilled - newElecPaidAmount);
        const newElecCredit = Math.max(0, newElecPaidAmount - elecBilled);

        return {
          ...u,
          status: newStatus,
          tenant: {
            ...u.tenant,
            monthsCovered: effectiveMonths,
            rentValidUntil: newValidUntil,
            amountPaidCurrentPeriod: u.tenant.amountPaidCurrentPeriod + input.rentAmountPaid,
            balanceDue: remainingBalance,
            creditBalance: creditCarryOver,
            depositPaid: u.tenant.depositPaid + input.depositAmountPaid,
            arrangementNotes: input.notes ? input.notes : sliding.summaryText,
          },
          utilities: {
            ...u.utilities,
            waterPaid: input.waterAmountPaid > 0 ? true : u.utilities.waterPaid,
            electricityAmountPaid: newElecPaidAmount,
            electricityBalanceDue: newElecBalanceDue,
            electricityCredit: newElecCredit,
            electricityPaid:
              newElecBalanceDue === 0
                ? true
                : input.electricityAmountPaid > 0
                ? newElecBalanceDue === 0
                : u.utilities.electricityPaid,
          },
        };
      })
    );

    return newPayment;
  };

  const refreshOverdueBalances = (): number => {
    let updatedCount = 0;
    const today = new Date('2026-10-26T12:00:00');

    setAllUnits((prev) =>
      prev.map((u) => {
        if (!u.tenant || u.status === 'VACANT') return u;
        const due = new Date(`${u.tenant.rentValidUntil}T12:00:00`);
        if (isNaN(due.getTime()) || due >= today) return u;

        if (u.tenant.balanceDue === 0) {
          updatedCount++;
          const credit = u.tenant.creditBalance || 0;
          const netDue = Math.max(0, u.monthlyRent - credit);
          const remainingCredit = Math.max(0, credit - u.monthlyRent);
          return {
            ...u,
            status: netDue > 0 ? (credit > 0 ? 'PARTIAL' : 'LATE') : 'PAID',
            tenant: {
              ...u.tenant,
              balanceDue: netDue,
              creditBalance: remainingCredit,
              amountPaidCurrentPeriod: credit > 0 ? credit : 0,
            },
          };
        }
        return u;
      })
    );

    return updatedCount;
  };

  const addExpense = (expenseInput: Omit<ExpenseRecord, 'id' | 'buildingId'>) => {
    const newExp: ExpenseRecord = {
      ...expenseInput,
      id: `exp-${Date.now()}`,
      buildingId: activeBuilding.id,
    };
    setAllExpenses((prev) => [newExp, ...prev]);
  };

  const updateExpense = (updated: ExpenseRecord) => {
    setAllExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const deleteExpense = (id: string) => {
    setAllExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const resetDemoData = () => {
    setBuildings(INITIAL_BUILDINGS);
    setActiveBuildingId(MORO_BUILDING_ID);
    setAllUnits(generateInitialUnits());
    setAllPayments(INITIAL_PAYMENTS);
    setAllExpenses(INITIAL_EXPENSES);
    setSettings(INITIAL_LANDLORD_SETTINGS);
  };

  const annualFinancials: MonthlyFinancialPoint[] = useMemo(() => {
    const extraPaymentsRent = payments
      .filter((p) => !INITIAL_PAYMENTS.some((ip) => ip.id === p.id))
      .reduce((acc, p) => acc + p.rentAmountPaid, 0);

    const extraPaymentsUtil = payments
      .filter((p) => !INITIAL_PAYMENTS.some((ip) => ip.id === p.id))
      .reduce(
        (acc, p) => acc + p.waterAmountPaid + p.electricityAmountPaid + p.depositAmountPaid,
        0
      );

    const actualExpensesOct = expenses.reduce(
      (acc, e) => acc + (e.status === 'PAID' ? e.actualCost : e.estimatedCost),
      0
    );

    return BASE_ANNUAL_HISTORY.map((m) => {
      if (m.monthIndex === 9) {
        const incomeRent = m.incomeRent + extraPaymentsRent;
        const incomeUtilitiesAndDeposits = m.incomeUtilitiesAndDeposits + extraPaymentsUtil;
        const totalIncome = incomeRent + incomeUtilitiesAndDeposits;
        const expensesAndWorks = actualExpensesOct;
        return {
          ...m,
          incomeRent,
          incomeUtilitiesAndDeposits,
          totalIncome,
          expensesAndWorks,
          netProfit: totalIncome - expensesAndWorks,
        };
      }
      return {
        ...m,
        netProfit: m.totalIncome - m.expensesAndWorks,
      };
    });
  }, [payments, expenses]);

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        buildings,
        activeBuildingId,
        activeBuilding,
        setActiveBuildingId,
        addBuilding,
        updateBuildingInfo,
        deleteBuilding,
        restoreDefaultMoroBuilding,
        addCustomUnit,
        deleteUnit,
        units,
        allUnits,
        payments,
        expenses,
        settings,
        updateSettings,
        updateUnitAndTenant,
        vacateUnit,
        updateUtilityReading,
        recordPayment,
        refreshOverdueBalances,
        addExpense,
        updateExpense,
        deleteExpense,
        resetDemoData,
        annualFinancials,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
