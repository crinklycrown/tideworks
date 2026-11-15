/* Dialoge: Brann, der Werkmeister (Werkstattbucht). Format: data/dialogs/index.js */
export default {
  // Akt 1, nach cs_npc_brann „Funken in der Werkstatt“
  brann_1: { speaker: 'brann', lines: [
    'Na sieh mal an. Ein Fremder, der nicht ertrunken ist. Das ist selten geworden.',
    'Ole hat dich angeknurrt? Das macht er mit allen.',
    'Ich bin Brann. Wir bauen hier, was das Meer uns übrig lässt: Werkzeug, Seile, Zahnräder.',
    'Du hast Hände für Maschinen. Merkwürdig für jemanden, der angespült wurde.',
    'Sieh dich weiter um. Wenn du alle Inseln hier draußen kennst, komm zurück. Ich hätte da etwas für dich.'
  ] },
  // Ende Akt 1, nach cs_bauplan „Der Bauplan“
  brann_bauplan: { speaker: 'brann', lines: [
    'Du hast sie alle gesehen. Gut. Dann ist es Zeit.',
    'Das ist der Plan für einen Leuchtturm. So einen gab es früher schon einmal.',
    'Ein Licht, das man von jeder Insel aus sieht. Damit nie wieder jemand im Dunkeln bleibt.',
    'Bau ihn. Mal sehen, was du daraus machst.'
  ] },
  // Ende Akt 2, nach cs_licht_im_wind „Ein Licht im Wind“
  brann_glocke: { speaker: 'brann', lines: [
    'Der Turm wächst. Gut.',
    'Hier, noch ein Plan: eine Taucherglocke. Damit kommst du an Stellen, an die sonst nur Fische kommen.',
    'Die Teile bekommst du von mir und von Ole. Auch wenn er knurrt.'
  ] },
  // Akt 3, nach cs_abstieg (erster Tauchgang)
  brann_glocke_haelt: { speaker: 'brann', lines: ['Die Glocke hält. Achte auf Blasen im Wasser. Wo es blubbert, liegt etwas da unten.'] },
  // Ende Akt 3, nach cs_alte_karte „Die alte Karte“
  brann_karte: { speaker: 'brann', lines: [
    'Diese Karte… das ist unser Land. Wie es früher war.',
    'Siehst du die Spitzen hier? Das sind wir. Jede Insel war einmal ein Berg.',
    'Dann kam die große Flut. In einer Nacht war alles unter Wasser: die Dörfer, die Felder, die Menschen.',
    'Nur wer oben auf den Bergen war, hat überlebt.'
  ] },
  // Ende Akt 4: vor cs_flutnacht, danach
  brann_pumpwerk: { speaker: 'brann', lines: ['Das ist das alte Pumpwerk. Es hat das Meer vom Land ferngehalten.'] },
  brann_flutnacht: { speaker: 'brann', lines: [
    'Das Feuer kam nie. Man sagt, der Herrscher selbst hat es verweigert.',
    'Seitdem hasst ihn jeder, der überlebt hat. Wo er auch sein mag.'
  ] },
  // Gespräch ohne Story-Schritt (Akt 1, danach)
  brann_idle: { speaker: 'brann', idle: 'brann', when: { maxAct: 1 }, lines: ['Sieh dich weiter um. Wenn du alle Inseln hier draußen kennst, komm zurück.'] },
  brann_idle2: { speaker: 'brann', idle: 'brann', when: { minAct: 2 }, lines: ['Bau ihn. Mal sehen, was du daraus machst.'] }
};
