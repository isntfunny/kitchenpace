export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export type StepType = "vorbereitung" | "kochen" | "backen" | "warten" | "wuerzen" | "zusammenfuehren" | "servieren";

export interface FlowStep {
  order: number;
  description: string;
  type: StepType;
  duration?: number;
  laneId: string;
  parallelWith?: number[];
}

interface FlowStepDefinition {
  id: string;
  description: string;
  type: StepType;
  duration?: number;
  laneId: string;
  parallelWithIds?: string[];
}

const buildFlowSteps = (definitions: FlowStepDefinition[]): FlowStep[] => {
  const idToOrder = new Map<string, number>();

  definitions.forEach((def, index) => {
    idToOrder.set(def.id, index + 1);
  });

  return definitions.map((def, index) => ({
    order: index + 1,
    description: def.description,
    type: def.type,
    duration: def.duration,
    laneId: def.laneId,
    parallelWith: def.parallelWithIds
      ?.map((parallelId) => idToOrder.get(parallelId))
      .filter((value): value is number => typeof value === "number"),
  }));
};

export interface Lane {
  id: string;
  label: string;
  color: string;
  yPosition: number;
  isFinal?: boolean;
}

export const LANES: Lane[] = [
  { id: "vorbereitung", label: "Vorbereitung", color: "#e3f2fd", yPosition: 0 },
  { id: "kochen", label: "Kochen", color: "#fff3e0", yPosition: 300 },
  { id: "warten", label: "Warten", color: "#f3e5f5", yPosition: 600 },
  { id: "servieren", label: "Servieren", color: "#ffebee", yPosition: 900, isFinal: true },
];

export interface User {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  recipeCount: number;
  followerCount: number;
}

export interface Activity {
  id: string;
  user: {
    name: string;
    avatar: string;
  };
  action: string;
  timestamp: string;
  content?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  rating: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Einfach" | "Mittel" | "Schwer";
  ingredients: Ingredient[];
  flowSteps: FlowStep[];
  tags: string[];
  authorId: string;
}

export const users: Record<string, User> = {
  "user-1": {
    id: "user-1",
    name: "Maria Rossi",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    bio: "Passionierte Hobbyköchin aus Italien. Ich liebe es, traditionelle Familienrezepte zu teilen.",
    recipeCount: 47,
    followerCount: 1234,
  },
  "user-2": {
    id: "user-2",
    name: "Alex Koch",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "Koch mit Leidenschaft für mediterrane Küche. Gesund und lecker ist mein Motto!",
    recipeCount: 23,
    followerCount: 567,
  },
};

