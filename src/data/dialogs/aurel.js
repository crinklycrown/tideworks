/* Dialoge: Aurel, König vom Goldberg. Format: data/dialogs/index.js */
export default {
  // Akt 1, nach cs_npc_aurel „Der Goldberg“
  aurel_1: { speaker: 'aurel', lines: [
    'Willkommen auf dem Goldberg, Reisender! Die Sonne scheint, und Ihr bringt Gesellschaft. Ein guter Tag.',
    'Ihr seid… neu hier, nicht wahr? Verzeiht. Ihr erinnert mich an jemanden.',
    'Hier oben leidet niemand Not. Was Ihr braucht, sollt Ihr bekommen. Freunde beschenken einander.',
    'Die anderen Inseln? Gute Leute, aber verbittert. Hört nicht zu sehr auf ihre alten Geschichten.',
    'Kommt wieder, wann immer Ihr wollt.'
  ] },
  // Akt 2, einmalig beim Handel
  aurel_turm: { speaker: 'aurel', lines: ['Ein Leuchtturm? Wozu? Das Meer ist ruhig, und Schiffe finden ihren Weg auch so.'] },
  // Akt 4, einmalig nach Stufe 3
  aurel_tauchen: { speaker: 'aurel', lines: ['Ihr taucht in letzter Zeit viel, hört man. Was hofft Ihr dort unten zu finden?'] },
  // Akt 5
  aurel_nervoes: { speaker: 'aurel', lines: ['Ein fertiger Turm bringt nur alte Geschichten zurück. Lasst es gut sein, Freund.'] },
  // Gespräch ohne Story-Schritt
  aurel_idle: { speaker: 'aurel', idle: 'aurel', lines: ['Kommt wieder, wann immer Ihr wollt.'] }
};
