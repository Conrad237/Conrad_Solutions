import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  FileText,
  MessageCircle,
  Printer,
  Search,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentRecord, RentalUnit, UnitStatus } from '../types';
import {
  buildGuarantorWhatsAppUrl,
  buildReceiptWhatsAppUrl,
  buildTenantWhatsAppUrl,
  formatDateFR,
  formatFCFA,
  getPaymentMethodLabel,
  getStatusConfig,
} from '../utils/formatters';

interface TenantsAndPaymentsViewProps {
  onSelectUnit: (unit: RentalUnit, initialModalTab?: 'INFO' | 'PAYMENT' | 'UTILITIES') => void;
  onOpenReceipt: (payment: PaymentRecord) => void;
}

export const TenantsAndPaymentsView: React.FC<TenantsAndPaymentsViewProps> = ({
  onSelectUnit,
  onOpenReceipt,
}) => {
  const { units, payments, settings } = useApp();
  const [section, setSection] = useState<'TENANTS' | 'RECEIPTS'>('TENANTS');
  const [statusFilter, setStatusFilter] = useState<UnitStatus | 'ALL' | 'DEPOSIT_INCOMPLETE'>('ALL');
  const [search, setSearch] = useState('');

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (statusFilter === 'DEPOSIT_INCOMPLETE') {
        if (!u.tenant) return false;
        if (u.tenant.depositPaid >= u.tenant.depositRequired) return false;
      } else if (statusFilter !== 'ALL' && u.status !== statusFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = u.code.toLowerCase().includes(q);
        const matchName = u.tenant?.fullName.toLowerCase().includes(q);
        const matchPhone = u.tenant?.phone.toLowerCase().includes(q);
        const matchGuarantor = u.tenant?.guarantor.fullName.toLowerCase().includes(q);
        return matchCode || matchName || matchPhone || matchGuarantor;
      }
      return true;
    });
  }, [units, statusFilter, search]);

  const filteredReceipts = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.unitCode.toLowerCase().includes(q) ||
        p.tenantName.toLowerCase().includes(q) ||
        p.receiptNumber.toLowerCase().includes(q)
    );
  }, [payments, search]);

  return (
    <div className="space-y-6">
      {/* Barre supérieure de bascule : Répertoire Locataires vs Registre des Quittances */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSection('TENANTS')}
            className={`px-5 py-3 rounded-xl font-extrabold text-sm sm:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
              section === 'TENANTS'
                ? 'bg-[#0F172A] text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-5 h-5 text-blue-400" />
            <span>Répertoire des Locataires & Garants ({units.filter((u) => u.tenant).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSection('RECEIPTS')}
            className={`px-5 py-3 rounded-xl font-extrabold text-sm sm:text-base flex items-center gap-2.5 transition-all cursor-pointer ${
              section === 'RECEIPTS'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Registre des Quittances & Reçus ({payments.length})</span>
          </button>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher porte, locataire, parent, N° reçu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
          />
        </div>
      </div>

      {section === 'TENANTS' ? (
        <>
          {/* Filtres Rapides */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: `Toutes les portes (${units.length})` },
              {
                id: 'LATE',
                label: `🔴 En Retard (${units.filter((u) => u.status === 'LATE').length})`,
              },
              {
                id: 'PARTIAL',
                label: `🟠 Arrangement / Partiel (${units.filter((u) => u.status === 'PARTIAL').length})`,
              },
              {
                id: 'PAID',
                label: `🟢 À Jour (${units.filter((u) => u.status === 'PAID').length})`,
              },
              {
                id: 'DEPOSIT_INCOMPLETE',
                label: `⚠️ Caution à compléter (${
                  units.filter((u) => u.tenant && u.tenant.depositPaid < u.tenant.depositRequired)
                    .length
                })`,
              },
              {
                id: 'VACANT',
                label: `⚪ Logements Vacants (${units.filter((u) => u.status === 'VACANT').length})`,
              },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as typeof statusFilter)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tableau Senior-Friendly des Portes, Locataires, Garants et Actions WhatsApp */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0F172A] text-white text-xs uppercase tracking-wider">
                    <th className="py-4 px-4 font-extrabold">Porte & Étage</th>
                    <th className="py-4 px-4 font-extrabold">Locataire & Profil</th>
                    <th className="py-4 px-4 font-extrabold">Garant / Parent</th>
                    <th className="py-4 px-4 font-extrabold">Situation Loyer & Caution</th>
                    <th className="py-4 px-4 font-extrabold">Statut</th>
                    <th className="py-4 px-4 font-extrabold text-right">
                      Actions Rapides & Relances WhatsApp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {filteredUnits.map((u) => {
                    const statusCfg = getStatusConfig(u.status);
                    const depositDiff = u.tenant
                      ? Math.max(0, u.tenant.depositRequired - u.tenant.depositPaid)
                      : 0;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/90 transition-colors">
                        <td className="py-4 px-4 align-top">
                          <button
                            type="button"
                            onClick={() => onSelectUnit(u, 'INFO')}
                            className="font-extrabold text-base text-[#0F172A] hover:text-[#2563EB] flex items-center gap-2 cursor-pointer"
                          >
                            <span className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-xs font-extrabold">
                              {u.code}
                            </span>
                            <span>{u.type === 'STUDIO' ? 'Studio' : 'Chambre'}</span>
                          </button>
                          <div className="text-xs text-slate-500 font-medium mt-1">
                            {u.floor === 0 ? 'RDC' : `Étage ${u.floor}`} •{' '}
                            {u.side === 'LEFT_ODD' ? 'Gauche (Impair)' : 'Droite (Pair)'}
                          </div>
                        </td>

                        <td className="py-4 px-4 align-top">
                          {u.tenant ? (
                            <div>
                              <div className="font-extrabold text-[#0F172A] text-base">
                                {u.tenant.fullName}
                              </div>
                              <div className="text-xs text-slate-600 font-semibold mt-0.5">
                                {u.tenant.phone} •{' '}
                                {u.tenant.profileType === 'STUDENT'
                                  ? 'Étudiant(e)'
                                  : u.tenant.profileType === 'EMPLOYEE'
                                  ? 'Salarié(e)'
                                  : 'Indépendant'}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                Valide jusqu’au :{' '}
                                <strong className="text-slate-700">
                                  {formatDateFR(u.tenant.rentValidUntil)}
                                </strong>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 italic">
                              Logement inoccupé
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 align-top">
                          {u.tenant ? (
                            u.tenant.guarantor.noGuarantorRequired ? (
                              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
                                Aucun garant requis
                              </span>
                            ) : (
                              <div>
                                <div className="font-bold text-slate-800">
                                  {u.tenant.guarantor.fullName} ({u.tenant.guarantor.relationship})
                                </div>
                                <div className="text-xs font-semibold text-[#1E3A8A] mt-0.5">
                                  {u.tenant.guarantor.phone}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  {u.tenant.guarantor.cityAndProfession}
                                </div>
                              </div>
                            )
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-4 px-4 align-top">
                          <div className="font-extrabold text-[#0F172A]">
                            Loyer : {formatFCFA(u.monthlyRent)} / mois
                          </div>
                          {u.tenant && (
                            <>
                              {u.tenant.balanceDue > 0 ? (
                                <div className="text-xs font-extrabold text-[#EF4444] mt-0.5">
                                  Reste à payer : {formatFCFA(u.tenant.balanceDue)}
                                </div>
                              ) : (u.tenant.creditBalance || 0) > 0 ? (
                                <div className="text-xs font-extrabold text-[#065F46] mt-0.5">
                                  Crédit d’avance : +{formatFCFA(u.tenant.creditBalance || 0)}
                                </div>
                              ) : (
                                <div className="text-xs font-bold text-[#065F46] mt-0.5">
                                  Solde loyer : 0 FCFA
                                </div>
                              )}
                              <div className="text-xs text-slate-600 mt-0.5">
                                Caution : {formatFCFA(u.tenant.depositPaid)} /{' '}
                                {formatFCFA(u.tenant.depositRequired)}
                                {depositDiff > 0 && (
                                  <span className="text-amber-700 font-bold ml-1">
                                    (-{formatFCFA(depositDiff)})
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </td>

                        <td className="py-4 px-4 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${statusCfg.bgBadge}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                            <span>{statusCfg.label}</span>
                          </span>
                        </td>

                        <td className="py-4 px-4 align-top text-right">
                          {u.tenant ? (
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectUnit(u, 'PAYMENT')}
                                className="px-3 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Encaisser</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => onSelectUnit(u, 'INFO')}
                                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Fiche</span>
                              </button>

                              <a
                                href={buildTenantWhatsAppUrl(u, settings)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WA Locataire</span>
                              </a>

                              {!u.tenant.guarantor.noGuarantorRequired &&
                                u.tenant.guarantor.phone && (
                                  <a
                                    href={buildGuarantorWhatsAppUrl(u, settings)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 rounded-xl bg-[#1E3A8A] hover:bg-[#2563EB] text-white font-bold text-xs flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WA Garant</span>
                                  </a>
                                )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectUnit(u, 'INFO')}
                              className="px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#2563EB] text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Installer un Locataire</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* REGISTRE DES QUITTANCES & REÇUS */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Historique Général des Paiements & Quittances
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Cliquez sur « Imprimer / PDF » pour générer la quittance officielle ou envoyez-la
                sur WhatsApp en 1 clic.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0F172A] text-white text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-extrabold">N° Quittance</th>
                  <th className="py-3.5 px-4 font-extrabold">Date</th>
                  <th className="py-3.5 px-4 font-extrabold">Porte & Locataire</th>
                  <th className="py-3.5 px-4 font-extrabold">Détail (Loyer / Eau / ENEO)</th>
                  <th className="py-3.5 px-4 font-extrabold">Total Reçu & Mode</th>
                  <th className="py-3.5 px-4 font-extrabold">Reste à Payer</th>
                  <th className="py-3.5 px-4 font-extrabold text-right">Quittance & WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredReceipts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-4 px-4 font-extrabold text-[#1E3A8A]">{p.receiptNumber}</td>
                    <td className="py-4 px-4 text-slate-600 font-semibold">
                      {formatDateFR(p.paymentDate)}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#0F172A] text-white font-extrabold text-xs mr-2">
                        {p.unitCode}
                      </span>
                      <strong className="text-[#0F172A]">{p.tenantName}</strong>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-700">
                      <div className="font-bold text-slate-900">{p.periodLabel}</div>
                      <div>
                        Loyer : {formatFCFA(p.rentAmountPaid)}
                        {p.waterAmountPaid > 0 && ` • Eau : ${formatFCFA(p.waterAmountPaid)}`}
                        {p.electricityAmountPaid > 0 &&
                          ` • ENEO : ${formatFCFA(p.electricityAmountPaid)}`}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-extrabold text-[#065F46]">
                        {formatFCFA(p.totalPaid)}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {getPaymentMethodLabel(p.paymentMethod)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {p.remainingBalanceAfterPayment > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-xs">
                          Reste : {formatFCFA(p.remainingBalanceAfterPayment)}
                        </span>
                      ) : (p.creditCarryOver || 0) > 0 ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#065F46] font-extrabold text-xs">
                          Crédit reporté : +{formatFCFA(p.creditCarryOver || 0)}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs">
                          0 FCFA (Soldé)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(p)}
                          className="px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-[#2563EB] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimer / PDF</span>
                        </button>
                        <a
                          href={buildReceiptWhatsAppUrl(p, settings)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Envoyer Reçu WA</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
};
