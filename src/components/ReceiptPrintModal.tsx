import React from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle2, MessageCircle, Printer, X } from 'lucide-react';
import { BRAND_CONFIG } from '@config/constants';
import { useApp } from '../context/AppContext';
import { PaymentRecord } from '../types';
import {
  buildReceiptWhatsAppUrl,
  formatDateFR,
  formatFCFA,
  getPaymentMethodLabel,
} from '../utils/formatters';

interface ReceiptPrintModalProps {
  payment: PaymentRecord | null;
  onClose: () => void;
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({ payment, onClose }) => {
  const { settings, activeBuilding } = useApp();

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const creditCarryOver = payment.creditCarryOver || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8 print:shadow-none print:border-none print:max-w-full print:m-0"
      >
        {/* Barre d'actions supérieure (Masquée à l'impression) */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-[#10B981]" />
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">
                Quittance de Loyer Officielle — {payment.receiptNumber}
              </h3>
              <p className="text-xs text-slate-300">
                Prête pour impression directe ou sauvegarde PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={buildReceiptWhatsAppUrl(payment, settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Envoyer sur WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps de la Quittance Imprimable */}
        <div id="printable-receipt" className="p-8 sm:p-10 text-[#0F172A] bg-white">
          {/* En-tête Officiel : Conrad Solutions - Résidence Moro */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-[#0F172A]">
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A] uppercase">
                  {BRAND_CONFIG.companyName} — {activeBuilding.name}
                </h1>
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#2563EB] mt-0.5">
                  Reçu Officiel de Paiement & Compte Courant Locatif
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {activeBuilding.neighborhood} — {activeBuilding.city}
                </p>
                <p className="text-xs text-slate-600">
                  Direction / Bailleur : <strong>{settings.ownerName}</strong> ({settings.phone})
                </p>
              </div>
            </div>

            <div className="sm:text-right bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                QUITTANCE DE LOYER
              </div>
              <div className="text-lg font-extrabold text-[#1E3A8A] mt-0.5">
                N° {payment.receiptNumber}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                Date : <strong>{formatDateFR(payment.paymentDate)}</strong>
              </div>
            </div>
          </div>

          {/* Informations Locataire & Logement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Logement Concerné
              </div>
              <div className="text-lg font-extrabold text-[#0F172A]">
                Porte {payment.unitCode} ({payment.unitType === 'STUDIO' ? 'Studio' : 'Chambre'})
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                Immeuble : {activeBuilding.name}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Reçu de (Locataire)
              </div>
              <div className="text-lg font-extrabold text-[#0F172A]">{payment.tenantName}</div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                Tél : {payment.tenantPhone}
              </div>
            </div>
          </div>

          {/* Tableau Détaillé des Sommes Perçues */}
          <div className="rounded-2xl border border-slate-300 overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0F172A] text-white text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-extrabold">Désignation</th>
                  <th className="py-3.5 px-4 font-extrabold">Détail / Période</th>
                  <th className="py-3.5 px-4 font-extrabold text-right">Montant Versé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                <tr>
                  <td className="py-3.5 px-4 font-bold text-[#0F172A]">Loyer Locatif</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {payment.periodLabel} ({payment.monthsCovered} mois couvert(s))
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-right text-[#0F172A]">
                    {formatFCFA(payment.rentAmountPaid)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold text-[#0F172A]">Eau (Forage Résidence)</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {payment.waterAmountPaid > 0
                      ? 'Consommation sous-compteur / forfait eau'
                      : 'Non facturé sur ce reçu'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-right text-slate-800">
                    {formatFCFA(payment.waterAmountPaid)}
                  </td>
                </tr>

                <tr>
                  <td className="py-3.5 px-4 font-bold text-[#0F172A]">Électricité (ENEO)</td>
                  <td className="py-3.5 px-4 text-slate-700">
                    {payment.electricityAmountPaid > 0
                      ? 'Consommation index sous-compteur ENEO'
                      : 'Non facturé sur ce reçu'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-right text-slate-800">
                    {formatFCFA(payment.electricityAmountPaid)}
                  </td>
                </tr>

                {payment.depositAmountPaid > 0 && (
                  <tr>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">Caution Locative</td>
                    <td className="py-3.5 px-4 text-slate-700">Versement / Complément caution</td>
                    <td className="py-3.5 px-4 font-bold text-right text-slate-800">
                      {formatFCFA(payment.depositAmountPaid)}
                    </td>
                  </tr>
                )}

                <tr className="bg-blue-50/80">
                  <td colSpan={2} className="py-4 px-4 font-extrabold text-base text-[#1E3A8A]">
                    TOTAL ENCAISSÉ ({getPaymentMethodLabel(payment.paymentMethod)})
                  </td>
                  <td className="py-4 px-4 font-extrabold text-lg text-right text-[#1E3A8A]">
                    {formatFCFA(payment.totalPaid)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bilan de Situation après Paiement : Reste à payer, Crédit d'avance & Validité */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div
              className={`p-4 rounded-2xl border ${
                payment.remainingBalanceAfterPayment > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div className="text-xs font-extrabold uppercase tracking-wider opacity-80">
                Reste à payer
              </div>
              <div className="text-lg font-extrabold mt-0.5">
                {formatFCFA(payment.remainingBalanceAfterPayment)}
              </div>
              <div className="text-xs font-semibold mt-1">
                {payment.remainingBalanceAfterPayment > 0
                  ? 'Paiement partiel en cours'
                  : 'Aucun reste à payer'}
              </div>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                creditCarryOver > 0
                  ? 'bg-emerald-50 border-emerald-400 text-[#065F46]'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="text-xs font-extrabold uppercase tracking-wider opacity-80">
                Crédit d’avance reporté
              </div>
              <div className="text-lg font-extrabold mt-0.5">
                +{formatFCFA(creditCarryOver)}
              </div>
              <div className="text-xs font-semibold mt-1">
                {creditCarryOver > 0
                  ? 'À déduire sur le mois suivant'
                  : 'Compte courant à l’équilibre'}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Nouvelle Fin de Validité
              </div>
              <div className="text-lg font-extrabold text-[#0F172A] mt-0.5">
                {formatDateFR(payment.newValidUntil)}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                {payment.monthsCovered} mois couvert(s)
              </div>
            </div>
          </div>

          {payment.notes && (
            <div className="mb-8 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700">
              <strong>Note / Détail Compte Courant :</strong> {payment.notes}
            </div>
          )}

          {/* Zone Cachet & Signature */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Cette quittance atteste uniquement de la réception des sommes mentionnées ci-dessus et
              ne vaut pas renonciation aux arriérés antérieurs éventuels.
              <br />
              <strong className="text-slate-700">
                Document officiel édité par {BRAND_CONFIG.companyName} — {activeBuilding.name}.
              </strong>
            </div>

            <div className="sm:text-right">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">
                Pour acquit, Le Bailleur ({settings.ownerName})
              </div>
              <div className="inline-block px-6 py-3 rounded-xl border-2 border-[#1E3A8A]/40 bg-blue-50/30 text-[#1E3A8A] font-extrabold text-sm italic">
                Cachet Numérique Certifié — {activeBuilding.name}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
