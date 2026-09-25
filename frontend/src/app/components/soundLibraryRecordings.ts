interface Recording { key: string; blob: Blob }
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("readlr_sound_library", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("recordings", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function libraryRecording(key: string, blob?: Blob): Promise<Blob | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", blob ? "readwrite" : "readonly");
    const store = tx.objectStore("recordings");
    const request = blob ? store.put({ key, blob }) : store.get(key);
    tx.oncomplete = () => { db.close(); resolve(blob ?? (request.result as Recording | undefined)?.blob); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
  });
}
