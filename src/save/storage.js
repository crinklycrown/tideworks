/* =========================================================
   SPEICHER: beliebig viele Spielstände
   IndexedDB „tideworks“ mit drei Stores:
     saves  Schlüssel = Spielstand-ID → Spielstand als JSON-Text (siehe save/serialize.js)
     meta   Schlüssel = Spielstand-ID → { id, name, created, played, playTime, islands, thumb, v } (für die Liste, ohne den großen Text)
     kv     sonstiges: 'blueprints' (Blaupausen-Bibliothek, spielstandübergreifend), 'last' (zuletzt gespielte ID)
   Ohne IndexedDB: localStorage mit den Schlüsseln tideworks.meta (Liste), tideworks.save.<ID>, tideworks.kv.<Name>,
   höchstens LOCAL_SLOTS Spielstände (der Browser erlaubt dort nur wenige MB).
   Übernahme beim ersten Start (danach werden die alten Daten gelöscht):
     IndexedDB „workscape“ (Store saves, Schlüssel slot1 + blueprints) → „Spielstand 1“ und kv
     localStorage „workscape.factory.v2“ (Einzeldatei-Version) → „Spielstand 1“, „workscape.blueprints“ → kv
   Stände der alten, festen Karte (v2–v4) liefert init() als legacy zurück; die Oberfläche exportiert sie als Datei.
   ========================================================= */
import { DB_NAME, LS_PREFIX, OLD_DB, OLD_STORAGE_KEY, OLD_LS_PREFIX, LOCAL_SLOTS } from '../config.js';
import { parseSave, isOldSave } from './serialize.js';

const STORES = ['saves', 'meta', 'kv'];
// Inseln mit Kontor in einem (geparsten) Spielstand
export const saveIslands = (s) => new Set((s.blds || []).filter(b => b.t === 'kontor' || b.t === 'kontoralt').map(b => b.isl)).size;

// localStorage-Zugriff: Fehler werden geschluckt und in ok vermerkt
const local = {
  ok: true,
  get(k) { try { return localStorage.getItem(k); } catch (e) { this.ok = false; return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { this.ok = false; return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }
};

const reqP = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
function openDB() {
  return new Promise((resolve, reject) => {
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blockiert'));
  });
}
// Alte Datenbank nur öffnen, wenn es sie gibt (sonst würde open sie anlegen: dann Abbruch im upgradeneeded)
function openOldDB() {
  return new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(OLD_DB.name); } catch (e) { resolve(null); return; }
    req.onupgradeneeded = (e) => { if (e.oldVersion === 0) { try { req.transaction.abort(); } catch (err) { /* egal */ } } };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}
function tx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    let t, r;
    try { t = db.transaction(stores, mode); r = fn(...[].concat(stores).map(s => t.objectStore(s))); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : r);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaktion abgebrochen'));
  });
}
export const newId = () => 's' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36).padStart(2, '0');
const lsMeta = () => { try { return JSON.parse(local.get(LS_PREFIX + 'meta') || '[]') || []; } catch (e) { return []; } };
const lsSetMeta = (list) => local.set(LS_PREFIX + 'meta', JSON.stringify(list));

