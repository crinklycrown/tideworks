/* Dialoge mit mehreren Figuren: Rückblenden, Finale, Enden. Format: data/dialogs/index.js
   *_rueck sind die Sätze innerhalb der Rückblenden. wahrheit_rueck: Einblendungen in cs_wahrheit (Zeiten dort), bei reduzierter
   Bewegung als Dialog vor „wahrheit“. Der Herrscher hat erst nach dem Umdrehen ein Gesicht (Porträt spieler), davor keins.
   flutnacht_rueck gehört zu cs_flutnacht (noch nicht gebaut). */
export default {
  flutnacht_rueck: { speaker: 'herrscher', lines: [
    'Entzündet das Leuchtfeuer. Sofort. Jedes Dorf muss gewarnt werden.',
    { who: 'stimme', text: 'Wie Ihr befehlt, Herr.' }
  ] },
  wahrheit_rueck: { speaker: 'aurel', lines: [
    'Herr, das Pumpwerk ist ausgefallen. Wir können das Meer nicht mehr halten.',
    { who: 'herrscher', portrait: 'spieler', text: 'Dann entzündet das Leuchtfeuer. Sofort. Jedes Dorf muss gewarnt werden.' },
    'Wie Ihr befehlt.',
    'Kein Wort. Wir gehen hinauf.',
    'Der Herrscher hat das Feuer verweigert. Er hat euch ertrinken lassen.',
    { who: 'herrscher', portrait: 'spieler', text: 'Das Feuer hat nie gebrannt. Warum?' },
    'Weil dieses Land nur einen Herrscher braucht. Und wenn du fort bist, glauben alle, du hast sie ertrinken lassen.'
  ] },
  // Finale, nach cs_wahrheit (danach die Entscheidung)
  wahrheit: { speaker: 'aurel', lines: ['Du erinnerst dich also. Dann weißt du auch, was du verlieren kannst. Lass das Feuer aus, und alles gehört wieder dir: das Land, die Fabriken, die Krone.'] },
  // Ende A (0.23.0): ende_a_szene sind Einblendungen IN cs_ende_a (Zeiten dort), ende_a der Dialog danach (am Morgen)
  ende_a_szene: { speaker: 'ole', lines: [
    'Die Lampe… sie brennt.',
    { who: 'brann', text: 'Diesmal hat jemand das Feuer entzündet.' },
    { who: 'aurel', text: 'Das war ein Fehler, Herrscher. Von mir bekommst du nichts mehr.' }
  ] },
  ende_a: { speaker: 'brann', lines: [
    'Aurel ist fort. Seine Fabriken hat er angezündet, bevor er ablegte.',
    'Der Rat hat beschlossen: Der Goldberg gehört dir. Bau ihn wieder auf. Diesmal für alle.'
  ] },
  // Ende B: Einblendung IN cs_ende_b (bei reduzierter Bewegung als Dialog); danach keine Stimme mehr, nur Wellen
  ende_b: { speaker: 'aurel', lines: ['Eine weise Entscheidung. Willkommen zurück, Herrscher.'] }
};
