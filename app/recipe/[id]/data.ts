export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export type NodeType = "prep" | "cook" | "wait" | "season" | "combine" | "serve";

export interface FlowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  duration?: number;
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface RecipeFlow {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

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
  flow: RecipeFlow;
  tags: string[];
  authorId: string;
}

export const users: Record<string, User> = {
  "user-1": {
    id: "user-1",
    name: "Maria Rossi",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    bio: "Passionierte Hobbyköchin aus Italien.",
    recipeCount: 47,
    followerCount: 1234,
  },
  "user-2": {
    id: "user-2",
    name: "Alex Koch",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    bio: "Koch mit Leidenschaft für mediterrane Küche.",
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
      content: "Super einfach und lecker!",
    },
  ],
  "entenbrust": [],
};

export const recipes: Record<string, Recipe> = {
  "pasta-aglio": {
    id: "pasta-aglio",
    title: "Pasta Aglio e Olio",
    description: "Ein klassisches italienisches Gericht mit Knoblauch, Olivenöl und Chili.",
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
    ],
    flow: {
      nodes: [
        { id: "start", type: "prep", label: "Start", description: "Wasser aufsetzen, Knoblauch schneiden", position: { x: 140, y: 0 } },
        { id: "boil-water", type: "cook", label: "Wasser kochen", description: "Salzwasser zum Kochen bringen", duration: 5, position: { x: 0, y: 150 } },
        { id: "cook-pasta", type: "cook", label: "Pasta kochen", description: "Spaghetti al dente kochen", duration: 8, position: { x: 0, y: 300 } },
        { id: "heat-oil", type: "cook", label: "Öl erhitzen", description: "Olivenöl in Pfanne erhitzen", duration: 1, position: { x: 280, y: 150 } },
        { id: "fry-garlic", type: "cook", label: "Knoblauch anbraten", description: "Knoblauch und Chili goldbraun braten", duration: 2, position: { x: 280, y: 300 } },
        { id: "combine", type: "combine", label: "Vermengen", description: "Pasta mit Knoblauchöl mischen", position: { x: 140, y: 450 } },
        { id: "serve", type: "serve", label: "Servieren", description: "Mit Petersilie und Parmesan servieren", position: { x: 140, y: 600 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "boil-water" },
        { id: "e2", source: "start", target: "heat-oil" },
        { id: "e3", source: "boil-water", target: "cook-pasta" },
        { id: "e4", source: "heat-oil", target: "fry-garlic" },
        { id: "e5", source: "cook-pasta", target: "combine" },
        { id: "e6", source: "fry-garlic", target: "combine" },
        { id: "e7", source: "combine", target: "serve" },
      ],
    },
    tags: ["Italienisch", "Schnell", "Vegetarisch"],
  },
  "entenbrust": {
    id: "entenbrust",
    title: "Entenbrust mit Spätzle und Soße",
    description: "Klassisches deutsches Gericht: Rosa gebratene Entenbrust mit hausgemachten Spätzle und einer reichhaltigen Rotweinsoße.",
    image: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=80",
    category: "Hauptgericht",
    rating: 4.9,
    prepTime: 20,
    cookTime: 55,
    servings: 4,
    difficulty: "Schwer",
    authorId: "user-2",
    ingredients: [
      { name: "Entenbrust", amount: 800, unit: "g" },
      { name: "Mehl", amount: 400, unit: "g" },
      { name: "Eier", amount: 4, unit: "Stück" },
      { name: "Rotwein", amount: 250, unit: "ml" },
      { name: "Entenfond", amount: 400, unit: "ml" },
      { name: "Schalotten", amount: 3, unit: "Stück" },
      { name: "Butter", amount: 50, unit: "g" },
    ],
    flow: {
      nodes: [
        { id: "start", type: "prep", label: "Start", description: "Alle Zutaten bereitstellen, Entenbrust aus dem Kühlschrank nehmen", position: { x: 280, y: 0 } },
        { id: "score-duck", type: "prep", label: "Ente einschneiden", description: "Haut rautenförmig einschneiden, salzen", duration: 5, position: { x: 0, y: 150 } },
        { id: "sear-duck", type: "cook", label: "Ente anbraten", description: "Hautseite nach unten in kalter Pfanne, Fett auslassen", duration: 15, position: { x: 0, y: 320 } },
        { id: "rest-duck", type: "wait", label: "Ente ruhen", description: "Bei 80°C im Ofen ruhen lassen", duration: 10, position: { x: 0, y: 490 } },
        { id: "slice-duck", type: "prep", label: "Ente aufschneiden", description: "In schräge Scheiben schneiden", duration: 2, position: { x: 0, y: 660 } },
        { id: "make-batter", type: "prep", label: "Spätzleteig", description: "Mehl, Eier, Wasser, Salz verrühren", duration: 10, position: { x: 280, y: 150 } },
        { id: "rest-batter", type: "wait", label: "Teig ruhen", description: "15 Minuten quellen lassen", duration: 15, position: { x: 280, y: 320 } },
        { id: "boil-water", type: "cook", label: "Wasser kochen", description: "Salzwasser zum Kochen bringen", duration: 10, position: { x: 280, y: 490 } },
        { id: "cook-spaetzle", type: "cook", label: "Spätzle kochen", description: "Durch Spätzlehobel ins Wasser", duration: 8, position: { x: 280, y: 660 } },
        { id: "saute-spaetzle", type: "cook", label: "Spätzle schwenken", description: "In Butter goldbraun schwenken", duration: 5, position: { x: 280, y: 830 } },
        { id: "prep-shallots", type: "prep", label: "Schalotten", description: "Schalotten fein würfeln", duration: 3, position: { x: 560, y: 150 } },
        { id: "saute-shallots", type: "cook", label: "Schalotten dünsten", description: "Im Entenfett glasig dünsten", duration: 5, position: { x: 560, y: 320 } },
        { id: "deglaze", type: "cook", label: "Ablöschen", description: "Mit Rotwein ablöschen, reduzieren", duration: 10, position: { x: 560, y: 490 } },
        { id: "add-stock", type: "cook", label: "Fond zugeben", description: "Entenfond und Thymian köcheln", duration: 15, position: { x: 560, y: 660 } },
        { id: "finish-sauce", type: "season", label: "Soße abschmecken", description: "Butter einrühren, würzen", duration: 3, position: { x: 560, y: 830 } },
        { id: "combine", type: "combine", label: "Anrichten", description: "Spätzle, Entenbrust auf Teller", position: { x: 280, y: 1000 } },
        { id: "serve", type: "serve", label: "Servieren", description: "Mit Soße nappieren, servieren", position: { x: 280, y: 1170 } },
      ],
      edges: [
        { id: "e1", source: "start", target: "score-duck" },
        { id: "e2", source: "start", target: "make-batter" },
        { id: "e3", source: "start", target: "prep-shallots" },
        { id: "e4", source: "score-duck", target: "sear-duck" },
        { id: "e5", source: "sear-duck", target: "rest-duck" },
        { id: "e6", source: "rest-duck", target: "slice-duck" },
        { id: "e7", source: "slice-duck", target: "combine" },
        { id: "e8", source: "make-batter", target: "rest-batter" },
        { id: "e9", source: "rest-batter", target: "boil-water" },
        { id: "e10", source: "boil-water", target: "cook-spaetzle" },
        { id: "e11", source: "cook-spaetzle", target: "saute-spaetzle" },
        { id: "e12", source: "saute-spaetzle", target: "combine" },
        { id: "e13", source: "prep-shallots", target: "saute-shallots" },
        { id: "e14", source: "saute-shallots", target: "deglaze" },
        { id: "e15", source: "deglaze", target: "add-stock" },
        { id: "e16", source: "add-stock", target: "finish-sauce" },
        { id: "e17", source: "finish-sauce", target: "combine" },
        { id: "e18", source: "combine", target: "serve" },
      ],
    },
    tags: ["Deutsch", "Festlich", "Geflügel"],
  },
};

export const getRecipeById = (id: string) => recipes[id];
export const getAuthorById = (id: string) => users[id];
export const getActivitiesForRecipe = (id: string) => activities[id] ?? [];
