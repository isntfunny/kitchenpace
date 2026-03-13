import { RECIPE_TUTORIAL_TARGETS } from './shared';
import type { RecipeTutorialStep } from './types';

export const recipeTutorialSteps: RecipeTutorialStep[] = [
    {
        id: 'welcome',
        kind: 'info',
        title: 'Willkommen im Rezept-Ersteller',
        description:
            'Wir zeigen dir jetzt einmal die wichtigsten Pflichtfelder, das automatische Speichern und den Ablauf-Editor. Danach landest du direkt in deinem Entwurf und kannst frei weiterbauen.',
        primaryLabel: 'Tutorial starten',
    },
    {
        id: 'title',
        kind: 'title-match',
        title: 'Titel ist Pflicht',
        description:
            'Jedes Rezept braucht zuerst einen Titel. Tippe fuer diesen Schritt exakt Flammkuchen ein.',
        primaryLabel: 'Weiter',
        expectedValue: 'Flammkuchen',
        targetId: RECIPE_TUTORIAL_TARGETS.title,
        allowTargetInteraction: true,
        autoFocusAction: 'title',
        accentLabel: 'Pflichtfeld',
    },
    {
        id: 'category',
        kind: 'state',
        title: 'Kategorie waehlen',
        description:
            'Waehle jetzt mindestens eine Kategorie aus. So wird dein Rezept spaeter richtig einsortiert und schneller gefunden.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.category,
        stateKey: 'categorySelected',
        allowTargetInteraction: true,
        accentLabel: 'Pflichtfeld',
    },
    {
        id: 'servings-custom',
        kind: 'event',
        title: 'Eigene Werte eingeben',
        description:
            'Diese Segmentleiste bietet schnelle Standardwerte. Mit dem letzten Button oeffnest du ein freies Eingabefeld fuer eigene Zahlen. Klicke ihn jetzt einmal bei den Portionen an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.servingsCustomTrigger,
        eventKey: 'servingsCustomOpened',
        allowTargetInteraction: true,
    },
    {
        id: 'ingredient-add',
        kind: 'state',
        title: 'Zutaten hinzufuegen',
        description:
            'Hier suchst du Zutaten und fuegst sie dem Rezept hinzu. Fuege jetzt mindestens eine Zutat hinzu.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientSearch,
        stateKey: 'ingredientAdded',
        allowTargetInteraction: true,
        accentLabel: 'Pflichtfeld',
    },
    {
        id: 'ingredient-amount',
        kind: 'event',
        title: 'Menge und Einheit',
        description:
            'In jeder Zutatenzeile pflegst du spaeter Menge und Einheit. Klicke jetzt einmal in das Mengenfeld deiner Zutat.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientAmount,
        eventKey: 'ingredientAmountFocused',
        allowTargetInteraction: true,
    },
    {
        id: 'ingredient-comment',
        kind: 'event',
        title: 'Kommentare und Hinweise',
        description:
            'Mit dem Sprechblasen-Button kannst du Hinweise wie fein gehackt, frisch oder optional vorbereiten hinterlegen. Klicke ihn jetzt einmal an - tippen musst du noch nichts.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientComment,
        eventKey: 'ingredientCommentClicked',
        allowTargetInteraction: true,
    },
    {
        id: 'ingredient-optional',
        kind: 'info',
        title: 'Optional markieren',
        description:
            'Mit Opt markierst du Zutaten als optional. Das ist praktisch fuer Toppings, Deko oder moegliche Varianten.',
        primaryLabel: 'Verstanden',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientOptional,
        allowTargetInteraction: false,
    },
    {
        id: 'draft-save',
        kind: 'info',
        title: 'Als Entwurf speichern',
        description:
            'Hier kannst du dein Rezept jederzeit manuell als Entwurf speichern. Im Tutorial klicken wir das bewusst nicht, damit du im gefuehrten Ablauf bleibst.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.draftSave,
        allowTargetInteraction: false,
    },
    {
        id: 'autosave',
        kind: 'state',
        title: 'Auto-Save ist aktiv',
        description:
            'Sobald die wichtigsten Angaben stehen, wird dein Entwurf automatisch gespeichert. Diese Leiste zeigt dir jederzeit den aktuellen Speicherstatus.',
        primaryLabel: 'Weiter in den Ablauf',
        targetId: RECIPE_TUTORIAL_TARGETS.autosaveBar,
        stateKey: 'autosaveVisible',
        allowTargetInteraction: false,
    },
    {
        id: 'flow-intro',
        kind: 'info',
        title: 'Jetzt kommt der Ablauf-Editor',
        description:
            'Hier baust du deinen Kochablauf als Diagramm auf. Start und Ende sind schon vorbereitet - dazwischen legst du die eigentlichen Schritte an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        allowTargetInteraction: false,
    },
    {
        id: 'flow-add-button',
        kind: 'event',
        title: 'Schritt-Menue oeffnen',
        description:
            'Mit dem Plus-Button auf einer Verbindung fuegst du neue Schritte in den Ablauf ein. Klicke ihn jetzt an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowAddButton,
        eventKey: 'flowAddButtonClicked',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-palette',
        kind: 'state',
        title: 'Schritt auswaehlen',
        description:
            'Hier siehst du die verfuegbaren Schrittarten als Uebersicht. Waehle jetzt einen Schritt aus und fuege ihn in deinen Ablauf ein.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowPalette,
        stateKey: 'flowNodeCreated',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-branch',
        kind: 'state',
        title: 'Parallelen Zweig anlegen',
        description:
            'Mit diesem Branch-Button legst du einen parallelen Zweig an, wenn etwas gleichzeitig passiert. Erzeuge jetzt wirklich einen Branch.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowBranchButton,
        stateKey: 'flowBranchCreated',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-rules',
        kind: 'info',
        title: 'Start, Ende und gueltige Pfade',
        description:
            'Jeder Ablauf beginnt am Start und endet beim Servieren. Wichtig ist: Jeder Zweig braucht am Ende wieder einen gueltigen Weg bis zum Ende, damit dein Rezept logisch und veroeffentlichbar bleibt.',
        primaryLabel: 'Zu meinem Entwurf',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        allowTargetInteraction: false,
    },
];
