export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Step {
  order: number;
  description: string;
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
  steps: Step[];
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
    steps: [
      { order: 1, description: "Wasser in einem großen Topf zum Kochen bringen und salzen." },
      { order: 2, description: "Spaghetti nach Packungsanweisung al dente kochen." },
      { order: 3, description: "Währenddessen Knoblauch in dünne Scheiben schneiden." },
      { order: 4, description: "Olivenöl in einer großen Pfanne erhitzen, Knoblauch und Chili hinzufügen." },
      { order: 5, description: "Bei mittlerer Hitze goldbraun anbraten (nicht verbrennen lassen)." },
      { order: 6, description: "Gekochte Pasta mit etwas Nudelwasser zur Pfanne geben und gut vermengen." },
      { order: 7, description: "Mit gehackter Petersilie und Parmesan servieren." },
    ],
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
    steps: [
      { order: 1, description: "Tomaten in große Würfel schneiden." },
      { order: 2, description: "Gurke in Scheiben, Zwiebel in Ringe schneiden." },
      { order: 3, description: "Alle Gemüse in eine große Schüssel geben." },
      { order: 4, description: "Feta in Würfel schneiden und darüber verteilen." },
      { order: 5, description: "Oliven hinzufügen und alles vermischen." },
      { order: 6, description: "Mit Olivenöl und Oregano dressen." },
    ],
    tags: ["Mediterran", "Gesund", "Vegetarisch"],
  },
};

export const getRecipeById = (id: string) => recipes[id];
export const getAuthorById = (id: string) => users[id];
export const getActivitiesForRecipe = (id: string) => activities[id] ?? [];
