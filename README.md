# Conrad Solutions — Application PWA de Gestion de Flotte Immobilière (Résidence Moro)

Application web complète (**PWA — Progressive Web App** installable et **Vercel Ready**) conçue par **Conrad Solutions** pour la gestion locative de la **Résidence Moro** au Cameroun, avec une ergonomie **Senior-Friendly** (haute lisibilité, contrastes élevés, zéro jargon technique).

---

## 1. Démarrage Rapide & Build Production (Vercel Ready)

```bash
npm install
npm run dev
# Pour compiler en production (Vercel) :
npm run build
```

- **Accès Propriétaire Sécurisé :**
  - **Identifiant :** `proprietaire.moro@conrad-solutions.cm`
  - **Mot de passe maître :** `Joël Brian`

---

## 2. Topologie Spatiale Exacte de la « Résidence Moro » (35 Unités)

- **Rez-de-chaussée (Étage 0) :** 8 Chambres (`CH01` à `CH08`), aucun studio au RDC. (`CH07` et `CH08` au fond du couloir).
- **1er, 2ème et 3ème Étages (Étages 1, 2 et 3) :**
  - **Début du couloir (Arrivée des escaliers) :** 2 Studios (`STX1` à gauche et `STX2` à droite).
  - **Suite du couloir :** 7 Chambres alignées (Impairs à gauche, Pairs à droite — **pas de chambre `CHX7`**).
  - **Tout au fond du couloir :** Chambres `CHX5` (Gauche) et `CHX8` (Droite).

---

## 3. Compte Courant Locataire Glissant

- **Paiements partiels / Acomptes :** Ex: Versement de `20 000 FCFA` sur `32 000 FCFA` → Reste à payer calculé automatiquement à `12 000 FCFA` (Statut Orange).
- **Avances multi-mois avec report de solde :** Ex: Versement de `100 000 FCFA` pour un loyer de `32 000 FCFA` → `3 mois complets couverts (96 000 FCFA)` + **Crédit d'avance positif de `+4 000 FCFA`** reporté automatiquement sur le mois suivant.
