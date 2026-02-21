'use server';

import { prisma } from '@/lib/prisma';

const recipes = [
    {
        id: 'recipe-1',
        title: 'Classic Pasta Carbonara',
        slug: 'classic-pasta-carbonara',
        description: 'A rich and creamy Italian pasta dish with crispy pancetta and parmesan.',
        servings: 4,
        prepTime: 10,
        cookTime: 20,
        totalTime: 30,
        difficulty: 'MEDIUM' as const,
        rating: 4.5,
        ratingCount: 25,
        viewCount: 150,
        cookCount: 30,
        imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80',
        flowNodes: [
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
        flowEdges: [
            { id: 'e1', source: 'start', target: 'boil-water' },
            { id: 'e2', source: 'start', target: 'prep-eggs' },
            { id: 'e3', source: 'prep-eggs', target: 'cook-pancetta' },
            { id: 'e4', source: 'boil-water', target: 'cook-pasta' },
            { id: 'e5', source: 'cook-pasta', target: 'combine' },
            { id: 'e6', source: 'cook-pancetta', target: 'combine' },
            { id: 'e7', source: 'combine', target: 'season' },
            { id: 'e8', source: 'season', target: 'serve' },
        ],
    },
    {
        id: 'recipe-2',
        title: 'Homemade Pizza',
        slug: 'homemade-pizza',
        description: 'Classic margherita pizza with a crispy crust and fresh toppings.',
        servings: 2,
        prepTime: 30,
        cookTime: 15,
        totalTime: 90,
        difficulty: 'HARD' as const,
        rating: 4.8,
        ratingCount: 42,
        viewCount: 200,
        cookCount: 15,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
        flowNodes: [
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
        flowEdges: [
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
    },
    {
        id: 'recipe-3',
        title: 'Beef Stir Fry',
        slug: 'beef-stir-fry',
        description: 'Quick and flavorful Asian-inspired beef stir fry with vegetables.',
        servings: 4,
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        difficulty: 'EASY' as const,
        rating: 4.3,
        ratingCount: 18,
        viewCount: 100,
        cookCount: 45,
        imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800&q=80',
        flowNodes: [
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
        flowEdges: [
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
    },
    {
        id: 'recipe-4',
        title: 'Entenbrust mit Spätzle und Soße',
        slug: 'entenbrust-spatzle-sosse',
        description:
            'Klassisches deutsches Gericht: Rosa gebratene Entenbrust mit hausgemachten Spätzle und einer reichhaltigen Rotweinsoße.',
        servings: 4,
        prepTime: 30,
        cookTime: 45,
        totalTime: 75,
        difficulty: 'HARD' as const,
        rating: 4.9,
        ratingCount: 35,
        viewCount: 180,
        cookCount: 20,
        imageUrl: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80',
        flowNodes: [
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
        flowEdges: [
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
    },
];

// Ingredients data (for future use with RecipeIngredient)
const _ingredients = [
    { name: 'Spaghetti', slug: 'spaghetti', category: 'SONSTIGES', units: ['g', 'kg'] },
    { name: 'Pancetta', slug: 'pancetta', category: 'FLEISCH', units: ['g'] },
    { name: 'Eggs', slug: 'eggs', category: 'MILCHPRODUKTE', units: ['whole', 'Stück'] },
    { name: 'Parmesan', slug: 'parmesan', category: 'MILCHPRODUKTE', units: ['g'] },
    { name: 'Black pepper', slug: 'black-pepper', category: 'GEWURZE', units: ['tsp'] },
    { name: 'Salt', slug: 'salt', category: 'GEWURZE', units: ['tbsp'] },
    { name: 'Pizza flour', slug: 'pizza-flour', category: 'BACKEN', units: ['g', 'kg'] },
    { name: 'Yeast', slug: 'yeast', category: 'BACKEN', units: ['g'] },
    { name: 'Olive oil', slug: 'olive-oil', category: 'SONSTIGES', units: ['tbsp', 'ml'] },
    {
        name: 'San Marzano tomatoes',
        slug: 'san-marzano-tomatoes',
        category: 'GEMUESE',
        units: ['g'],
    },
    { name: 'Fresh mozzarella', slug: 'fresh-mozzarella', category: 'MILCHPRODUKTE', units: ['g'] },
    { name: 'Fresh basil', slug: 'fresh-basil', category: 'GEMUESE', units: ['bunch'] },
    { name: 'Beef sirloin', slug: 'beef-sirloin', category: 'FLEISCH', units: ['g'] },
    { name: 'Broccoli', slug: 'broccoli', category: 'GEMUESE', units: ['g'] },
    { name: 'Bell peppers', slug: 'bell-peppers', category: 'GEMUESE', units: ['whole'] },
    { name: 'Soy sauce', slug: 'soy-sauce', category: 'GEWURZE', units: ['tbsp'] },
    { name: 'Garlic', slug: 'garlic', category: 'GEMUESE', units: ['cloves'] },
    { name: 'Ginger', slug: 'ginger', category: 'GEMUESE', units: ['tbsp'] },
    { name: 'Sesame oil', slug: 'sesame-oil', category: 'SONSTIGES', units: ['tbsp'] },
    { name: 'Entenbrust', slug: 'entenbrust', category: 'FLEISCH', units: ['g'] },
    { name: 'Mehl', slug: 'mehl', category: 'BACKEN', units: ['g'] },
    { name: 'Eier', slug: 'eier', category: 'MILCHPRODUKTE', units: ['Stück'] },
    { name: 'Mineralwasser', slug: 'mineralwasser', category: 'GETRAENKE', units: ['ml'] },
    { name: 'Rotwein', slug: 'rotwein', category: 'GETRAENKE', units: ['ml'] },
    { name: 'Entenfond', slug: 'entenfond', category: 'SONSTIGES', units: ['ml'] },
    { name: 'Schalotten', slug: 'schalotten', category: 'GEMUESE', units: ['Stück'] },
    { name: 'Butter', slug: 'butter', category: 'MILCHPRODUKTE', units: ['g'] },
    { name: 'Thymian', slug: 'thymian', category: 'GEWURZE', units: ['Zweige'] },
];

const categories = [
    {
        name: 'Hauptgericht',
        slug: 'hauptgericht',
        description: 'Hauptgerichte für Mittag- und Abendessen',
        color: '#e07b53',
    },
    {
        name: 'Beilage',
        slug: 'beilage',
        description: 'Beilagen und Ergänzungen zu Hauptgerichten',
        color: '#00b894',
    },
    {
        name: 'Backen',
        slug: 'backen',
        description: 'Backrezepte für Kuchen, Brot und mehr',
        color: '#fd79a8',
    },
    { name: 'Dessert', slug: 'dessert', description: 'Süße Nachspeisen', color: '#fdcb6e' },
    { name: 'Frühstück', slug: 'fruehstueck', description: 'Frühstücksrezepte', color: '#a29bfe' },
    {
        name: 'Getränk',
        slug: 'getraenk',
        description: 'Heiße und kalte Getränke',
        color: '#74b9ff',
    },
];

const tags = [
    { name: 'Italienisch', slug: 'italienisch' },
    { name: 'Schnell', slug: 'schnell' },
    { name: 'Vegetarisch', slug: 'vegetarisch' },
    { name: 'Deutsch', slug: 'deutsch' },
    { name: 'Festlich', slug: 'festlich' },
    { name: 'Geflügel', slug: 'gefluegel' },
    { name: 'Asiatisch', slug: 'asialtisch' },
    { name: 'Pasta', slug: 'pasta' },
    { name: 'Pizza', slug: 'pizza' },
    { name: 'Einfach', slug: 'einfach' },
];

export async function seedDatabase() {
    console.log('🌱 Starting seed...');

    // Create categories
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {},
            create: cat,
        });
    }
    console.log('✅ Created categories');

    // Create tags
    for (const tag of tags) {
        await prisma.tag.upsert({
            where: { slug: tag.slug },
            update: {},
            create: tag,
        });
    }
    console.log('✅ Created tags');

    // Create or get user
    const user = await prisma.user.upsert({
        where: { email: 'chef@kitchenpace.app' },
        update: {},
        create: {
            email: 'chef@kitchenpace.app',
            name: 'KitchenPace Chef',
            profile: {
                create: {
                    email: 'chef@kitchenpace.app',
                    nickname: 'KitchenPace Chef',
                    bio: 'Offizieller KitchenPace Demo-Account',
                    followerCount: 100,
                    recipeCount: recipes.length,
                },
            },
        },
    });
    console.log('✅ Created user');

    // Get category IDs
    const hauptgericht = await prisma.category.findUnique({ where: { slug: 'hauptgericht' } });
    const backen = await prisma.category.findUnique({ where: { slug: 'backen' } });

    // Create recipes
    const recipeData = [
        { ...recipes[0], categoryId: hauptgericht?.id },
        { ...recipes[1], categoryId: backen?.id },
        { ...recipes[2], categoryId: hauptgericht?.id },
        { ...recipes[3], categoryId: hauptgericht?.id },
    ];

    for (const recipe of recipeData) {
        const { categoryId, ...rest } = recipe;
        const created = await prisma.recipe.upsert({
            where: { id: recipe.id },
            update: {},
            create: {
                ...rest,
                authorId: user.id,
                categoryId: categoryId ?? null,
            },
        });
        console.log(`✅ Created recipe: ${created.title}`);
    }

    // Link tags to recipes
    const recipe1 = await prisma.recipe.findUnique({ where: { id: 'recipe-1' } });
    const recipe2 = await prisma.recipe.findUnique({ where: { id: 'recipe-2' } });
    const recipe3 = await prisma.recipe.findUnique({ where: { id: 'recipe-3' } });
    const recipe4 = await prisma.recipe.findUnique({ where: { id: 'recipe-4' } });

    const italienisch = await prisma.tag.findUnique({ where: { slug: 'italienisch' } });
    const pasta = await prisma.tag.findUnique({ where: { slug: 'pasta' } });
    const schnell = await prisma.tag.findUnique({ where: { slug: 'schnell' } });
    const pizza = await prisma.tag.findUnique({ where: { slug: 'pizza' } });
    const einfach = await prisma.tag.findUnique({ where: { slug: 'einfach' } });
    const asialtisch = await prisma.tag.findUnique({ where: { slug: 'asialtisch' } });
    const deutsch = await prisma.tag.findUnique({ where: { slug: 'deutsch' } });
    const festlich = await prisma.tag.findUnique({ where: { slug: 'festlich' } });
    const gefluegel = await prisma.tag.findUnique({ where: { slug: 'gefluegel' } });

    if (recipe1 && italienisch && pasta && schnell) {
        await prisma.recipeTag.createMany({
            data: [
                { recipeId: recipe1.id, tagId: italienisch.id },
                { recipeId: recipe1.id, tagId: pasta.id },
                { recipeId: recipe1.id, tagId: schnell.id },
            ],
            skipDuplicates: true,
        });
    }
    if (recipe2 && italienisch && pizza) {
        await prisma.recipeTag.createMany({
            data: [
                { recipeId: recipe2.id, tagId: italienisch.id },
                { recipeId: recipe2.id, tagId: pizza.id },
            ],
            skipDuplicates: true,
        });
    }
    if (recipe3 && asialtisch && einfach) {
        await prisma.recipeTag.createMany({
            data: [
                { recipeId: recipe3.id, tagId: asialtisch.id },
                { recipeId: recipe3.id, tagId: einfach.id },
            ],
            skipDuplicates: true,
        });
    }
    if (recipe4 && deutsch && festlich && gefluegel) {
        await prisma.recipeTag.createMany({
            data: [
                { recipeId: recipe4.id, tagId: deutsch.id },
                { recipeId: recipe4.id, tagId: festlich.id },
                { recipeId: recipe4.id, tagId: gefluegel.id },
            ],
            skipDuplicates: true,
        });
    }
    console.log('✅ Created recipe tags');

    console.log('🎉 Seed completed!');
}
