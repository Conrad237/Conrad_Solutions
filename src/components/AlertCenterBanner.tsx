import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
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
  buildPreventiveThreeMonthsWhatsAppUrl,
  buildTenantWhatsAppUrl,
  calculateUnitSeparatedBalances,
  formatDateFR,
  formatFCFA,
  getDaysUntilDue,
  getRemainingMonthsCovered,
  isPreventiveThreeMonthsAlert,
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

  // Système d'Alerte Préventive à 3 Mois (<= 3 mois de loyer payé d'avance restants)
  const preventiveThreeMonthsUnits = useMemo(
    () => units.filter((u) => isPreventiveThreeMonthsAlert(u)),
    [units]
  );

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
    return units.reduce((acc, u) => {
      if (u.status === 'VACANT') return acc;
      const balances = calculateUnitSeparatedBalances(u);
      return acc + balances.globalNetDue;
    }, 0);
  }, [units]);

  const emailSubject = `[Conrad Solutions] Récapitulatif Loyers & Alertes 3 Mois — ${activeBuilding.name} (${formatDateFR('2026-10-26')})`;

  const emailBodyText = useMemo(() => {
    const lines: string[] = [
      `Bonjour ${settings.ownerName},`,
      ``,
      `Voici le récapitulatif automatique des alertes locatives pour votre immeuble "${activeBuilding.name}" :`,
      `====================================================================`,
      `• SOLDE GLOBAL NET À RECOUVRER (Loyers + Forfaits Eau + Reste Élec) : ${formatFCFA(totalLateAndPartialAmount)}`,
      `• Locataires en retard (Impayés) : ${lateUnits.length}`,
      `• Locataires en arrangement (Paiement partiel) : ${partialUnits.length}`,
      `• Alertes préventives à 3 mois (<= 3 mois restants) : ${preventiveThreeMonthsUnits.length}`,
      `====================================================================`,
      ``,
      `1. LOCATAIRES EN RETARD DE PAIEMENT (${lateUnits.length}) :`,
    ];

    if (lateUnits.length === 0) {
      lines.push(`   Aucun locataire en retard.`);
    } else {
      lateUnits.forEach((u) => {
        const t = u.tenant!;
        const bal = calculateUnitSeparatedBalances(u);
        lines.push(
          `   - Porte ${u.code} : ${t.fullName} (${t.phone}) | Solde Net Dû : ${formatFCFA(bal.globalNetDue)} | Échéance : ${formatDateFR(t.rentValidUntil)}`
        );
      });
    }

    lines.push(``, `2. PAIEMENTS PARTIELS / ARRANGEMENTS EN COURS (${partialUnits.length}) :`);
    if (partialUnits.length === 0) {
      lines.push(`   Aucun paiement partiel en attente.`);
    } else {
      partialUnits.forEach((u) => {
        const t = u.tenant!;
        const bal = calculateUnitSeparatedBalances(u);
        lines.push(
          `   - Porte ${u.code} : ${t.fullName} (${t.phone}) | Versé Loyer : ${formatFCFA(t.amountPaidCurrentPeriod)} | Reste Global Net : ${formatFCFA(bal.globalNetDue)} | Note : ${t.arrangementNotes || '—'}`
        );
      });
    }

    lines.push(
      ``,
      `3. ALERTES PRÉVENTIVES À 3 MOIS (<= 3 MOIS DE COUVERTURE RESTANTS : ${preventiveThreeMonthsUnits.length}) :`
    );
    if (preventiveThreeMonthsUnits.length === 0) {
      lines.push(`   Aucun locataire avec <= 3 mois restants.`);
    } else {
      preventiveThreeMonthsUnits.forEach((u) => {
        const t = u.tenant!;
        const rem = getRemainingMonthsCovered(u);
        lines.push(
          `   - Porte ${u.code} : ${t.fullName} (${t.phone}) | Reste : ${rem} mois couvert(s) | Fin le ${formatDateFR(t.rentValidUntil)} | Loyer : ${formatFCFA(u.monthlyRent)}/mois`
        );
      });
    }

    lines.push(
      ``,
      `--------------------------------------------------------------------`,
      `Rapport généré automatiquement par Conrad Solutions — Gestion Immobilière.`
    );

    return lines.join('\n');
  }, [
    settings.ownerName,
    activeBuilding.name,
    totalLateAndPartialAmount,
    lateUnits,
    partialUnits,
    preventiveThreeMonthsUnits,
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
      {/* BANNIÈRE DÉDIÉE : SYSTÈME D'ALERTE PRÉVENTIVE À 3 MOIS (<= 3 MOIS RESTANTS) */}
      {preventiveThreeMonthsUnits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-orange-50 border-2 border-[#F59E0B] p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-sm shrink-0">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-[#0F172A]">
                    Système d’Alerte Préventive à 3 Mois (Rappel Automatique)
                  </h3>
                  <span className="px-3 py-0.5 rounded-full bg-[#F59E0B] text-white text-xs font-extrabold">
                    Échéance proche : &lt;= 3 mois restants ({preventiveThreeMonthsUnits.length}{' '}
                    locataire{preventiveThreeMonthsUnits.length > 1 ? 's' : ''})
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-950 font-medium mt-0.5">
                  Ces locataires ont <strong>3 mois ou moins de loyer payé d’avance</strong>. Cliquez sur le bouton WhatsApp pour leur envoyer un rappel courtois de renouvellement.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto pr-1">
            {preventiveThreeMonthsUnits.map((u) => {
              const remMonths = getRemainingMonthsCovered(u);
              return (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-white border border-amber-300 shadow-xs flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onSelectUnit(u)}
                    className="text-left group cursor-pointer min-w-0"
                  >
                    <div className="font-extrabold text-sm text-[#0F172A] group-hover:text-[#2563EB] truncate">
                      {u.code} — {u.tenant?.fullName}
                    </div>
                    <div className="text-xs font-extrabold text-[#B45309]">
                      ⚠️ Échéance proche : {remMonths} mois restant{remMonths > 1 ? 's' : ''} (fin{' '}
                      {formatDateFR(u.tenant?.rentValidUntil)})
                    </div>
                  </button>

                  <a
                    href={buildPreventiveThreeMonthsWhatsAppUrl(u, settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Envoyer un rappel préventif courtois à 3 mois sur WhatsApp"
                    className="px-3 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Rappel 3 Mois</span>
                  </a>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* BANNIÈRE CENTRALE DES ALERTES & RECOUVREMENTS */}
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
                  {preventiveThreeMonthsUnits.length} alerte(s) &lt;= 3 mois
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Solde Global Net à recouvrer (Loyers + Forfaits Eau + Reste Électricité ENEO) :{' '}
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
              {lateUnits.map((u) => {
                const bal = calculateUnitSeparatedBalances(u);
                return (
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
                        Solde Net Dû : {formatFCFA(bal.globalNetDue || u.monthlyRent)}
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
                );
              })}
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
              {partialUnits.map((u) => {
                const bal = calculateUnitSeparatedBalances(u);
                return (
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
                        Loyer : {formatFCFA(bal.rentBalanceDue)} | Global Net :{' '}
                        {formatFCFA(bal.globalNetDue)}
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
                );
              })}
              {partialUnits.length === 0 && (
                <p className="text-xs text-slate-500 py-2">Aucun arrangement en cours.</p>
              )}
            </div>
          </div>

          {/* Colonne 3 : Échéances imminentes */}
          <div className="p-3.5 rounded-xl bg-white border border-blue-200">
            <div className="flex items-center justify-between mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#2563EB]">
                <BellRing className="w-4 h-4" />
                Échéance &lt; {settings.alertDaysBeforeDue} jours ({dueSoonUnits.length})
              </span>
              <span className="text-xs font-bold text-slate-600">Préavis immédiat</span>
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
                      Rapport complet des retards, arrangements et alertes préventives à 3 mois
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
