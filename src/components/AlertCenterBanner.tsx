import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Copy,
  Mail,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { RentalUnit } from '../types';
import {
  buildGuarantorWhatsAppUrl,
  buildTenantWhatsAppUrl,
  formatDateFR,
  formatFCFA,
  getDaysUntilDue,
} from '../utils/formatters';

interface AlertCenterBannerProps {
  onSelectUnit: (unit: RentalUnit) => void;
}

export const AlertCenterBanner: React.FC<AlertCenterBannerProps> = ({ onSelectUnit }) => {
  const { units, settings, activeBuilding } = useApp();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState(settings.email);
  const [emailSentToast, setEmailSentToast] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const lateUnits = useMemo(() => units.filter((u) => u.status === 'LATE'), [units]);
  const partialUnits = useMemo(() => units.filter((u) => u.status === 'PARTIAL'), [units]);
  const dueSoonUnits = useMemo(
    () =>
      units.filter((u) => {
        if (u.status !== 'PAID' || !u.tenant) return false;
        const days = getDaysUntilDue(u.tenant.rentValidUntil);
        return days >= 0 && days <= settings.alertDaysBeforeDue;
      }),
    [units, settings.alertDaysBeforeDue]
  );

  const totalLateAndPartialAmount = useMemo(() => {
    const lateSum = lateUnits.reduce(
      (acc, u) => acc + (u.tenant?.balanceDue || u.monthlyRent),
      0
    );
    const partialSum = partialUnits.reduce((acc, u) => acc + (u.tenant?.balanceDue || 0), 0);
    return lateSum + partialSum;
  }, [lateUnits, partialUnits]);

  const emailSubject = `[Conrad Solution] Récapitulatif Loyers & Alertes — ${activeBuilding.name} (${formatDateFR('2026-10-26')})`;

  const emailBodyText = useMemo(() => {
    const lines: string[] = [
      `Bonjour ${settings.ownerName},`,
      ``,
      `Voici le récapitulatif automatique des alertes locatives pour votre immeuble "${activeBuilding.name}" :`,
      `====================================================================`,
      `• MONTANT TOTAL À RECOUVRER (Retards + Soldes partiels) : ${formatFCFA(totalLateAndPartialAmount)}`,
      `• Locataires en retard (Impayés) : ${lateUnits.length}`,
      `• Locataires en arrangement (Paiement partiel) : ${partialUnits.length}`,
      `• Échéances proches (moins de ${settings.alertDaysBeforeDue} jours) : ${dueSoonUnits.length}`,
      `====================================================================`,
      ``,
      `1. LOCATAIRES EN RETARD DE PAIement (${lateUnits.length}) :`,
    ];

    if (lateUnits.length === 0) {
      lines.push(`   Aucun locataire en retard.`);
    } else {
      lateUnits.forEach((u) => {
        const t = u.tenant!;
        lines.push(
          `   - Porte ${u.code} : ${t.fullName} (${t.phone}) | Dû : ${formatFCFA(t.balanceDue || u.monthlyRent)} | Échéance : ${formatDateFR(t.rentValidUntil)} | Garant : ${t.guarantor.noGuarantorRequired ? 'Aucun' : `${t.guarantor.fullName} (${t.guarantor.phone})`}`
        );
      });
    }

    lines.push(``, `2. PAIEMENTS PARTIELS / ARRANGEMENTS EN COURS (${partialUnits.length}) :`);
    if (partialUnits.length === 0) {
      lines.push(`   Aucun paiement partiel en attente.`);
    } else {
      partialUnits.forEach((u) => {
        const t = u.tenant!;
        lines.push(
          `   - Porte ${u.code} : ${t.fullName} (${t.phone}) | Versé : ${formatFCFA(t.amountPaidCurrentPeriod)} | Reste à payer : ${formatFCFA(t.balanceDue)} | Note : ${t.arrangementNotes || '—'}`
        );
      });
    }

    lines.push(
      ``,
      `3. ÉCHÉANCES ARRIVANT DANS MOINS DE ${settings.alertDaysBeforeDue} JOURS (${dueSoonUnits.length}) :`
    );
    if (dueSoonUnits.length === 0) {
      lines.push(`   Aucune échéance imminente.`);
    } else {
      dueSoonUnits.forEach((u) => {
        const t = u.tenant!;
        const days = getDaysUntilDue(t.rentValidUntil);
        lines.push(
          `   - Porte ${u.code} : ${t.fullName} (${t.phone}) | Fin de validité le ${formatDateFR(t.rentValidUntil)} (dans ${days} jour(s)) | Loyer : ${formatFCFA(u.monthlyRent)}`
        );
      });
    }

    lines.push(
      ``,
      `--------------------------------------------------------------------`,
      `Rapport généré automatiquement par Conrad Solution — Gestion Immobilière.`
    );

    return lines.join('\n');
  }, [
    settings.ownerName,
    settings.alertDaysBeforeDue,
    activeBuilding.name,
    totalLateAndPartialAmount,
    lateUnits,
    partialUnits,
    dueSoonUnits,
  ]);

  const handleCopyReport = () => {
    navigator.clipboard?.writeText(emailBodyText);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 3000);
  };

  const handleTriggerEmail = () => {
    setEmailSentToast(true);
    setTimeout(() => setEmailSentToast(false), 4500);
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBodyText)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#0F172A] px-5 py-4 text-white flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Centre d’Alertes du Mois & Relances Rapides
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-200 border border-red-400/30">
                  {lateUnits.length} impayé(s) • {partialUnits.length} arrangement(s) •{' '}
                  {dueSoonUnits.length} échéance(s) &lt; {settings.alertDaysBeforeDue}j
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Montant total en attente de recouvrement sur les logements occupés :{' '}
                <strong className="text-amber-300 font-extrabold">
                  {formatFCFA(totalLateAndPartialAmount)}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setRecipientEmail(settings.email);
              setShowEmailModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-[#0F172A] font-extrabold text-sm flex items-center gap-2.5 shadow-md transition-all cursor-pointer shrink-0"
          >
            <Mail className="w-4 h-4 text-[#2563EB]" />
            <span>Envoyer le Récapitulatif par E-mail au Bailleur</span>
          </button>
        </div>

        {/* Liste horizontale rapide des portes nécessitant une attention immédiate */}
        <div className="p-4 bg-slate-50/70 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Colonne 1 : Impayés / Retards */}
          <div className="p-3.5 rounded-xl bg-white border border-red-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#EF4444]">
                <AlertTriangle className="w-4 h-4" />
                En Retard ({lateUnits.length})
              </span>
              <span className="text-xs font-bold text-slate-600">Action immédiate</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {lateUnits.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-lg bg-red-50/70 border border-red-200/80 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onSelectUnit(u)}
                    className="text-left group cursor-pointer"
                  >
                    <div className="font-extrabold text-sm text-[#0F172A] group-hover:text-[#2563EB]">
                      {u.code} — {u.tenant?.fullName}
                    </div>
                    <div className="text-xs font-bold text-[#EF4444]">
                      Dû : {formatFCFA(u.tenant?.balanceDue || u.monthlyRent)}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={buildTenantWhatsAppUrl(u, settings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Relancer le locataire sur WhatsApp"
                      className="px-2.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Locataire</span>
                    </a>
                    {u.tenant && !u.tenant.guarantor.noGuarantorRequired && (
                      <a
                        href={buildGuarantorWhatsAppUrl(u, settings)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Contacter le parent / garant sur WhatsApp"
                        className="px-2.5 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Garant</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {lateUnits.length === 0 && (
                <p className="text-xs text-slate-500 py-2">Aucun retard ce mois-ci.</p>
              )}
            </div>
          </div>

          {/* Colonne 2 : Paiements Partiels / Arrangements */}
          <div className="p-3.5 rounded-xl bg-white border border-amber-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#D97706]">
                <Clock className="w-4 h-4" />
                Arrangements / Acomptes ({partialUnits.length})
              </span>
              <span className="text-xs font-bold text-slate-600">Soldes promis</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {partialUnits.map((u) => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onSelectUnit(u)}
                    className="text-left group cursor-pointer"
                  >
                    <div className="font-extrabold text-sm text-[#0F172A] group-hover:text-[#2563EB]">
                      {u.code} — {u.tenant?.fullName}
                    </div>
                    <div className="text-xs font-bold text-[#B45309]">
                      Reste à payer : {formatFCFA(u.tenant?.balanceDue || 0)}
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={buildTenantWhatsAppUrl(u, settings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Rappel</span>
                    </a>
                    {u.tenant && !u.tenant.guarantor.noGuarantorRequired && (
                      <a
                        href={buildGuarantorWhatsAppUrl(u, settings)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-[#1E3A8A] hover:bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Garant</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {partialUnits.length === 0 && (
                <p className="text-xs text-slate-500 py-2">Aucun arrangement en cours.</p>
              )}
            </div>
          </div>

          {/* Colonne 3 : Échéances dans moins de 5 jours */}
          <div className="p-3.5 rounded-xl bg-white border border-blue-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                <BellRing className="w-4 h-4" />
                Échéance &lt; {settings.alertDaysBeforeDue} jours ({dueSoonUnits.length})
              </span>
              <span className="text-xs font-bold text-slate-600">Préavis doux</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {dueSoonUnits.map((u) => {
                const days = getDaysUntilDue(u.tenant?.rentValidUntil);
                return (
                  <div
                    key={u.id}
                    className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectUnit(u)}
                      className="text-left group cursor-pointer"
                    >
                      <div className="font-extrabold text-sm text-[#0F172A] group-hover:text-[#2563EB]">
                        {u.code} — {u.tenant?.fullName}
                      </div>
                      <div className="text-xs font-semibold text-[#1E3A8A]">
                        Fin le {formatDateFR(u.tenant?.rentValidUntil)} (dans {days} j)
                      </div>
                    </button>
                    <a
                      href={buildTenantWhatsAppUrl(u, settings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Prévenir</span>
                    </a>
                  </div>
                );
              })}
              {dueSoonUnits.length === 0 && (
                <p className="text-xs text-slate-500 py-2">
                  Aucune échéance dans les {settings.alertDaysBeforeDue} prochains jours.
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modale d'envoi du Récapitulatif par E-mail au Propriétaire */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden"
            >
              <div className="bg-[#0F172A] text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">
                      Récapitulatif par E-mail au Propriétaire
                    </h3>
                    <p className="text-xs text-slate-300">
                      Rapport complet des retards, arrangements et échéances proches
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Adresse E-mail de réception du Bailleur
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Aperçu du rapport généré automatiquement
                  </label>
                  <textarea
                    readOnly
                    rows={11}
                    value={emailBodyText}
                    className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 font-mono text-xs sm:text-sm text-slate-800 leading-relaxed focus:outline-none"
                  />
                </div>

                {emailSentToast && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
                    <span>
                      Votre messagerie e-mail a été ouverte avec le récapitulatif complet prêt à
                      être envoyé à {recipientEmail}.
                    </span>
                  </div>
                )}

                {copiedToast && (
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-300 text-blue-900 text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#2563EB] shrink-0" />
                    <span>Rapport copié dans le presse-papiers !</span>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCopyReport}
                    className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copier le texte du rapport</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowEmailModal(false)}
                      className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerEmail}
                      className="px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-bold text-sm flex items-center gap-2 shadow-md cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>Envoyer par E-mail Maintenant</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