export const storage = {
  kind: 'none',       // 'idb' | 'local'
  db: null,
  get ok() { return this.kind === 'idb' || local.ok; },
  get limit() { return this.kind === 'local' ? LOCAL_SLOTS : Infinity; },

  // Öffnet den Speicher und übernimmt alte Daten. Liefert { legacy }: Stand der alten Welt (v2–v4) oder null.
  async init() {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('kein IndexedDB');
      this.db = await openDB();
      this.kind = 'idb';
    } catch (e) {
      console.warn('IndexedDB nicht verfügbar, Spielstände liegen in localStorage (höchstens ' + LOCAL_SLOTS + ').', e && e.message);
      this.kind = 'local';
    }
    let legacy = null;
    try { legacy = await this.migrate(); } catch (e) { console.warn('Übernahme alter Spielstände fehlgeschlagen', e); }
    return { legacy };
  },
  // Alte Spielstände übernehmen: erst schreiben, dann die alten Daten löschen
  async migrate() {
    let legacy = null;
    const adopt = async (raw) => {
      if (!raw) return false;
      if (isOldSave(raw)) { legacy = raw; return true; }
      const s = parseSave(raw);
      if (!s) return false;
      if ((await this.list()).some(m => m.from === 'workscape')) return true;   // schon übernommen
      const id = newId();
      return this.write(id, JSON.stringify(s), { name: 'Spielstand 1', created: Date.now(), played: Date.now(), playTime: Math.round(s.time || 0), islands: saveIslands(s), from: 'workscape' })
        .then(ok => { if (ok) this.setLast(id); return ok; });
    };
    if (this.kind === 'idb') {
      const old = await openOldDB();
      if (old) {
        let raw = null, bp = null;
        try {
          if (old.objectStoreNames.contains(OLD_DB.store)) {
            const t = old.transaction(OLD_DB.store, 'readonly'), st = t.objectStore(OLD_DB.store);
            [raw, bp] = await Promise.all([reqP(st.get(OLD_DB.slot)), reqP(st.get('blueprints'))]);
          }
        } catch (e) { console.warn('Alte Datenbank nicht lesbar', e); }
        old.close();
        let ok = true;
        if (raw) ok = await adopt(raw);
        if (ok && bp && !(await this.getItem('blueprints'))) ok = await this.setItem('blueprints', bp);
        if (ok) { try { indexedDB.deleteDatabase(OLD_DB.name); console.info('Alte Datenbank „workscape“ übernommen und gelöscht.'); } catch (e) { /* egal */ } }
      }
    }
    // Einzeldatei-Version und localStorage-Fallback der alten Fassung
    const rawLS = local.get(OLD_STORAGE_KEY);
    if (rawLS && await adopt(rawLS)) { local.del(OLD_STORAGE_KEY); console.info('Alter Spielstand aus localStorage übernommen.'); }
    const bpLS = local.get(OLD_LS_PREFIX + 'blueprints');
    if (bpLS) { if (!(await this.getItem('blueprints')) && await this.setItem('blueprints', bpLS)) local.del(OLD_LS_PREFIX + 'blueprints'); else if (await this.getItem('blueprints')) local.del(OLD_LS_PREFIX + 'blueprints'); }
    return legacy;
  },

  /* ---------- Spielstände ---------- */
  // Metadaten aller Spielstände, zuletzt gespielte zuerst
  async list() {
    let all = [];
    if (this.kind === 'idb') { try { all = await tx(this.db, 'meta', 'readonly', s => s.getAll()); } catch (e) { console.warn('Liste nicht lesbar', e); } }
    else if (this.kind === 'local') all = lsMeta();
    return (all || []).filter(m => m && m.id).sort((a, b) => (b.played || 0) - (a.played || 0));
  },
  async meta(id) { return (await this.list()).find(m => m.id === id) || null; },
  async load(id) {
    if (!id) return null;
    if (this.kind === 'idb') { try { return (await tx(this.db, 'saves', 'readonly', s => s.get(id))) || null; } catch (e) { console.warn('Spielstand nicht lesbar', e); return null; } }
    return local.get(LS_PREFIX + 'save.' + id);
  },
  // Spielstand und Metadaten schreiben (meta wird mit den vorhandenen zusammengeführt). Liefert true bei Erfolg.
  async write(id, json, meta) {
    if (!id || !json) return false;
    const old = (await this.meta(id)) || { id, name: 'Spielstand', created: Date.now(), playTime: 0, islands: 1 };
    const m = Object.assign({}, old, meta || {}, { id });
    if (this.kind === 'idb') {
      try { await tx(this.db, ['saves', 'meta'], 'readwrite', (s, mt) => { s.put(json, id); mt.put(m, id); }); return true; }
      catch (e) { console.warn('Speichern fehlgeschlagen', e); return false; }
    }
    if (this.kind !== 'local') return false;
    const list = lsMeta().filter(x => x.id !== id);
    if (list.length >= LOCAL_SLOTS) return false;
    if (!local.set(LS_PREFIX + 'save.' + id, json)) return false;
    list.push(m); return lsSetMeta(list);
  },
  async rename(id, name) {
    const m = await this.meta(id);
    if (!m) return false;
    m.name = name;
    if (this.kind === 'idb') { try { await tx(this.db, 'meta', 'readwrite', s => s.put(m, id)); return true; } catch (e) { return false; } }
    return lsSetMeta(lsMeta().map(x => x.id === id ? m : x));
  },
  async remove(id) {
    if (this.kind === 'idb') { try { await tx(this.db, ['saves', 'meta'], 'readwrite', (s, mt) => { s.delete(id); mt.delete(id); }); } catch (e) { console.warn('Löschen fehlgeschlagen', e); return false; } }
    else { local.del(LS_PREFIX + 'save.' + id); lsSetMeta(lsMeta().filter(x => x.id !== id)); }
    if ((await this.getItem('last')) === id) await this.setItem('last', '');
    return true;
  },
  async canCreate() { return (await this.list()).length < this.limit; },
  async last() { const id = await this.getItem('last'); return id && (await this.meta(id)) ? id : ((await this.list())[0] || {}).id || null; },
  setLast(id) { return this.setItem('last', id || ''); },

  /* ---------- Sonstiges (Blaupausen …) ---------- */
  async getItem(key) {
    if (this.kind === 'idb') { try { return (await tx(this.db, 'kv', 'readonly', s => s.get(key))) || null; } catch (e) { console.warn('Lesen fehlgeschlagen', key, e); return null; } }
    return local.get(LS_PREFIX + 'kv.' + key);
  },
  async setItem(key, val) {
    if (this.kind === 'idb') { try { await tx(this.db, 'kv', 'readwrite', s => s.put(val, key)); return true; } catch (e) { console.warn('Speichern fehlgeschlagen', key, e); return false; } }
    return local.set(LS_PREFIX + 'kv.' + key, val);
  }
};
