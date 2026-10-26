import { RentalUnit, TenantDocumentRecord } from '../types';
import { RESIDENCE_INTERNAL_RULES } from '../../config/constants';
import { formatDateFR, formatFCFA, getUnitFullLabel } from './formatters';

const DB_NAME = 'conrad_solutions_documents_db_v2';
const DB_VERSION = 1;
const STORE_NAME = 'tenant_documents';

function openDocumentsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB non disponible sur ce navigateur'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('by_unitId', 'unitId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enregistre ou remplace un document locataire (CNI, Contrat de Bail, etc.) dans IndexedDB
 */
export async function saveTenantDocumentToIDB(doc: TenantDocumentRecord): Promise<void> {
  const db = await openDocumentsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(doc);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Récupère tous les documents attachés à une unité locative depuis IndexedDB
 */
export async function getUnitDocumentsFromIDB(unitId: string): Promise<TenantDocumentRecord[]> {
  try {
    const db = await openDocumentsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('by_unitId');
      const request = index.getAll(unitId);

      request.onsuccess = () => {
        db.close();
        const docs = (request.result || []) as TenantDocumentRecord[];
        docs.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
        resolve(docs);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Récupère l'intégralité des documents stockés sur la machine du propriétaire
 */
export async function getAllDocumentsFromIDB(): Promise<TenantDocumentRecord[]> {
  try {
    const db = await openDocumentsDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        resolve((request.result || []) as TenantDocumentRecord[]);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return [];
  }
}

/**
 * Supprime un document locataire d'IndexedDB
 */
export async function deleteTenantDocumentFromIDB(docId: string): Promise<void> {
  const db = await openDocumentsDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(docId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Télécharge physiquement un fichier stocké dans IndexedDB sur le disque de l'ordinateur
 */
export function triggerDocumentDownload(doc: TenantDocumentRecord): void {
  const link = document.createElement('a');
  link.href = doc.dataUrl;
  const safeTenant = (doc.tenantName || 'Locataire').replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix =
    doc.docType === 'CNI'
      ? 'CNI'
      : doc.docType === 'LEASE_CONTRACT'
      ? 'Contrat_Bail'
      : 'Piece_Jointe';
  link.download = `${doc.unitCode}_${prefix}_${safeTenant}_${doc.fileName}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporte et sauvegarde sur le PC les dossiers du locataire (ou de toute la résidence) :
 * - Télécharge chaque pièce jointe enregistrée (CNI, Contrat de Bail)
 * - Génère et télécharge une fiche récapitulative complète du dossier locataire + Règlement Intérieur
 */
export async function exportUnitFolderToPC(
  unit: RentalUnit,
  buildingName = 'Résidence Moro'
): Promise<number> {
  const docs = await getUnitDocumentsFromIDB(unit.id);

  // Téléchargement physique de chaque pièce jointe (CNI, Contrat signé, etc.)
  docs.forEach((doc, idx) => {
    setTimeout(() => {
      triggerDocumentDownload(doc);
    }, idx * 250);
  });

  // Génération d'un dossier récapitulatif HTML autonome consultable hors-ligne sur le PC
  const tenantName = unit.tenant?.fullName || 'Logement_Vacant';
  const safeName = tenantName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <title>Dossier Locataire — ${unit.code} (${tenantName})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #0F172A; max-width: 820px; margin: 0 auto; background: #F8FAFC; }
    .card { background: white; border: 1px solid #CBD5E1; border-radius: 14px; padding: 24px; margin-bottom: 20px; }
    h1 { margin: 0 0 6px 0; color: #0F172A; font-size: 22px; }
    h2 { margin: 0 0 12px 0; color: #1E3A8A; font-size: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
    .doc-img { max-width: 100%; border-radius: 8px; border: 1px solid #CBD5E1; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Dossier Numérique Locataire — ${buildingName}</h1>
    <p style="color:#64748B;margin:0;">Exporté depuis Conrad Solutions le ${new Date().toLocaleDateString('fr-FR')}</p>
  </div>
  <div class="card">
    <h2>1. Identité & Contrat (${getUnitFullLabel(unit)})</h2>
    ${
      unit.tenant
        ? `<div class="grid">
            <div><strong>Nom complet :</strong> ${unit.tenant.fullName}</div>
            <div><strong>Téléphone :</strong> ${unit.tenant.phone}</div>
            <div><strong>N° CNI :</strong> ${unit.tenant.cniNumber || 'Non renseigné'}</div>
            <div><strong>Date d'entrée :</strong> ${formatDateFR(unit.tenant.moveInDate)}</div>
            <div><strong>Échéance loyer :</strong> ${formatDateFR(unit.tenant.rentValidUntil)} (${unit.tenant.monthsCovered} mois)</div>
            <div><strong>Loyer mensuel :</strong> ${formatFCFA(unit.monthlyRent)}</div>
            <div><strong>Forfait Eau mensuel :</strong> ${formatFCFA(unit.utilities.waterFlatFee ?? 2000)}</div>
            <div><strong>Garant :</strong> ${unit.tenant.guarantor.noGuarantorRequired ? 'Dispensé' : `${unit.tenant.guarantor.fullName} (${unit.tenant.guarantor.phone})`}</div>
          </div>`
        : `<p>Ce logement est actuellement vacant.</p>`
    }
  </div>
  <div class="card">
    <h2>2. Pièces Jointes Archivées (${docs.length} fichier(s))</h2>
    ${
      docs.length === 0
        ? `<p style="color:#64748B;">Aucune pièce jointe (CNI / Contrat) n'était attachée au moment de l'export.</p>`
        : docs
            .map(
              (d) => `<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #E2E8F0;">
                <strong>${d.docType === 'CNI' ? 'Carte Nationale d’Identité (CNI)' : d.docType === 'LEASE_CONTRACT' ? 'Contrat de Bail Signé' : 'Document'} :</strong> ${d.fileName} (${Math.round(d.fileSize / 1024)} Ko)
                ${d.mimeType.startsWith('image/') ? `<div><img class="doc-img" src="${d.dataUrl}" alt="${d.fileName}" /></div>` : `<div style="margin-top:8px;"><a href="${d.dataUrl}" download="${d.fileName}">Télécharger le fichier PDF intégré (${d.fileName})</a></div>`}
              </div>`
            )
            .join('')
    }
  </div>
  <div class="card">
    <h2>3. ${RESIDENCE_INTERNAL_RULES.title}</h2>
    ${RESIDENCE_INTERNAL_RULES.articles.map((a) => `<p><strong>${a.title}</strong><br/>${a.body}</p>`).join('')}
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dossier_Complet_${unit.code}_${safeName}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);

  return docs.length;
}
