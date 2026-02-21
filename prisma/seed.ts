import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
    PrismaClient,
    Difficulty,
    MealType,
    MealStatus,
    ShoppingCategory,
    NotificationType,
    ActivityType,
} from '@prisma/client';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 30000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Helper functions for ingredient data
function getDefaultUnits(unit: string): string[] {
    const unitMap: Record<string, string[]> = {
        g: ['g', 'kg', 'oz', 'lb'],
        ml: ['ml', 'l', 'cups', 'tbsp', 'tsp'],
        whole: ['whole', 'Stück'],
        tbsp: ['tbsp', 'ml', 'tsp'],
        tsp: ['tsp', 'ml', 'tbsp'],
        bunch: ['bunch', 'Stück'],
        cloves: ['cloves', 'Stück'],
        Zweige: ['Zweige', 'Stück'],
    };
    return unitMap[unit] || [unit, 'g', 'kg'];
}

function getIngredientCategory(name: string): ShoppingCategory {
    const nameLower = name.toLowerCase();
    if (
        nameLower.includes('chicken') ||
        nameLower.includes('beef') ||
        nameLower.includes('ente') ||
        nameLower.includes('pancetta')
    ) {
        return ShoppingCategory.FLEISCH;
    }
    if (nameLower.includes('fish') || nameLower.includes('lachs') || nameLower.includes('fisch')) {
        return ShoppingCategory.FISCH;
    }
    if (
        nameLower.includes('broccoli') ||
        nameLower.includes('pepper') ||
        nameLower.includes('tomato') ||
        nameLower.includes('onion') ||
        nameLower.includes('basil') ||
        nameLower.includes('gemüse')
    ) {
        return ShoppingCategory.GEMUESE;
    }
    if (
        nameLower.includes('apple') ||
        nameLower.includes('banana') ||
        nameLower.includes('obst') ||
        nameLower.includes('beer')
    ) {
        return ShoppingCategory.OBST;
    }
    if (
        nameLower.includes('milk') ||
        nameLower.includes('cheese') ||
        nameLower.includes('egg') ||
        nameLower.includes('butter') ||
        nameLower.includes(' parmesan') ||
        nameLower.includes('mozzarella')
    ) {
        return ShoppingCategory.MILCHPRODUKTE;
    }
    if (
        nameLower.includes('salt') ||
        nameLower.includes('pepper') ||
        nameLower.includes('oregano') ||
        nameLower.includes('thyme') ||
        nameLower.includes('ginger') ||
        nameLower.includes('soy')
    ) {
        return ShoppingCategory.GEWURZE;
    }
    if (nameLower.includes('flour') || nameLower.includes('yeast')) {
        return ShoppingCategory.BACKEN;
    }
    return ShoppingCategory.SONSTIGES;
}

// Flow data types
interface FlowNode {
    id: string;
    type: string;
    label: string;
    description: string;
    duration?: number;
    position: { x: number; y: number };
}

interface FlowEdge {
    id: string;
    source: string;
    target: string;
}

interface Ingredient {
    id: string;
    name: string;
    amount: string;
    unit: string;
}

interface RecipeData {
    id: string;
    title: string;
    description: string;
    servings: number;
    totalTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    ingredients: Ingredient[];
    nodes: FlowNode[];
    edges: FlowEdge[];
    createdAt: Date;
}

