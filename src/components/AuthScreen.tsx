import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { BRAND_CONFIG, MASTER_OWNER_ID, MASTER_OWNER_PASSWORD } from '@config/constants';
import { useApp } from '../context/AppContext';

export const AuthScreen: React.FC = () => {
  const { login, settings } = useApp();
  const [identifier, setIdentifier] = useState(settings.email || MASTER_OWNER_ID);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizeText = (str: string) =>
    str
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedNorm = normalizeText(MASTER_OWNER_PASSWORD);
    const enteredNorm = normalizeText(password);

    if (enteredNorm === expectedNorm) {
      setErrorMsg(null);
      login();
    } else {
      setErrorMsg(
        'Identifiants ou mot de passe maître incorrects. Veuillez vérifier vos accès propriétaire.'
      );
    }
  };

  const handleQuickMasterLogin = () => {
    setPassword(MASTER_OWNER_PASSWORD);
    setErrorMsg(null);
    login();
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white flex flex-col lg:flex-row">
      {/* Colonne Gauche : Landing Page SaaS Multi-Bailleurs Conrad Solutions */}
      <div className="lg:w-7/12 p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A8A]/70 to-[#0F172A] border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/30">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400 block">
                Infrastructure PropTech & SaaS Multi-Bailleurs
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {BRAND_CONFIG.companyName}
              </h1>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Écosystème Modulaire Évolutif</span>
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 my-10 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-sm font-semibold mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            La solution moderne pour la gestion locative et multi-bailleurs
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-6 text-white">
            Pilotez votre <span className="text-blue-400">flotte immobilière</span> en toute
            simplicité.
          </h2>

          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8">
            <strong>{BRAND_CONFIG.companyName}</strong> accompagne les propriétaires, bailleurs et
            gestionnaires immobiliers avec une plateforme intuitive pensée pour automatiser la
            gestion des loyers, suivre les encaissements en temps réel, gérer les charges
            individuelles (eau, électricité) et sécuriser vos revenus locatifs, quelle que soit la
            taille de votre parc.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: 'Cartographie Interactive des Biens',
                desc: 'Visualisation claire de chaque immeuble, étage par étage et porte par porte, avec indicateurs de statut en temps réel.',
              },
              {
                title: 'Compte Courant Locatif Intelligent',
                desc: 'Gestion fluide des acomptes partiels, des avances multi-mois et du report automatique des crédits sur les échéances suivantes.',
              },
              {
                title: 'Quittances Certifiées & Relances 1-Clic',
                desc: 'Édition instantanée de reçus PDF imprimables et notifications rapides WhatsApp ou E-mail pour les locataires et garants.',
              },
              {
                title: 'Pilotage des Charges & Rentabilité',
                desc: 'Suivi des sous-compteurs (eau, électricité), journal des travaux de maintenance et bilan financier annuel prévisionnel.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700/70 flex items-start gap-3"
              >
                <CheckCircle2 className="w-6 h-6 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white text-base">{item.title}</h3>
                  <p className="text-sm text-slate-300 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-400 border-t border-slate-800/80 pt-6">
          <span>
            © 2026 {BRAND_CONFIG.companyName} — Plateforme SaaS Multi-Bailleurs & Services Digitaux
          </span>
          <span className="text-slate-300 font-medium">
            Architecture Cloud & PWA • Prête à évoluer vers de nouveaux services
          </span>
        </div>
      </div>

      {/* Colonne Droite : Portail d'Authentification Propriétaire / Bailleur */}
      <div className="lg:w-5/12 p-8 sm:p-12 lg:p-16 flex items-center justify-center bg-[#F8FAFC] text-[#0F172A]">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">Portail Bailleur</h2>
              <p className="text-sm text-slate-600 font-medium">
                Connectez-vous pour accéder à votre patrimoine immobilier
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 mb-2">
                Identifiant ou E-mail du Compte
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50 text-base font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-extrabold text-slate-700">
                  Mot de passe maître *
                </label>
              </div>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Saisissez votre mot de passe..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-xl border-2 border-slate-300 bg-white text-base font-extrabold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Afficher ou masquer le mot de passe"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-900 text-xs sm:text-sm font-bold flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1E3A8A] text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              <span>Accéder à mon Espace Bailleur</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Accès Rapide Propriétaire Principal */}
          <div className="mt-7 pt-6 border-t border-slate-200">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#1E3A8A] mb-1">
                <KeyRound className="w-4 h-4 text-[#2563EB]" />
                <span>Connexion Rapide Propriétaire</span>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Authentification directe avec la clé maître propriétaire pour charger votre parc
                immobilier configuré.
              </p>
              <button
                type="button"
                onClick={handleQuickMasterLogin}
                className="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-[#1E3A8A] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Ouvrir ma Session Propriétaire</span>
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
