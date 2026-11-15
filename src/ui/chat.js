/* =========================================================
   KOOP-CHAT unten links (nur in einer Koop-Sitzung sichtbar)
   Enter öffnet die Eingabe, Enter schickt, Esc schließt. Neue Nachrichten stehen CHAT.show Sekunden da
   (Name in Spielerfarbe, Systemmeldungen grau), der Knopf daneben zeigt den Verlauf (letzte CHAT.keep).
   Die Lobby (ui/coop.js) zeigt denselben Verlauf in ihrem eigenen Feld.
   ========================================================= */
import { CHAT } from '../data/net.js';
import { esc } from '../util/format.js';
import { img } from '../gfx/pixelbuffer.js';
import { SPR } from '../gfx/sprites.js';
import { coop, on, sendChat, active } from '../net/session.js';
import { $ } from './context.js';
import { registerTip } from './tooltip.js';
import { layoutSoon } from './layout.js';

let wired = false, histOpen = false;

// eine Zeile: „Name: Text“ (Name in Spielerfarbe) oder graue Systemmeldung
export function chatLine(c) {
  if (c.sys) return `<div class="cl sys" style="color:${CHAT.sys}">${esc(c.text)}</div>`;
  return `<div class="cl"><b style="color:${esc(c.color)}">${esc(c.name)}:</b> ${esc(c.text)}</div>`;
}

export function wireChat() {
  if (wired) return;
  wired = true;
  $('chatHistBtn').innerHTML = img(SPR.icon.chat, 2);
  registerTip('chatHist', () => '<div class="tt-h"><span>Chatverlauf</span><kbd>Enter</kbd></div><div class="xs">Enter: schreiben, Esc: schließen. Die letzten 100 Nachrichten.</div>');
  $('chatHistBtn').addEventListener('click', (e) => { e.currentTarget.blur(); toggleHistory(); });
  $('chatHistX').addEventListener('click', () => toggleHistory(false));
  const inp = $('chatInput');
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();       // keine Spiel-Kürzel beim Schreiben
    if (e.key === 'Enter') { e.preventDefault(); sendChat(inp.value); closeChat(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeChat(); }
  });
  inp.addEventListener('blur', () => { if (!inp.value.trim()) closeChat(); });
  on('chat', () => renderChat());
  on('update', () => renderChat());
  setInterval(renderChat, 1000);   // alte Zeilen ausblenden
}
export function openChat() {
  if (!active()) return;
  const inp = $('chatInput');
  $('chat').classList.add('typing');
  inp.classList.remove('hidden');
  inp.focus();
  renderChat();
}
export function closeChat() {
  const inp = $('chatInput');
  inp.value = '';
  inp.classList.add('hidden');
  $('chat').classList.remove('typing');
  if (document.activeElement === inp) inp.blur();
  renderChat();
}
function toggleHistory(v) {
  histOpen = v == null ? !histOpen : v;
  renderChat();
}
// sichtbar: Koop-Sitzung im Spiel (nicht im Hauptmenü/Lobby)
export function renderChat() {
  const box = $('chat');
  if (!box) return;
  const show = active() && coop.phase === 'game' && !document.body.classList.contains('menu');
  if (box.classList.contains('hidden') === show) { box.classList.toggle('hidden', !show); layoutSoon(); }
  if (!show) return;
  const typing = box.classList.contains('typing'), t = performance.now();
  const recent = coop.chat.filter(c => typing || t - (c.t0 || 0) < CHAT.show * 1000).slice(typing ? -12 : -6);
  const html = recent.map(chatLine).join('');
  if ($('chatLog').dataset.h !== html) { $('chatLog').innerHTML = html; $('chatLog').dataset.h = html; }
  $('chatHist').classList.toggle('hidden', !histOpen);
  if (histOpen) {
    const body = $('chatHistBody'), h = coop.chat.map(chatLine).join('') || '<div class="xs muted">Noch keine Nachrichten.</div>';
    if (body.dataset.h !== h) { const end = body.scrollTop + body.clientHeight >= body.scrollHeight - 8; body.innerHTML = h; body.dataset.h = h; if (end) body.scrollTop = body.scrollHeight; }
  }
}
