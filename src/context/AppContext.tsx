import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
  ExpenseRecord,
  LandlordSettings,
  MonthlyFinancialPoint,
  PaymentMethod,
  PaymentRecord,
  RentalUnit,
  TenantInfo,
  UnitStatus,
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
    studioCount: number
  ) => void;
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

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH);
    return saved !== null ? JSON.parse(saved) : false; // Sécurisé par défaut avec le mot de passe maître "Joël Brian"
  });

  const [buildings, setBuildings] = useState<BuildingConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BUILDINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_BUILDINGS;
  });

  const [activeBuildingId, setActiveBuildingId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BLDG) || MORO_BUILDING_ID;
  });

  const [allUnits, setAllUnits] = useState<RentalUnit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.UNITS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 35) return parsed;
      } catch {
        // fallback
      }
    }
    return generateInitialUnits();
  });

  const [allPayments, setAllPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (saved) {
      try {
        return JSON.parse(saved);
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
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_EXPENSES;
  });

  const [settings, setSettings] = useState<LandlordSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_LANDLORD_SETTINGS;
  });

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
    return buildings.find((b) => b.id === activeBuildingId) || buildings[0];
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

  const addBuilding = (
    name: string,
    city: string,
    neighborhood: string,
    roomCount: number,
    studioCount: number
  ) => {
    const newId = `bldg-${Date.now()}`;
    const newBuilding: BuildingConfig = {
      id: newId,
      name,
      city,
      neighborhood,
      defaultRoomPrice: settings.defaultRoomPrice,
      defaultStudioPrice: settings.defaultStudioPrice,
      waterM3Price: settings.waterM3Price,
      waterFlatFee: settings.waterFlatFee,
      electricityKwhPrice: settings.electricityKwhPrice,
      electricityFlatFee: settings.electricityFlatFee,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const generatedUnits: RentalUnit[] = [];
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
        utilities: {
          waterMode: 'METER',
          waterOldIndex: 0,
          waterNewIndex: 0,
          waterUnitPrice: settings.waterM3Price,
          waterAmountDue: 0,
          waterPaid: true,
          electricityMode: 'METER',
          electricityOldIndex: 0,
          electricityNewIndex: 0,
          electricityUnitPrice: settings.electricityKwhPrice,
          electricityAmountDue: 0,
          electricityPaid: true,
          lastReadingDate: new Date().toISOString().slice(0, 10),
        },
      });
    }

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
        utilities: {
          waterMode: 'METER',
          waterOldIndex: 0,
          waterNewIndex: 0,
          waterUnitPrice: settings.waterM3Price,
          waterAmountDue: 0,
          waterPaid: true,
          electricityMode: 'METER',
          electricityOldIndex: 0,
          electricityNewIndex: 0,
          electricityUnitPrice: settings.electricityKwhPrice,
          electricityAmountDue: 0,
          electricityPaid: true,
          lastReadingDate: new Date().toISOString().slice(0, 10),
        },
      });
    }

    setBuildings((prev) => [...prev, newBuilding]);
    setAllUnits((prev) => [...prev, ...generatedUnits]);
    setActiveBuildingId(newId);
  };

  const updateSettings = (newSettings: LandlordSettings, applyPricesToUnits = false) => {
    setSettings(newSettings);
    if (applyPricesToUnits) {
      setAllUnits((prev) =>
        prev.map((u) => {
          if (u.buildingId !== activeBuilding.id) return u;
          const updatedRent =
            u.type === 'ROOM' ? newSettings.defaultRoomPrice : newSettings.defaultStudioPrice;
          return {
            ...u,
            monthlyRent: updatedRent,
            utilities: {
              ...u.utilities,
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
        return {
          ...u,
          utilities,
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
            electricityPaid: input.electricityAmountPaid > 0 ? true : u.utilities.electricityPaid,
          },
        };
      })
    );

    return newPayment;
  };

  /**
   * Actualisation automatique des soldes glissants pour les locataires dont l'échéance est dépassée :
   * Le loyer échu s'ajoute automatiquement au total en déduisant d'abord le crédit d'avance éventuel.
   */
  const refreshOverdueBalances = (): number => {
    let updatedCount = 0;
    const today = new Date('2026-10-26T12:00:00');

    setAllUnits((prev) =>
      prev.map((u) => {
        if (!u.tenant || u.status === 'VACANT') return u;
        const due = new Date(`${u.tenant.rentValidUntil}T12:00:00`);
        if (isNaN(due.getTime()) || due >= today) return u;

        // Si l'échéance est dépassée et que le solde n'a pas encore intégré le mois échu
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
