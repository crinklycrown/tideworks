/* =========================================================
   KOOP: Takte, Zeitgrenzen, Farben, Vermittlung (siehe src/net/)
   ========================================================= */

// Takte und Grenzen (Sekunden, wenn nicht anders angegeben)
export const NET = {
  snapEvery: 0.1,        // höchstens 10 Snapshots je Sekunde an jeden Mitspieler
  offViewEvery: 1,       // Gebäude außerhalb des Sichtbereichs: Änderungen höchstens so oft
  flowEvery: 1,          // Produktionsstatistik höchstens einmal je Sekunde
  viewEvery: 0.5,        // Mitspieler meldet seinen Kamera-Ausschnitt
  stateEvery: 0.1,       // Zeiger, Modus, Bauvorschau (an alle, nicht durch die Simulation)
  viewMargin: 1,         // Sichtbereich + so viele Chunks Rand (Band-Items, Gebäude im 10-Hz-Takt)
  pingEvery: 1,          // Lebenszeichen und Ping
  timeout: 10,           // ohne Nachricht: „Verbindung wird wiederhergestellt…“
  reconnect: 30,         // so lange wird neu verbunden, dann gilt die Verbindung als verloren
  retryEvery: 3,         // Abstand der Verbindungsversuche beim Wiederherstellen
  maxPlayers: 4,         // mit Host
  chunk: 16000,          // Bytes je Datenkanal-Nachricht (größere werden zerlegt)
  compressMin: 400,      // ab so vielen Bytes wird komprimiert (deflate)
  busyBytes: 512 * 1024, // Datenkanal voll: Snapshots warten, bis er sich geleert hat
  gatherWait: 4,         // manuelle Verbindung: so lange auf ICE-Kandidaten warten
  peerWait: 8,           // Vermittlungsdienst antwortet nicht → „Manuell verbinden“ anbieten
  joinWait: 60,          // Beitrittsanfrage: so lange wartet der Mitspieler auf „Zulassen“
  bpParts: 300           // Blaupausen-Vorschau anderer Spieler: höchstens so viele Teile
};

// Vermittlung (PeerJS-Cloud, kostenlos) und STUN/TURN (öffentlich). Die Peer-ID des Hosts ist prefix + Lobby-Code.
export const PEER = { host: '0.peerjs.com', port: 443, path: '/', secure: true, prefix: 'tideworks-' };
export const ICE = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp' }
];

// Lobby-Code TIDE-XXXX: ohne verwechselbare Zeichen (0/O, 1/I/L)
export const CODE = { prefix: 'TIDE-', len: 4, chars: 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' };

// Spielerfarben (Auswahl in der Lobby)
export const PLAYER_COLORS = ['#e8504a', '#3f8fe8', '#7cc24f', '#ffc61a', '#a25ad8', '#ff9a3a', '#3fc4b4', '#f0f0e8'];
export const NAME_MAX = 16;

// Chat
export const CHAT = { show: 8, keep: 100, max: 160, sys: '#8a7a68' };   // Sekunden sichtbar, Verlauf, Zeichen je Nachricht, Farbe der Systemmeldungen

// Markierungen: Halbkreis-Menü (Reihenfolge von links nach rechts), Lebensdauer, Ton
export const MARKS = {
  ttl: 15, menuR: 58,
  kinds: [
    { id: 'hier', name: 'Hierher', icon: 'markHere', tone: 660 },
    { id: 'achtung', name: 'Achtung', icon: 'markWarn', tone: 880 },
    { id: 'hilfe', name: 'Hilfe', icon: 'markHelp', tone: 520 },
    { id: 'bau', name: 'Bauplatz', icon: 'hammer', tone: 740 }
  ]
};