export const activities: Record<string, Activity[]> = {
  "pasta-aglio": [
    {
      id: "act-1",
      user: { name: "Lisa M.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
      action: "hat das Rezept ausprobiert",
      timestamp: "Vor 2 Stunden",
      content: "Super einfach und lecker! Meine Familie war begeistert.",
    },
    {
      id: "act-2",
      user: { name: "Thomas B.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
      action: "hat das Rezept gespeichert",
      timestamp: "Vor 5 Stunden",
    },
    {
      id: "act-3",
      user: { name: "Sarah K.", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80" },
      action: "hat ein Foto hochgeladen",
      timestamp: "Gestern",
    },
    {
      id: "act-4",
      user: { name: "Mike R.", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80" },
      action: "hat 5 Sterne gegeben",
      timestamp: "Vor 2 Tagen",
    },
  ],
  "greek-salad": [
    {
      id: "act-1",
      user: { name: "Anna S.", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&q=80" },
      action: "hat das Rezept ausprobiert",
      timestamp: "Vor 1 Stunde",
      content: "Perfekt für den Sommer! Sehr erfrischend.",
    },
    {
      id: "act-2",
      user: { name: "Peter W.", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&q=80" },
      action: "hat das Rezept geteilt",
      timestamp: "Vor 3 Stunden",
    },
  ],
};

export const recipes: Record<string, Recipe> = {
  "pasta-aglio": {
    id: "pasta-aglio",
    title: "Pasta Aglio e Olio",
    description: "Ein klassisches italienisches Gericht mit Knoblauch, Olivenöl und Chili. Schnell, einfach und unglaublich lecker.",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80",
    category: "Hauptgericht",
    rating: 4.8,
    prepTime: 5,
    cookTime: 10,
    servings: 2,
    difficulty: "Einfach",
    authorId: "user-1",
    ingredients: [
      { name: "Spaghetti", amount: 200, unit: "g" },
      { name: "Knoblauchzehen", amount: 4, unit: "Stück" },
      { name: "Olivenöl", amount: 60, unit: "ml" },
      { name: "Chiliflocken", amount: 0.5, unit: "TL" },
      { name: "Petersilie", amount: 2, unit: "EL" },
      { name: "Parmesan", amount: 30, unit: "g" },
      { name: "Salz", amount: 1, unit: "Prise" },
    ],
    flowSteps: buildFlowSteps([
      { id: "wasser", description: "Wasser aufsetzen", type: "kochen", duration: 5, laneId: "kochen" },
      {
        id: "knoblauch",
        description: "Knoblauch schneiden",
        type: "vorbereitung",
        duration: 2,
        laneId: "vorbereitung",
        parallelWithIds: ["wasser"],
      },
      { id: "nudeln", description: "Spaghetti kochen", type: "kochen", duration: 8, laneId: "kochen" },
      {
        id: "oel",
        description: "Öl erhitzen",
        type: "kochen",
        duration: 1,
        laneId: "kochen",
        parallelWithIds: ["nudeln"],
      },
      { id: "anbraten", description: "Knoblauch & Chili anbraten", type: "kochen", duration: 2, laneId: "kochen" },
      { id: "mischen", description: "Nudeln abgießen & mischen", type: "zusammenfuehren", duration: 1, laneId: "kochen" },
      { id: "ziehen", description: "Kurz ziehen lassen", type: "warten", duration: 1, laneId: "warten" },
      { id: "servieren", description: "Servieren", type: "servieren", duration: 1, laneId: "servieren" },
    ]),
    tags: ["Italienisch", "Schnell", "Vegetarisch"],
  },
  "greek-salad": {
    id: "greek-salad",
    title: "Griechischer Salat",
    description: "Frischer mediterraner Salat mit Tomaten, Gurken, Oliven und Feta.",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
    category: "Beilage",
    rating: 4.7,
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    difficulty: "Einfach",
    authorId: "user-2",
    ingredients: [
      { name: "Tomaten", amount: 4, unit: "Stück" },
      { name: "Gurke", amount: 1, unit: "Stück" },
      { name: "Rote Zwiebel", amount: 1, unit: "Stück" },
      { name: "Feta", amount: 200, unit: "g" },
      { name: "Schwarze Oliven", amount: 100, unit: "g" },
      { name: "Olivenöl", amount: 3, unit: "EL" },
      { name: "Oregano", amount: 1, unit: "TL" },
    ],
    flowSteps: buildFlowSteps([
      { id: "tomaten", description: "Tomaten schneiden", type: "vorbereitung", duration: 3, laneId: "vorbereitung" },
      {
        id: "gurken",
        description: "Gurke & Zwiebel schneiden",
        type: "vorbereitung",
        duration: 3,
        laneId: "vorbereitung",
        parallelWithIds: ["tomaten"],
      },
      { id: "mixen", description: "Gemüse mischen", type: "zusammenfuehren", duration: 2, laneId: "vorbereitung" },
      { id: "feta", description: "Feta schneiden", type: "vorbereitung", duration: 1, laneId: "vorbereitung" },
      { id: "alles", description: "Alles zusammenführen", type: "zusammenfuehren", duration: 2, laneId: "vorbereitung" },
      { id: "servieren-greek", description: "Servieren", type: "servieren", duration: 1, laneId: "servieren" },
    ]),
    tags: ["Mediterran", "Gesund", "Vegetarisch"],
  },
  "parallel-duck": {
    id: "parallel-duck",
    title: "Duck Flow Demo",
    description: "Mocked cooking workflow mit drei parallelen Vorbereitungen, die in einem Schlussschritt zusammenlaufen.",
    image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80",
    category: "Hauptgericht",
    rating: 4.9,
    prepTime: 20,
    cookTime: 40,
    servings: 2,
    difficulty: "Mittel",
    authorId: "user-2",
    ingredients: [
      { name: "Entenbrust", amount: 2, unit: "Stück" },
      { name: "Spätzle", amount: 250, unit: "g" },
      { name: "Schalotten", amount: 4, unit: "Stück" },
      { name: "Rotwein", amount: 100, unit: "ml" },
    ],
    flowSteps: buildFlowSteps([
      { id: "start", description: "Start: Alle Zutaten bereitlegen", type: "vorbereitung", duration: 5, laneId: "vorbereitung" },
      {
        id: "ente",
        description: "Ente einschneiden und würzen",
        type: "vorbereitung",
        duration: 5,
        laneId: "vorbereitung",
        parallelWithIds: ["start"],
      },
      {
        id: "spaetzle-teig",
        description: "Spätzleteig verrühren",
        type: "vorbereitung",
        duration: 10,
        laneId: "vorbereitung",
        parallelWithIds: ["start"],
      },
      {
        id: "schalotten",
        description: "Schalotten würfeln",
        type: "vorbereitung",
        duration: 3,
        laneId: "vorbereitung",
        parallelWithIds: ["start"],
      },
      { id: "anschwitzen", description: "Schalotten anschwitzen", type: "kochen", duration: 5, laneId: "kochen" },
      { id: "teig-ruhen", description: "Teig ruhen lassen", type: "warten", duration: 15, laneId: "warten" },
      { id: "wasser", description: "Wasser mit Salz zum Kochen bringen", type: "kochen", duration: 10, laneId: "kochen" },
      { id: "spaetzle-kochen", description: "Spätzle kochen", type: "kochen", duration: 8, laneId: "kochen" },
      { id: "fond", description: "Rotwein ablöschen & Fond reduzieren", type: "kochen", duration: 10, laneId: "kochen" },
      {
        id: "zusammen",
        description: "Alle Komponenten zusammenführen",
        type: "zusammenfuehren",
        duration: 4,
        laneId: "kochen",
        parallelWithIds: ["anschwitzen", "teig-ruhen", "wasser", "spaetzle-kochen", "fond"],
      },
      { id: "servieren-duck", description: "Servieren", type: "servieren", duration: 2, laneId: "servieren" },
    ]),
    tags: ["Mock", "Parallele Schritte", "Demo"],
  },
};

export const getRecipeById = (id: string) => recipes[id];
export const getAuthorById = (id: string) => users[id];
export const getActivitiesForRecipe = (id: string) => activities[id] ?? [];
