export type UnitType = 'ROOM' | 'STUDIO' | 'APARTMENT' | 'SHOP' | 'WAREHOUSE';

export type UnitStatus = 'PAID' | 'PARTIAL' | 'LATE' | 'VACANT';

export type CorridorSide = 'LEFT_ODD' | 'RIGHT_EVEN';

export type TenantProfileType = 'STUDENT' | 'EMPLOYEE' | 'SELF_EMPLOYED';

export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MTN_MOMO' | 'BANK_TRANSFER';

export type ExpenseStatus = 'TODO' | 'IN_PROGRESS' | 'PAID';

export type ExpenseCategory =
  | 'BOREHOLE'
  | 'PLUMBING'
  | 'PAINTING'
  | 'ELECTRICITY'
  | 'STAFF'
  | 'OTHER';

export interface GuarantorInfo {
  noGuarantorRequired: boolean;
  fullName: string;
  relationship: string;
  phone: string;
  cityAndProfession: string;
}

export interface UtilityMeterReading {
  // EAU (FORAGE) — Forfait mensuel fixe paramétrable par logement (par défaut 2 000 FCFA ou 1 500 FCFA)
  waterMode: 'METER' | 'FLAT';
  waterFlatFee: number; // ex: 2000 FCFA ou 1500 FCFA (ou 0 si exonéré)
  waterOldIndex: number;
  waterNewIndex: number;
  waterUnitPrice: number;
  waterAmountDue: number; // Égal au forfait mensuel waterFlatFee
  waterPaid: boolean;

  // ÉLECTRICITÉ (ENEO) — Mini-compte courant avec avances & paiements partiels
  electricityMode: 'METER' | 'FLAT';
  electricityOldIndex: number;
  electricityNewIndex: number;
  electricityUnitPrice: number;
  electricityAmountDue: number; // Montant Facturé ENEO sur la période
  electricityAmountPaid: number; // Montant Versé (Avance / Acompte Électricité)
  electricityBalanceDue: number; // Reste à payer Électricité = max(0, Facturé - Versé)
  electricityCredit: number; // Crédit d'avance Électricité reporté = max(0, Versé - Facturé)
  electricityPaid: boolean;
  lastReadingDate: string;
}

export interface TenantInfo {
  id: string;
  fullName: string;
  phone: string;
  cniNumber: string;
  profileType: TenantProfileType;
  moveInDate: string;
  rentValidUntil: string;
  monthsCovered: number;
  depositRequired: number;
  depositPaid: number;
  advanceMonthsAtEntry: number;
  amountPaidCurrentPeriod: number;
  balanceDue: number; // Reste à payer Loyer si paiement partiel ou retard
  creditBalance?: number; // Crédit d'avance positif Loyer reporté sur le mois suivant
  arrangementNotes: string;
  guarantor: GuarantorInfo;
}

export interface RentalUnit {
  id: string;
  buildingId: string;
  code: string;
  type: UnitType;
  subTypeLabel?: string; // ex: "Appartement T3", "Boutique Façade", "Magasin Stockage"
  locationLabel?: string; // ex: "Annexe Commerciale", "Rez-de-chaussée Rue"
  floor: number;
  side: CorridorSide;
  corridorPosition: number;
  monthlyRent: number;
  status: UnitStatus;
  tenant: TenantInfo | null;
  utilities: UtilityMeterReading;
}

export type TenantDocumentType = 'CNI' | 'LEASE_CONTRACT' | 'OTHER';

export interface TenantDocumentRecord {
  id: string;
  unitId: string;
  unitCode: string;
  tenantName: string;
  docType: TenantDocumentType;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  dataUrl: string; // Base64 Data URL stocké dans IndexedDB sur la machine du propriétaire
}

export interface PaymentRecord {
  id: string;
  buildingId: string;
  unitId: string;
  unitCode: string;
  unitType: UnitType;
  tenantName: string;
  tenantPhone: string;
  receiptNumber: string;
  paymentDate: string;
  periodLabel: string;
  monthsCovered: number;
  newValidUntil: string;
  rentAmountPaid: number;
  waterAmountPaid: number;
  electricityAmountPaid: number;
  depositAmountPaid: number;
  totalPaid: number;
  remainingBalanceAfterPayment: number;
  creditCarryOver?: number; // Crédit d'avance positif reporté sur le mois suivant
  paymentMethod: PaymentMethod;
  notes: string;
}

export interface ExpenseRecord {
  id: string;
  buildingId: string;
  unitCode: string;
  title: string;
  category: ExpenseCategory;
  status: ExpenseStatus;
  estimatedCost: number;
  actualCost: number;
  date: string;
  notes: string;
}

export interface MonthlyFinancialPoint {
  monthIndex: number; // 0 = Jan .. 11 = Dec
  monthShort: string;
  monthFull: string;
  incomeRent: number;
  incomeUtilitiesAndDeposits: number;
  totalIncome: number;
  expensesAndWorks: number;
  netProfit: number;
}

export interface BuildingConfig {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  defaultRoomPrice: number;
  defaultStudioPrice: number;
  defaultApartmentPrice?: number;
  defaultShopPrice?: number;
  defaultWarehousePrice?: number;
  waterM3Price: number;
  waterFlatFee: number;
  electricityKwhPrice: number;
  electricityFlatFee: number;
  createdAt: string;
}

export interface LandlordSettings {
  ownerName: string;
  email: string;
  phone: string;
  whatsappPhone: string;
  orangeMoneyNumber: string;
  mtnMomoNumber: string;
  alertDaysBeforeDue: number;
  defaultRoomPrice: number;
  defaultStudioPrice: number;
  waterM3Price: number;
  waterFlatFee: number;
  electricityKwhPrice: number;
  electricityFlatFee: number;
}