const sampleRecipes: RecipeData[] = [
    {
        id: '1',
        title: 'Classic Pasta Carbonara',
        description: 'A rich and creamy Italian pasta dish with crispy pancetta and parmesan.',
        servings: 4,
        totalTime: 30,
        difficulty: 'medium',
        ingredients: [
            { id: '1', name: 'Spaghetti', amount: '400', unit: 'g' },
            { id: '2', name: 'Pancetta', amount: '200', unit: 'g' },
            { id: '3', name: 'Eggs', amount: '4', unit: 'whole' },
            { id: '4', name: 'Parmesan', amount: '100', unit: 'g' },
            { id: '5', name: 'Black pepper', amount: '2', unit: 'tsp' },
            { id: '6', name: 'Salt', amount: '1', unit: 'tbsp' },
        ],
        nodes: [
            {
                id: 'start',
                type: 'prep',
                label: 'Start',
                description: 'Gather all ingredients',
                position: { x: 250, y: 0 },
            },
            {
                id: 'boil-water',
                type: 'cook',
                label: 'Boil Water',
                description: 'Bring large pot of salted water to boil',
                duration: 10,
                position: { x: 100, y: 120 },
            },
            {
                id: 'prep-eggs',
                type: 'prep',
                label: 'Mix Eggs',
                description: 'Whisk eggs with grated parmesan and pepper',
                duration: 5,
                position: { x: 400, y: 120 },
            },
            {
                id: 'cook-pancetta',
                type: 'cook',
                label: 'Cook Pancetta',
                description: 'Fry pancetta until crispy',
                duration: 8,
                position: { x: 400, y: 250 },
            },
            {
                id: 'cook-pasta',
                type: 'cook',
                label: 'Cook Pasta',
                description: 'Cook spaghetti until al dente',
                duration: 10,
                position: { x: 100, y: 250 },
            },
            {
                id: 'combine',
                type: 'combine',
                label: 'Combine',
                description: 'Toss hot pasta with egg mixture and pancetta off heat',
                position: { x: 250, y: 380 },
            },
            {
                id: 'season',
                type: 'season',
                label: 'Season',
                description: 'Add extra pepper and parmesan to taste',
                position: { x: 250, y: 500 },
            },
            {
                id: 'serve',
                type: 'serve',
                label: 'Serve',
                description: 'Serve immediately while hot',
                position: { x: 250, y: 620 },
            },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'boil-water' },
            { id: 'e2', source: 'start', target: 'prep-eggs' },
            { id: 'e3', source: 'prep-eggs', target: 'cook-pancetta' },
            { id: 'e4', source: 'boil-water', target: 'cook-pasta' },
            { id: 'e5', source: 'cook-pasta', target: 'combine' },
            { id: 'e6', source: 'cook-pancetta', target: 'combine' },
            { id: 'e7', source: 'combine', target: 'season' },
            { id: 'e8', source: 'season', target: 'serve' },
        ],
        createdAt: new Date('2024-01-15'),
    },
    {
        id: '2',
        title: 'Beef Stir Fry',
        description: 'Quick and flavorful Asian-inspired beef stir fry with vegetables.',
        servings: 4,
        totalTime: 25,
        difficulty: 'easy',
        ingredients: [
            { id: '1', name: 'Beef sirloin', amount: '500', unit: 'g' },
            { id: '2', name: 'Broccoli', amount: '300', unit: 'g' },
            { id: '3', name: 'Bell peppers', amount: '2', unit: 'whole' },
            { id: '4', name: 'Soy sauce', amount: '4', unit: 'tbsp' },
            { id: '5', name: 'Garlic', amount: '4', unit: 'cloves' },
            { id: '6', name: 'Ginger', amount: '2', unit: 'tbsp' },
            { id: '7', name: 'Sesame oil', amount: '2', unit: 'tbsp' },
        ],
        nodes: [
            {
                id: 'start',
                type: 'prep',
                label: 'Start',
                description: 'Gather ingredients',
                position: { x: 250, y: 0 },
            },
            {
                id: 'slice-beef',
                type: 'prep',
                label: 'Slice Beef',
                description: 'Cut beef into thin strips',
                duration: 5,
                position: { x: 100, y: 120 },
            },
            {
                id: 'prep-veggies',
                type: 'prep',
                label: 'Prep Veggies',
                description: 'Cut broccoli and peppers into bite-size pieces',
                duration: 5,
                position: { x: 400, y: 120 },
            },
            {
                id: 'make-sauce',
                type: 'prep',
                label: 'Make Sauce',
                description: 'Mix soy sauce, garlic, ginger',
                duration: 3,
                position: { x: 250, y: 120 },
            },
            {
                id: 'sear-beef',
                type: 'cook',
                label: 'Sear Beef',
                description: 'Cook beef on high heat until browned',
                duration: 4,
                position: { x: 100, y: 250 },
            },
            {
                id: 'cook-veggies',
                type: 'cook',
                label: 'Cook Veggies',
                description: 'Stir fry vegetables until tender-crisp',
                duration: 5,
                position: { x: 400, y: 250 },
            },
            {
                id: 'combine',
                type: 'combine',
                label: 'Combine All',
                description: 'Add beef back to wok with vegetables',
                position: { x: 250, y: 380 },
            },
            {
                id: 'add-sauce',
                type: 'season',
                label: 'Add Sauce',
                description: 'Pour sauce over and toss to coat',
                position: { x: 250, y: 500 },
            },
            {
                id: 'serve',
                type: 'serve',
                label: 'Serve',
                description: 'Serve hot over rice',
                position: { x: 250, y: 620 },
            },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'slice-beef' },
            { id: 'e2', source: 'start', target: 'prep-veggies' },
            { id: 'e3', source: 'start', target: 'make-sauce' },
            { id: 'e4', source: 'slice-beef', target: 'sear-beef' },
            { id: 'e5', source: 'prep-veggies', target: 'cook-veggies' },
            { id: 'e6', source: 'sear-beef', target: 'combine' },
            { id: 'e7', source: 'cook-veggies', target: 'combine' },
            { id: 'e8', source: 'make-sauce', target: 'add-sauce' },
            { id: 'e9', source: 'combine', target: 'add-sauce' },
            { id: 'e10', source: 'add-sauce', target: 'serve' },
        ],
        createdAt: new Date('2024-02-20'),
    },
    {
        id: '3',
        title: 'Homemade Pizza',
        description: 'Classic margherita pizza with a crispy crust and fresh toppings.',
        servings: 2,
        totalTime: 90,
        difficulty: 'hard',
        ingredients: [
            { id: '1', name: 'Pizza flour', amount: '500', unit: 'g' },
            { id: '2', name: 'Yeast', amount: '7', unit: 'g' },
            { id: '3', name: 'Olive oil', amount: '3', unit: 'tbsp' },
            { id: '4', name: 'San Marzano tomatoes', amount: '400', unit: 'g' },
            { id: '5', name: 'Fresh mozzarella', amount: '250', unit: 'g' },
            { id: '6', name: 'Fresh basil', amount: '1', unit: 'bunch' },
        ],
        nodes: [
            {
                id: 'start',
                type: 'prep',
                label: 'Start',
                description: 'Gather all ingredients',
                position: { x: 250, y: 0 },
            },
            {
                id: 'make-dough',
                type: 'prep',
                label: 'Make Dough',
                description: 'Mix flour, yeast, water, and oil',
                duration: 10,
                position: { x: 100, y: 120 },
            },
            {
                id: 'make-sauce',
                type: 'prep',
                label: 'Make Sauce',
                description: 'Blend tomatoes with salt and oregano',
                duration: 5,
                position: { x: 400, y: 120 },
            },
            {
                id: 'rise-dough',
                type: 'wait',
                label: 'Rise Dough',
                description: 'Let dough rise in warm place',
                duration: 60,
                position: { x: 100, y: 250 },
            },
            {
                id: 'prep-toppings',
                type: 'prep',
                label: 'Prep Toppings',
                description: 'Slice mozzarella, wash basil',
                duration: 5,
                position: { x: 400, y: 250 },
            },
            {
                id: 'shape-dough',
                type: 'prep',
                label: 'Shape Dough',
                description: 'Stretch dough into circular shape',
                duration: 5,
                position: { x: 100, y: 380 },
            },
            {
                id: 'preheat',
                type: 'cook',
                label: 'Preheat Oven',
                description: 'Heat oven to 250°C with pizza stone',
                duration: 30,
                position: { x: 250, y: 250 },
            },
            {
                id: 'assemble',
                type: 'combine',
                label: 'Assemble',
                description: 'Add sauce and toppings to dough',
                position: { x: 250, y: 500 },
            },
            {
                id: 'bake',
                type: 'cook',
                label: 'Bake',
                description: 'Bake until crust is golden',
                duration: 12,
                position: { x: 250, y: 620 },
            },
            {
                id: 'garnish',
                type: 'season',
                label: 'Garnish',
                description: 'Add fresh basil and olive oil drizzle',
                position: { x: 250, y: 740 },
            },
            {
                id: 'serve',
                type: 'serve',
                label: 'Serve',
                description: 'Slice and serve hot',
                position: { x: 250, y: 860 },
            },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'make-dough' },
            { id: 'e2', source: 'start', target: 'make-sauce' },
            { id: 'e3', source: 'make-dough', target: 'rise-dough' },
            { id: 'e4', source: 'make-sauce', target: 'prep-toppings' },
            { id: 'e5', source: 'rise-dough', target: 'shape-dough' },
            { id: 'e6', source: 'start', target: 'preheat' },
            { id: 'e7', source: 'shape-dough', target: 'assemble' },
            { id: 'e8', source: 'prep-toppings', target: 'assemble' },
            { id: 'e9', source: 'preheat', target: 'bake' },
            { id: 'e10', source: 'assemble', target: 'bake' },
            { id: 'e11', source: 'bake', target: 'garnish' },
            { id: 'e12', source: 'garnish', target: 'serve' },
        ],
        createdAt: new Date('2024-03-10'),
    },
    {
        id: '4',
        title: 'Entenbrust mit Spätzle und Soße',
        description:
            'Klassisches deutsches Gericht: Rosa gebratene Entenbrust mit hausgemachten Spätzle und einer reichhaltigen Rotweinsoße.',
        servings: 4,
        totalTime: 75,
        difficulty: 'hard',
        ingredients: [
            { id: '1', name: 'Entenbrust', amount: '800', unit: 'g' },
            { id: '2', name: 'Mehl', amount: '400', unit: 'g' },
            { id: '3', name: 'Eier', amount: '4', unit: 'Stück' },
            { id: '4', name: 'Mineralwasser', amount: '150', unit: 'ml' },
            { id: '5', name: 'Rotwein', amount: '250', unit: 'ml' },
            { id: '6', name: 'Entenfond', amount: '400', unit: 'ml' },
            { id: '7', name: 'Schalotten', amount: '3', unit: 'Stück' },
            { id: '8', name: 'Butter', amount: '50', unit: 'g' },
            { id: '9', name: 'Thymian', amount: '4', unit: 'Zweige' },
            { id: '10', name: 'Salz & Pfeffer', amount: '', unit: 'nach Geschmack' },
        ],
        nodes: [
            {
                id: 'start',
                type: 'prep',
                label: 'Start',
                description: 'Alle Zutaten bereitstellen, Entenbrust aus dem Kühlschrank nehmen',
                position: { x: 280, y: 0 },
            },
            {
                id: 'score-duck',
                type: 'prep',
                label: 'Ente einschneiden',
                description: 'Haut rautenförmig einschneiden, salzen',
                duration: 5,
                position: { x: 0, y: 150 },
            },
            {
                id: 'sear-duck',
                type: 'cook',
                label: 'Ente anbraten',
                description: 'Hautseite nach unten in kalter Pfanne, Fett auslassen',
                duration: 15,
                position: { x: 0, y: 320 },
            },
            {
                id: 'rest-duck',
                type: 'wait',
                label: 'Ente ruhen',
                description: 'Bei 80°C im Ofen ruhen lassen',
                duration: 10,
                position: { x: 0, y: 490 },
            },
            {
                id: 'slice-duck',
                type: 'prep',
                label: 'Ente aufschneiden',
                description: 'In schräge Scheiben schneiden',
                duration: 2,
                position: { x: 0, y: 660 },
            },
            {
                id: 'make-batter',
                type: 'prep',
                label: 'Spätzleteig',
                description: 'Mehl, Eier, Wasser, Salz verrühren',
                duration: 10,
                position: { x: 280, y: 150 },
            },
            {
                id: 'rest-batter',
                type: 'wait',
                label: 'Teig ruhen',
                description: '15 Minuten quellen lassen',
                duration: 15,
                position: { x: 280, y: 320 },
            },
            {
                id: 'boil-water',
                type: 'cook',
                label: 'Wasser kochen',
                description: 'Salzwasser zum Kochen bringen',
                duration: 10,
                position: { x: 280, y: 490 },
            },
            {
                id: 'cook-spaetzle',
                type: 'cook',
                label: 'Spätzle kochen',
                description: 'Durch Spätzlehobel ins Wasser',
                duration: 8,
                position: { x: 280, y: 660 },
            },
            {
                id: 'saute-spaetzle',
                type: 'cook',
                label: 'Spätzle schwenken',
                description: 'In Butter goldbraun schwenken',
                duration: 5,
                position: { x: 280, y: 830 },
            },
            {
                id: 'prep-shallots',
                type: 'prep',
                label: 'Schalotten',
                description: 'Schalotten fein würfeln',
                duration: 3,
                position: { x: 560, y: 150 },
            },
            {
                id: 'saute-shallots',
                type: 'cook',
                label: 'Schalotten dünsten',
                description: 'Im Entenfett glasig dünsten',
                duration: 5,
                position: { x: 560, y: 320 },
            },
            {
                id: 'deglaze',
                type: 'cook',
                label: 'Ablöschen',
                description: 'Mit Rotwein ablöschen, reduzieren',
                duration: 10,
                position: { x: 560, y: 490 },
            },
            {
                id: 'add-stock',
                type: 'cook',
                label: 'Fond zugeben',
                description: 'Entenfond und Thymian köcheln',
                duration: 15,
                position: { x: 560, y: 660 },
            },
            {
                id: 'finish-sauce',
                type: 'season',
                label: 'Soße abschmecken',
                description: 'Butter einrühren, würzen',
                duration: 3,
                position: { x: 560, y: 830 },
            },
            {
                id: 'combine',
                type: 'combine',
                label: 'Anrichten',
                description: 'Spätzle, Entenbrust auf Teller',
                position: { x: 280, y: 1000 },
            },
            {
                id: 'serve',
                type: 'serve',
                label: 'Servieren',
                description: 'Mit Soße nappieren, servieren',
                position: { x: 280, y: 1170 },
            },
        ],
        edges: [
            { id: 'e1', source: 'start', target: 'score-duck' },
            { id: 'e2', source: 'start', target: 'make-batter' },
            { id: 'e3', source: 'start', target: 'prep-shallots' },
            { id: 'e4', source: 'score-duck', target: 'sear-duck' },
            { id: 'e5', source: 'sear-duck', target: 'rest-duck' },
            { id: 'e6', source: 'rest-duck', target: 'slice-duck' },
            { id: 'e7', source: 'slice-duck', target: 'combine' },
            { id: 'e8', source: 'make-batter', target: 'rest-batter' },
            { id: 'e9', source: 'rest-batter', target: 'boil-water' },
            { id: 'e10', source: 'boil-water', target: 'cook-spaetzle' },
            { id: 'e11', source: 'cook-spaetzle', target: 'saute-spaetzle' },
            { id: 'e12', source: 'saute-spaetzle', target: 'combine' },
            { id: 'e13', source: 'prep-shallots', target: 'saute-shallots' },
            { id: 'e14', source: 'saute-shallots', target: 'deglaze' },
            { id: 'e15', source: 'deglaze', target: 'add-stock' },
            { id: 'e16', source: 'add-stock', target: 'finish-sauce' },
            { id: 'e17', source: 'finish-sauce', target: 'combine' },
            { id: 'e18', source: 'combine', target: 'serve' },
        ],
        createdAt: new Date('2024-04-05'),
    },
];

