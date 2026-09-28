// Cola de actas pendientes de subir cuando no hay señal. Persiste en IndexedDB
// (sobrevive recargas de página y cierres del navegador) para que una foto de
// acta tomada sin conexión no se pierda mientras el personero espera señal.
const DB_NAME = 'votocontrol-offline';
const STORE = 'actas-pendientes';

export interface ActaPendiente {
  id: number;
  mesaId: number;
  fileName: string;
  fileType: string;
  blob: Blob;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addActaPendiente(data: { mesaId: number; fileName: string; fileType: string; blob: Blob }): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...data, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listActasPendientes(): Promise<ActaPendiente[]> {
  const db = await openDB();
  const result = await new Promise<ActaPendiente[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as ActaPendiente[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function removeActaPendiente(id: number): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
