import { RECIPE_TUTORIAL_TARGETS } from './shared';
import type { RecipeTutorialStep } from './types';

export const recipeTutorialSteps: RecipeTutorialStep[] = [
    {
        id: 'welcome',
        kind: 'info',
        title: 'Willkommen im Rezept-Ersteller',
        description:
            "In wenigen Schritten zeigen wir dir, wie du ein Rezept anlegst — von Titel und Zutaten bis zum Kochablauf. Los geht's!",
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
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientRow,
        accentTargetId: RECIPE_TUTORIAL_TARGETS.ingredientAmount,
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
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientRow,
        accentTargetId: RECIPE_TUTORIAL_TARGETS.ingredientOptional,
        allowTargetInteraction: false,
    },
    {
        id: 'ingredient-comment',
        kind: 'event',
        title: 'Zutat kommentieren',
        description:
            'Über die Sprechblase kannst du Hinweise wie „fein gewürfelt" oder „zimmerwarm" ergänzen. Klick sie jetzt einmal an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientRow,
        accentTargetId: RECIPE_TUTORIAL_TARGETS.ingredientComment,
        eventKey: 'ingredientCommentClicked',
        allowTargetInteraction: true,
    },
    {
        id: 'tags',
        kind: 'info',
        title: 'Tags vergeben',
        description:
            'Tags funktionieren wie Hashtags — sie helfen anderen, dein Rezept über Themen wie „schnell", „vegetarisch" oder „Party" zu finden. Wähle passende Tags aus, um die Sichtbarkeit zu erhöhen.',
        primaryLabel: 'Verstanden',
        targetId: RECIPE_TUTORIAL_TARGETS.tags,
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
        id: 'node-edit-panel',
        kind: 'event',
        title: 'Schritt bearbeiten',
        description:
            'Klick jetzt auf deinen neu erstellten Schritt — es öffnet sich ein Panel, in dem du Typ, Titel, Dauer und Beschreibung anpassen kannst.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        eventKey: 'nodeSelected',
        allowTargetInteraction: true,
        instantAdvance: true,
    },
    {
        id: 'node-edit-overview',
        kind: 'info',
        title: 'Das Bearbeitungs-Panel',
        description:
            'Hier kannst du Typ, Titel, Dauer und Beschreibung deines Schritts anpassen. Schauen wir uns die Beschreibung genauer an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.nodeEditPanel,
        allowTargetInteraction: false,
    },
    {
        id: 'node-description',
        kind: 'event',
        title: 'Zutat in der Beschreibung erwähnen',
        description:
            'Tippe eine Beschreibung wie „Die @Zwiebeln würfeln." — sobald du @ eingibst, erscheint eine Auswahl deiner Zutaten. Wähle einen Vorschlag mit Enter oder Klick aus, um ihn zu verknüpfen.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.nodeDescription,
        eventKey: 'descriptionMentionInserted',
        allowTargetInteraction: true,
        manualAdvance: true,
    },
    {
        id: 'ingredient-list-auto-added',
        kind: 'info',
        title: 'Automatisch hinzugefügt',
        description:
            'Zutaten, die du in Schritten per @ erwähnst, erscheinen automatisch in der Zutatenliste. Du musst sie nicht extra manuell hinzufügen.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.ingredientSearch,
        allowTargetInteraction: false,
    },
    {
        id: 'sidebar-collapse',
        kind: 'info',
        title: 'Mehr Platz schaffen',
        description:
            'Mit diesem Button klappst du die Seitenleiste ein. So hat der Ablauf-Editor mehr Platz und du kannst dein Diagramm übersichtlicher bearbeiten.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.sidebarCollapse,
        allowTargetInteraction: false,
    },
    {
        id: 'flow-branch',
        kind: 'event',
        title: 'Parallele Schritte anlegen',
        description:
            'Manche Dinge laufen gleichzeitig — etwa Soße kochen und Nudeln abgießen. Mit dem Branch-Button an einem Knoten erzeugst du parallele Zweige. Klick ihn jetzt an.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowBranchButton,
        eventKey: 'branchButtonClicked',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-branch-palette',
        kind: 'state',
        title: 'Schrittart für den Zweig wählen',
        description:
            'Wähle eine Schrittart für den parallelen Zweig aus — genau wie beim ersten Schritt.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowPalette,
        stateKey: 'flowBranchCreated',
        allowTargetInteraction: true,
    },
    {
        id: 'flow-connect-intro',
        kind: 'info',
        title: 'So funktionieren Verbindungen',
        description:
            'Jeder Knoten hat kleine Punkte an den Seiten: links einen Eingang (●) und rechts einen Ausgang (●). Du verbindest zwei Knoten, indem du mit der Maus auf einen Ausgang klickst, die Taste gedrückt hältst und zum Eingang eines anderen Knotens ziehst. Es erscheint eine Linie — lass die Maustaste los, sobald du den Zielpunkt erreichst.',
        primaryLabel: 'Verstanden',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        allowTargetInteraction: false,
    },
    {
        id: 'flow-connect',
        kind: 'event',
        title: 'Jetzt bist du dran!',
        description:
            'Dein neuer Zweig ist noch nicht verbunden. Die orange pulsierenden Punkte zeigen dir, wo eine Verbindung fehlt. Ziehe jetzt von einem pulsierenden Ausgang (●) zu einem pulsierenden Eingang (●), um den Zweig mit dem Servieren-Knoten zu verbinden.',
        primaryLabel: 'Weiter',
        targetId: RECIPE_TUTORIAL_TARGETS.flowCanvas,
        eventKey: 'edgeConnected',
        allowTargetInteraction: true,
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