async function main() {
    console.log('🌱 Starting seed...');

    // Create categories
    const categories = await Promise.all([
        prisma.category.upsert({
            where: { slug: 'hauptgericht' },
            update: {},
            create: {
                name: 'Hauptgericht',
                slug: 'hauptgericht',
                description: 'Hauptgerichte für Mittag- und Abendessen',
                color: '#e07b53',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'beilage' },
            update: {},
            create: {
                name: 'Beilage',
                slug: 'beilage',
                description: 'Beilagen und Ergänzungen zu Hauptgerichten',
                color: '#00b894',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'backen' },
            update: {},
            create: {
                name: 'Backen',
                slug: 'backen',
                description: 'Backrezepte für Kuchen, Brot und mehr',
                color: '#fd79a8',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'getraenk' },
            update: {},
            create: {
                name: 'Getränk',
                slug: 'getraenk',
                description: 'Heiße und kalte Getränke',
                color: '#74b9ff',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'dessert' },
            update: {},
            create: {
                name: 'Dessert',
                slug: 'dessert',
                description: 'Süße Nachspeisen',
                color: '#fdcb6e',
            },
        }),
        prisma.category.upsert({
            where: { slug: 'fruehstueck' },
            update: {},
            create: {
                name: 'Frühstück',
                slug: 'fruehstueck',
                description: 'Frühstücksrezepte',
                color: '#a29bfe',
            },
        }),
    ]);
    console.log('✅ Created categories');

    // Create tags
    const tags = await Promise.all([
        prisma.tag.upsert({
            where: { slug: 'italienisch' },
            update: {},
            create: { name: 'Italienisch', slug: 'italienisch' },
        }),
        prisma.tag.upsert({
            where: { slug: 'schnell' },
            update: {},
            create: { name: 'Schnell', slug: 'schnell' },
        }),
        prisma.tag.upsert({
            where: { slug: 'vegetarisch' },
            update: {},
            create: { name: 'Vegetarisch', slug: 'vegetarisch' },
        }),
        prisma.tag.upsert({
            where: { slug: 'deutsch' },
            update: {},
            create: { name: 'Deutsch', slug: 'deutsch' },
        }),
        prisma.tag.upsert({
            where: { slug: 'festlich' },
            update: {},
            create: { name: 'Festlich', slug: 'festlich' },
        }),
        prisma.tag.upsert({
            where: { slug: 'gefluegel' },
            update: {},
            create: { name: 'Geflügel', slug: 'gefluegel' },
        }),
        prisma.tag.upsert({
            where: { slug: 'asialtisch' },
            update: {},
            create: { name: 'Asiatisch', slug: 'asialtisch' },
        }),
        prisma.tag.upsert({
            where: { slug: 'pasta' },
            update: {},
            create: { name: 'Pasta', slug: 'pasta' },
        }),
        prisma.tag.upsert({
            where: { slug: 'pizza' },
            update: {},
            create: { name: 'Pizza', slug: 'pizza' },
        }),
        prisma.tag.upsert({
            where: { slug: 'einfach' },
            update: {},
            create: { name: 'Einfach', slug: 'einfach' },
        }),
    ]);
    console.log('✅ Created tags');

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 12);

    const user1 = await prisma.user.upsert({
        where: { email: 'maria@example.com' },
        update: {},
        create: {
            email: 'maria@example.com',
            name: 'Maria Rossi',
            hashedPassword,
            profile: {
                create: {
                    email: 'maria@example.com',
                    nickname: 'Maria Rossi',
                    bio: 'Passionierte Hobbyköchin aus Italien.',
                    followerCount: 1234,
                    recipeCount: 47,
                },
            },
        },
    });

    const user2 = await prisma.user.upsert({
        where: { email: 'alex@example.com' },
        update: {},
        create: {
            email: 'alex@example.com',
            name: 'Alex Koch',
            hashedPassword,
            profile: {
                create: {
                    email: 'alex@example.com',
                    nickname: 'Alex Koch',
                    bio: 'Koch mit Leidenschaft für mediterrane Küche.',
                    followerCount: 567,
                    recipeCount: 23,
                },
            },
        },
    });

    const user3 = await prisma.user.upsert({
        where: { email: 'chef@example.com' },
        update: {},
        create: {
            email: 'chef@example.com',
            name: 'KitchenPace Chef',
            hashedPassword,
            profile: {
                create: {
                    email: 'chef@example.com',
                    nickname: 'KitchenPace Chef',
                    bio: 'Offizieller KitchenPace Test-Account',
                    followerCount: 100,
                    recipeCount: 5,
                },
            },
        },
    });
    console.log('✅ Created users');

    // Create recipes
    const difficultyMap: Record<string, Difficulty> = {
        easy: Difficulty.EASY,
        medium: Difficulty.MEDIUM,
        hard: Difficulty.HARD,
    };

    for (const recipeData of sampleRecipes) {
        const categorySlug = recipeData.id === '3' ? 'backen' : 'hauptgericht';
        const category = categories.find((c) => c.slug === categorySlug);

        const recipe = await prisma.recipe.upsert({
            where: { id: recipeData.id },
            update: {},
            create: {
                id: recipeData.id,
                title: recipeData.title,
                slug: recipeData.title.toLowerCase().replace(/\s+/g, '-'),
                description: recipeData.description,
                servings: recipeData.servings,
                totalTime: recipeData.totalTime,
                difficulty: difficultyMap[recipeData.difficulty],
                rating: Math.random() * 2 + 3.5, // Random rating between 3.5 and 5.5
                ratingCount: Math.floor(Math.random() * 50) + 10,
                viewCount: Math.floor(Math.random() * 500) + 50,
                flowNodes: recipeData.nodes as any,
                flowEdges: recipeData.edges as any,
                authorId: recipeData.id === '4' ? user2.id : user1.id,
                categoryId: category?.id,
                createdAt: recipeData.createdAt,
            } as any,
        });

        // Create master ingredients and recipe-ingredient relations
        const createdIngredients: string[] = [];
        for (let i = 0; i < recipeData.ingredients.length; i++) {
            const ing = recipeData.ingredients[i];
            const slug = ing.name.toLowerCase().replace(/\s+/g, '-');

            // Determine units based on ingredient type
            const defaultUnits = getDefaultUnits(ing.unit);

            // Create or get master ingredient
            const masterIngredient = await prisma.ingredient.upsert({
                where: { slug },
                update: {},
                create: {
                    name: ing.name,
                    slug,
                    category: getIngredientCategory(ing.name),
                    units: defaultUnits,
                },
            });
            createdIngredients.push(masterIngredient.id);

            // Create recipe-ingredient relation
            await prisma.recipeIngredient.upsert({
                where: {
                    recipeId_ingredientId: {
                        recipeId: recipe.id,
                        ingredientId: masterIngredient.id,
                    },
                },
                update: {},
                create: {
                    recipeId: recipe.id,
                    ingredientId: masterIngredient.id,
                    amount: ing.amount,
                    unit: ing.unit,
                    notes: null,
                    position: i,
                    isOptional: false,
                },
            });
        }

        // Add tags to recipes
        if (recipeData.id === '1') {
            await prisma.recipeTag.createMany({
                data: [
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'italienisch')!.id },
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'pasta')!.id },
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'schnell')!.id },
                ],
                skipDuplicates: true,
            });
        } else if (recipeData.id === '2') {
            await prisma.recipeTag.createMany({
                data: [
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'asialtisch')!.id },
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'einfach')!.id },
                ],
                skipDuplicates: true,
            });
        } else if (recipeData.id === '3') {
            await prisma.recipeTag.createMany({
                data: [
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'italienisch')!.id },
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'pizza')!.id },
                ],
                skipDuplicates: true,
            });
        } else if (recipeData.id === '4') {
            await prisma.recipeTag.createMany({
                data: [
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'deutsch')!.id },
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'festlich')!.id },
                    { recipeId: recipe.id, tagId: tags.find((t) => t.slug === 'gefluegel')!.id },
                ],
                skipDuplicates: true,
            });
        }
    }
    console.log('✅ Created recipes with ingredients and tags');

    // Create some follow relationships
    await prisma.follow.createMany({
        data: [
            { followerId: user1.id, followingId: user2.id },
            { followerId: user2.id, followingId: user1.id },
            { followerId: user3.id, followingId: user1.id },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Created follow relationships');

    // Create some ratings
    await prisma.userRating.createMany({
        data: [
            { recipeId: '1', userId: user2.id, rating: 5 },
            { recipeId: '2', userId: user2.id, rating: 4 },
            { recipeId: '3', userId: user2.id, rating: 5 },
            { recipeId: '4', userId: user1.id, rating: 5 },
            { recipeId: '1', userId: user3.id, rating: 4 },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Created ratings');

    // Create some favorites
    await prisma.favorite.createMany({
        data: [
            { recipeId: '2', userId: user1.id },
            { recipeId: '3', userId: user1.id },
            { recipeId: '4', userId: user1.id },
            { recipeId: '1', userId: user2.id },
        ],
        skipDuplicates: true,
    });
    console.log('✅ Created favorites');

    // Create a meal plan
    const mealPlan = await prisma.mealPlan.create({
        data: {
            userId: user1.id,
            name: 'Wochenplan KW 12',
            startDate: new Date('2024-03-18'),
            endDate: new Date('2024-03-24'),
            meals: {
                create: [
                    {
                        recipeId: '1',
                        date: new Date('2024-03-18'),
                        mealType: MealType.DINNER,
                        status: MealStatus.PLANNED,
                        servings: 4,
                    },
                    {
                        recipeId: '2',
                        date: new Date('2024-03-19'),
                        mealType: MealType.DINNER,
                        status: MealStatus.PLANNED,
                        servings: 4,
                    },
                    {
                        recipeId: '4',
                        date: new Date('2024-03-20'),
                        mealType: MealType.DINNER,
                        status: MealStatus.PLANNED,
                        servings: 4,
                    },
                ],
            },
        },
    });
    console.log('✅ Created meal plan');

    // Create a shopping list
    await prisma.shoppingList.create({
        data: {
            userId: user1.id,
            name: 'Einkaufsliste KW 12',
            mealPlanId: mealPlan.id,
            items: {
                create: [
                    {
                        name: 'Spaghetti',
                        amount: '400',
                        unit: 'g',
                        category: ShoppingCategory.SONSTIGES,
                    },
                    {
                        name: 'Pancetta',
                        amount: '200',
                        unit: 'g',
                        category: ShoppingCategory.FLEISCH,
                    },
                    {
                        name: 'Eier',
                        amount: '4',
                        unit: 'Stück',
                        category: ShoppingCategory.MILCHPRODUKTE,
                    },
                    {
                        name: 'Parmesan',
                        amount: '100',
                        unit: 'g',
                        category: ShoppingCategory.MILCHPRODUKTE,
                    },
                    {
                        name: 'Broccoli',
                        amount: '300',
                        unit: 'g',
                        category: ShoppingCategory.GEMUESE,
                    },
                    {
                        name: 'Rinderfilet',
                        amount: '500',
                        unit: 'g',
                        category: ShoppingCategory.FLEISCH,
                    },
                    {
                        name: 'Sojasoße',
                        amount: '4',
                        unit: 'tbsp',
                        category: ShoppingCategory.GEWURZE,
                    },
                ],
            },
        },
    });
    console.log('✅ Created shopping list');

    // Create some activity logs
    await prisma.activityLog.createMany({
        data: [
            {
                userId: user1.id,
                type: ActivityType.RECIPE_CREATED,
                targetId: '1',
                targetType: 'recipe',
                metadata: { title: 'Classic Pasta Carbonara' },
                createdAt: new Date('2024-01-15'),
            },
            {
                userId: user2.id,
                type: ActivityType.RECIPE_CREATED,
                targetId: '4',
                targetType: 'recipe',
                metadata: { title: 'Entenbrust mit Spätzle und Soße' },
                createdAt: new Date('2024-04-05'),
            },
            {
                userId: user1.id,
                type: ActivityType.RECIPE_RATED,
                targetId: '4',
                targetType: 'recipe',
                metadata: { rating: 5, title: 'Entenbrust mit Spätzle und Soße' },
                createdAt: new Date('2024-04-06'),
            },
            {
                userId: user2.id,
                type: ActivityType.USER_FOLLOWED,
                targetId: user1.id,
                targetType: 'user',
                metadata: { userName: 'Maria Rossi' },
                createdAt: new Date('2024-04-07'),
            },
        ],
    });
    console.log('✅ Created activity logs');

    // Create notifications
    await prisma.notification.createMany({
        data: [
            {
                userId: user1.id,
                type: NotificationType.NEW_FOLLOWER,
                title: 'Neuer Follower',
                message: 'Alex Koch folgt dir jetzt',
                data: { followerId: user2.id },
                createdAt: new Date('2024-04-07'),
            },
            {
                userId: user1.id,
                type: NotificationType.RECIPE_RATING,
                title: 'Neue Bewertung',
                message: 'Jemand hat dein Rezept bewertet',
                data: { recipeId: '4', rating: 5 },
                createdAt: new Date('2024-04-06'),
            },
        ],
    });
    console.log('✅ Created notifications');

    console.log('🎉 Seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
