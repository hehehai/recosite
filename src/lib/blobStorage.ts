const DB_NAME = "recosite-blobs";
const STORE_NAME = "media";
const CHUNKS_STORE_NAME = "screenshot-chunks";

/**
 * Store blob data in IndexedDB
 */
export async function storeBlobData(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).put({ id, blob, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get blob data from IndexedDB
 */
export async function getBlobData(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);

    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.blob || null);
    };

    request.onerror = () => {
      resolve(null);
    };
  });
}

/**
 * Delete blob data from IndexedDB
 */
export async function deleteBlobData(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============ Screenshot Chunks Storage ============

export interface ScreenshotChunk {
  sessionId: string;
  index: number;
  dataUrl: string;
  scrollY: number;
  timestamp: number;
}

/**
 * Store a single screenshot chunk in IndexedDB
 * Used for streaming capture of long pages
 */
export async function storeScreenshotChunk(
  sessionId: string,
  index: number,
  dataUrl: string,
  scrollY: number,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE_NAME, "readwrite");
    const store = tx.objectStore(CHUNKS_STORE_NAME);
    const id = `${sessionId}_${index}`;
    const request = store.put({
      id,
      sessionId,
      index,
      dataUrl,
      scrollY,
      timestamp: Date.now(),
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all screenshot chunks for a session
 * Returns chunks sorted by index
 */
export async function getScreenshotChunks(sessionId: string): Promise<ScreenshotChunk[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE_NAME, "readonly");
    const store = tx.objectStore(CHUNKS_STORE_NAME);
    const index = store.index("sessionId");
    const request = index.getAll(sessionId);

    request.onsuccess = () => {
      const results = request.result as ScreenshotChunk[];
      // Sort by index
      results.sort((a, b) => a.index - b.index);
      resolve(results);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single screenshot chunk by session and index
 */
export async function getScreenshotChunk(
  sessionId: string,
  index: number,
): Promise<ScreenshotChunk | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE_NAME, "readonly");
    const store = tx.objectStore(CHUNKS_STORE_NAME);
    const id = `${sessionId}_${index}`;
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete all screenshot chunks for a session
 * Used for cleanup after merging or on error
 */
export async function deleteScreenshotChunks(sessionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE_NAME, "readwrite");
    const store = tx.objectStore(CHUNKS_STORE_NAME);
    const index = store.index("sessionId");
    const request = index.openCursor(sessionId);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of chunks for a session
 */
export async function getScreenshotChunkCount(sessionId: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE_NAME, "readonly");
    const store = tx.objectStore(CHUNKS_STORE_NAME);
    const index = store.index("sessionId");
    const request = index.count(sessionId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Open IndexedDB database
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2); // Bump version for new store

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Media store for blobs
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }

      // Screenshot chunks store for streaming capture
      if (!db.objectStoreNames.contains(CHUNKS_STORE_NAME)) {
        const chunksStore = db.createObjectStore(CHUNKS_STORE_NAME, {
          keyPath: "id",
        });
        // Index for querying by sessionId
        chunksStore.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
  });
}
