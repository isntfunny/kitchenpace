import { RECIPE_TUTORIAL_TARGETS } from './shared';
import type { RecipeTutorialStep } from './types';

export const recipeTutorialSteps: RecipeTutorialStep[] = [
    {
        id: 'welcome',
        kind: 'info',
        title: 'Willkommen im Rezept-Ersteller',
        description:
            'In wenigen Schritten zeigen wir dir, wie du ein Rezept anlegst — von Titel und Zutaten bis zum Kochablauf. Los geht\u2019s!',
        primaryLabel: 'Tutorial starten',
    },
    {
        id: 'title',
        kind: 'title-match',
        title: 'Gib deinem Rezept einen Namen',
        description:
            'Der Titel ist ein Pflichtfeld — ohne ihn kann dein Rezept nicht gespeichert werden. Tippe jetzt einmal Flammkuchen ein.',
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
        title: 'Kategorie zuordnen',
        description:
            'Damit andere dein Rezept finden, braucht es mindestens eine Kategorie. Wähle jetzt eine aus.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.category,
        stateKey: 'categorySelected',
        allowTargetInteraction: true,
        accentLabel: 'Pflichtfeld',
    },
    {
        id: 'servings-custom',
        kind: 'event',
        title: 'Portionen anpassen',
        description:
            'Über die Schnellauswahl legst du gängige Portionsgrößen fest. Mit dem letzten Button kannst du auch einen eigenen Wert eintragen — klick ihn jetzt einmal an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.servingsBar,
        eventKey: 'servingsCustomOpened',
        allowTargetInteraction: true,
    },
    {
        id: 'ingredient-add',
        kind: 'state',
        title: 'Zutaten hinzufügen',
        description:
            'Jedes Rezept braucht mindestens eine Zutat. Suche über das Feld nach einer Zutat und füge sie hinzu.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientSearch,
        stateKey: 'ingredientAdded',
        allowTargetInteraction: true,
        accentLabel: 'Pflichtfeld',
    },
    {
        id: 'ingredient-amount',
        kind: 'state',
        title: 'Menge und Einheit angeben',
        description:
            'Hier trägst du ein, wie viel von einer Zutat benötigt wird. Die Menge passt sich später automatisch an die Portionszahl an. Trage jetzt eine Menge ein.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientAmount,
        stateKey: 'ingredientAmountFilled',
        allowTargetInteraction: true,
    },
    {
        id: 'ingredient-optional',
        kind: 'info',
        title: 'Optional markieren',
        description:
            'Mit diesem Button kennzeichnest du Zutaten, die nicht zwingend nötig sind — zum Beispiel eine Garnitur oder ein Topping.',
        primaryLabel: 'Verstanden',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientOptional,
        allowTargetInteraction: false,
    },
    {
        id: 'ingredient-comment',
        kind: 'event',
        title: 'Zutat kommentieren',
        description:
            'Über die Sprechblase kannst du Hinweise wie „fein gewürfelt" oder „zimmerwarm" ergänzen. Klick sie jetzt einmal an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientComment,
        eventKey: 'ingredientCommentClicked',
        allowTargetInteraction: true,
    },
    {
        id: 'draft-save',
        kind: 'info',
        title: 'Manuell speichern',
        description:
            'Über diesen Button speicherst du dein Rezept jederzeit als Entwurf. Im Tutorial überspringen wir das — dein Fortschritt geht nicht verloren.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.draftSave,
        allowTargetInteraction: false,
    },
    {
        id: 'autosave',
        kind: 'info',
        title: 'Auto-Save übernimmt',
        description:
            'Nach dem Tutorial speichert sich dein Entwurf automatisch, sobald du Änderungen machst. Du musst dich um nichts kümmern.',
        primaryLabel: 'Weiter in den Ablauf',
    },
    {
        id: 'flow-intro',
        kind: 'info',
        title: 'Der Ablauf-Editor',
        description:
            'Hier beschreibst du den Kochablauf als visuelles Diagramm. Jeder Schritt wird zu einem Baustein — schauen wir uns das genauer an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        allowTargetInteraction: false,
    },
    {
        id: 'flow-start-node',
        kind: 'info',
        title: 'Der Startknoten',
        description:
            'Hier beginnt jeder Kochablauf. Von diesem Knoten aus führen die Verbindungen zu deinen einzelnen Arbeitsschritten.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowStartNode,
        allowTargetInteraction: false,
    },
    {
        id: 'flow-end-node',
        kind: 'info',
        title: 'Das Ziel: Servieren',
        description:
            'Jeder Pfad in deinem Ablauf muss hier enden. Sobald alle Schritte zum Servieren führen, ist dein Ablauf vollständig.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowEndNode,
        allowTargetInteraction: false,
    },
    {
        id: 'flow-add-button',
        kind: 'event',
        title: 'Neuen Schritt hinzufügen',
        description:
            'Über den Plus-Button auf einer Verbindungslinie fügst du neue Arbeitsschritte ein. Klick ihn jetzt einmal an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowAddButton,
        eventKey: 'flowAddButtonClicked',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-palette',
        kind: 'state',
        title: 'Schrittart wählen',
        description:
            'Hier siehst du die verschiedenen Schrittarten — zum Beispiel Schneiden, Kochen oder Backen. Wähle jetzt einen aus und füge ihn hinzu.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowPalette,
        stateKey: 'flowNodeCreated',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-branch',
        kind: 'state',
        title: 'Parallele Schritte anlegen',
        description:
            'Manche Dinge laufen gleichzeitig — etwa Soße kochen und Nudeln abgießen. Mit dem Branch-Button an einem Knoten erzeugst du parallele Zweige. Probier es aus.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowBranchButton,
        stateKey: 'flowBranchCreated',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-connect',
        kind: 'info',
        title: 'Verbindungen ziehen',
        description:
            'Ziehe eine Verbindung vom rechten Punkt eines Knotens zum linken Punkt eines anderen. So legst du die Reihenfolge fest — und vergiss nicht, jeden Zweig zum Servieren zu verbinden.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        allowTargetInteraction: false,
    },
    {
        id: 'done',
        kind: 'info',
        title: 'Geschafft — viel Spaß beim Kochen!',
        description:
            'Du kennst jetzt alle wichtigen Funktionen. Bearbeite deinen Entwurf weiter, füge Bilder hinzu und veröffentliche ihn, wenn du zufrieden bist.',
        primaryLabel: 'Tutorial beenden',
    },
];
