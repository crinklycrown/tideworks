/* Dialoge: Ole, der alte Fischer (Pfahldorf). Format: data/dialogs/index.js */
export default {
  // Akt 1, nach cs_npc_ole „Rauch hinter dem Nebel“
  ole_1: { speaker: 'ole', lines: [
    'Halt! Keinen Schritt weiter auf meinen Steg.',
    'Vom Meer kommt nichts Gutes. Das weiß hier jedes Kind.',
    'Mein Vater hat da unten Korn gesät. Heute werfe ich dort meine Netze aus.',
    'Keiner hat uns gewarnt. Die Lampe blieb dunkel.',
    'Du bist kein Fischer. Viel zu weiche Hände. … Woher kommst du überhaupt?',
    'Pah. Wir handeln, mehr nicht. Bring Holz, dann reden wir weiter.',
    'Und halt die Augen offen. Da draußen gibt es noch mehr als uns.'
  ] },
  // Akt 3, einmalig beim Kauf der Glocken-Teile
  ole_tote: { speaker: 'ole', lines: ['Lass die Toten schlafen.'] },
  // Gespräch ohne Story-Schritt
  ole_idle: { speaker: 'ole', idle: 'ole', lines: ['Wir handeln, mehr nicht. Bring Holz, dann reden wir weiter.'] }
};
