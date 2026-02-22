import 'dotenv/config';

// This file can be run directly with: npx tsx lib/seed-full.ts
// Or via prisma: npm run db:seed (which calls prisma/seed.ts)

import { prisma } from '@/lib/prisma';

const ActivityType = {
    RECIPE_CREATED: 'RECIPE_CREATED',
    RECIPE_COOKED: 'RECIPE_COOKED',
    RECIPE_RATED: 'RECIPE_RATED',
    RECIPE_COMMENTED: 'RECIPE_COMMENTED',
    RECIPE_FAVORITED: 'RECIPE_FAVORITED',
    USER_FOLLOWED: 'USER_FOLLOWED',
    SHOPPING_LIST_CREATED: 'SHOPPING_LIST_CREATED',
    MEAL_PLAN_CREATED: 'MEAL_PLAN_CREATED',
} as const;

const NotificationType = {
    NEW_FOLLOWER: 'NEW_FOLLOWER',
    RECIPE_LIKE: 'RECIPE_LIKE',
    RECIPE_COMMENT: 'RECIPE_COMMENT',
    RECIPE_RATING: 'RECIPE_RATING',
    WEEKLY_PLAN_REMINDER: 'WEEKLY_PLAN_REMINDER',
    SYSTEM: 'SYSTEM',
} as const;

const Difficulty = {
    EASY: 'EASY',
    MEDIUM: 'MEDIUM',
    HARD: 'HARD',
} as const;

const ShoppingCategory = {
    GEMUESE: 'GEMUESE',
    OBST: 'OBST',
    FLEISCH: 'FLEISCH',
    FISCH: 'FISCH',
    MILCHPRODUKTE: 'MILCHPRODUKTE',
    GEWURZE: 'GEWURZE',
    BACKEN: 'BACKEN',
    GETRAENKE: 'GETRAENKE',
    SONSTIGES: 'SONSTIGES',
} as const;

async function main() {
    console.log('🌱 Starting comprehensive seed...');

    // ============================================
    // CATEGORIES
    // ============================================
    const categoriesData = [
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
        {
            name: 'Frühstück',
            slug: 'fruehstueck',
            description: 'Frühstücksrezepte',
            color: '#a29bfe',
        },
        {
            name: 'Getränk',
            slug: 'getraenk',
            description: 'Heiße und kalte Getränke',
            color: '#74b9ff',
        },
        {
            name: 'Vorspeise',
            slug: 'vorspeise',
            description: 'Vorspeisen und Fingerfood',
            color: '#fab1a0',
        },
        { name: 'Salat', slug: 'salat', description: 'Frische Salate', color: '#00b894' },
    ];

    for (const cat of categoriesData) {
        await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
    }
    console.log('✅ Created categories');

    // ============================================
    // TAGS
    // ============================================
    const tagsData = [
        { name: 'Italienisch', slug: 'italienisch' },
        { name: 'Schnell', slug: 'schnell' },
        { name: 'Vegetarisch', slug: 'vegetarisch' },
        { name: 'Vegan', slug: 'vegan' },
        { name: 'Deutsch', slug: 'deutsch' },
        { name: 'Festlich', slug: 'festlich' },
        { name: 'Geflügel', slug: 'gefluegel' },
        { name: 'Asiatisch', slug: 'asialtisch' },
        { name: 'Pasta', slug: 'pasta' },
        { name: 'Pizza', slug: 'pizza' },
        { name: 'Einfach', slug: 'einfach' },
        { name: 'Günstig', slug: 'guenstig' },
        { name: 'Klassisch', slug: 'klassisch' },
        { name: 'Modern', slug: 'modern' },
        { name: 'Mediterran', slug: 'mediterran' },
    ];

    for (const tag of tagsData) {
        await prisma.tag.upsert({ where: { slug: tag.slug }, update: {}, create: tag });
    }
    console.log('✅ Created tags');

    // ============================================
    // INGREDIENTS
    // ============================================
    const ingredientsData = [
        {
            name: 'Spaghetti',
            slug: 'spaghetti',
            category: ShoppingCategory.SONSTIGES,
            units: ['g', 'kg'],
        },
        { name: 'Pancetta', slug: 'pancetta', category: ShoppingCategory.FLEISCH, units: ['g'] },
        { name: 'Eier', slug: 'eier', category: ShoppingCategory.MILCHPRODUKTE, units: ['Stück'] },
        {
            name: 'Parmesan',
            slug: 'parmesan',
            category: ShoppingCategory.MILCHPRODUKTE,
            units: ['g'],
        },
        {
            name: 'Schwarzer Pfeffer',
            slug: 'schwarzer-pfeffer',
            category: ShoppingCategory.GEWURZE,
            units: ['tsp', 'Prise'],
        },
        { name: 'Salz', slug: 'salz', category: ShoppingCategory.GEWURZE, units: ['tsp', 'Prise'] },
        {
            name: 'Olivenöl',
            slug: 'olivenoel',
            category: ShoppingCategory.SONSTIGES,
            units: ['tbsp', 'ml'],
        },
        {
            name: 'Knoblauch',
            slug: 'knoblauch',
            category: ShoppingCategory.GEMUESE,
            units: ['Zehen'],
        },
        { name: 'Zwiebel', slug: 'zwiebel', category: ShoppingCategory.GEMUESE, units: ['Stück'] },
        {
            name: 'Tomaten',
            slug: 'tomaten',
            category: ShoppingCategory.GEMUESE,
            units: ['g', 'Stück'],
        },
        {
            name: 'Basilikum',
            slug: 'basilikum',
            category: ShoppingCategory.GEMUESE,
            units: ['Blätter', 'Bund'],
        },
        {
            name: 'Mozzarella',
            slug: 'mozzarella',
            category: ShoppingCategory.MILCHPRODUKTE,
            units: ['g'],
        },
        { name: 'Mehl', slug: 'mehl', category: ShoppingCategory.BACKEN, units: ['g', 'kg'] },
        { name: 'Hefe', slug: 'hefe', category: ShoppingCategory.BACKEN, units: ['g'] },
        {
            name: 'Rinderhack',
            slug: 'rinderhack',
            category: ShoppingCategory.FLEISCH,
            units: ['g'],
        },
        {
            name: 'Kokosmilch',
            slug: 'kokosmilch',
            category: ShoppingCategory.SONSTIGES,
            units: ['ml'],
        },
        { name: 'Ingwer', slug: 'ingwer', category: ShoppingCategory.GEMUESE, units: ['g', 'cm'] },
        { name: 'Brokkoli', slug: 'brokkoli', category: ShoppingCategory.GEMUESE, units: ['g'] },
        { name: 'Paprika', slug: 'paprika', category: ShoppingCategory.GEMUESE, units: ['Stück'] },
        {
            name: 'Hähnchenbrust',
            slug: 'haehnchenbrust',
            category: ShoppingCategory.FLEISCH,
            units: ['g'],
        },
        {
            name: 'Sahne',
            slug: 'sahne',
            category: ShoppingCategory.MILCHPRODUKTE,
            units: ['ml', 'g'],
        },
        { name: 'Butter', slug: 'butter', category: ShoppingCategory.MILCHPRODUKTE, units: ['g'] },
        { name: 'Milch', slug: 'milch', category: ShoppingCategory.MILCHPRODUKTE, units: ['ml'] },
        { name: 'Zucker', slug: 'zucker', category: ShoppingCategory.BACKEN, units: ['g'] },
        {
            name: 'Vanilleextrakt',
            slug: 'vanilleextrakt',
            category: ShoppingCategory.BACKEN,
            units: ['tsp'],
        },
        { name: 'Schokolade', slug: 'schokolade', category: ShoppingCategory.BACKEN, units: ['g'] },
        {
            name: 'Schlagsahne',
            slug: 'schlagsahne',
            category: ShoppingCategory.MILCHPRODUKTE,
            units: ['ml', 'g'],
        },
        {
            name: 'Frischkäse',
            slug: 'frischkaese',
            category: ShoppingCategory.MILCHPRODUKTE,
            units: ['g'],
        },
        {
            name: 'Sojasoße',
            slug: 'sojasauc',
            category: ShoppingCategory.GEWURZE,
            units: ['tbsp', 'ml'],
        },
        {
            name: 'Sesamöl',
            slug: 'sesamoel',
            category: ShoppingCategory.SONSTIGES,
            units: ['tbsp', 'ml'],
        },
        {
            name: 'Entenbrust',
            slug: 'entenbrust',
            category: ShoppingCategory.FLEISCH,
            units: ['g'],
        },
        { name: 'Orangen', slug: 'orangen', category: ShoppingCategory.OBST, units: ['Stück'] },
        { name: 'Rotwein', slug: 'rotwein', category: ShoppingCategory.GETRAENKE, units: ['ml'] },
        {
            name: 'Honig',
            slug: 'honig',
            category: ShoppingCategory.SONSTIGES,
            units: ['tbsp', 'g'],
        },
        { name: 'Thymian', slug: 'thymian', category: ShoppingCategory.GEWURZE, units: ['Zweige'] },
    ];

    for (const ing of ingredientsData) {
        await prisma.ingredient.upsert({
            where: { slug: ing.slug },
            update: {},
            create: {
                name: ing.name,
                slug: ing.slug,
                category: ing.category,
                units: ing.units,
            },
        });
    }
    console.log('✅ Created ingredients');

    // ============================================
    // USERS WITH PROFILES
    // ============================================
    const usersData = [
        {
            email: 'maria@example.com',
            name: 'Maria Rossi',
            nickname: 'Maria Rossi',
            bio: 'Italienische Hausmannskost mit Liebe',
            photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
            followerCount: 234,
            followingCount: 89,
            recipeCount: 12,
        },
        {
            email: 'alex@example.com',
            name: 'Alex Chen',
            nickname: 'Alex Chen',
            bio: 'Asiatische Küche & moderne Fusion',
            photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
            followerCount: 156,
            followingCount: 67,
            recipeCount: 8,
        },
        {
            email: 'chef@example.com',
            name: 'KitchenPace Chef',
            nickname: 'KitchenPace Chef',
            bio: 'Offizieller Demo-Account',
            photoUrl: null,
            followerCount: 42,
            followingCount: 15,
            recipeCount: 3,
        },
        {
            email: 'emma@example.com',
            name: 'Emma Schmidt',
            nickname: 'Emma bäckt',
            bio: 'Backen ist meine Leidenschaft',
            photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
            followerCount: 567,
            followingCount: 123,
            recipeCount: 24,
        },
        {
            email: 'lukas@example.com',
            name: 'Lukas Weber',
            nickname: 'Lukas grillt',
            bio: 'BBQ Meister aus Bayern',
            photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
            followerCount: 321,
            followingCount: 45,
            recipeCount: 18,
        },
        // Additional users for more social interactions
        {
            email: 'sophie@example.com',
            name: 'Sophie Meyer',
            nickname: 'Sophie kocht',
            bio: 'Gesunde Küche für die Familie',
            photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
            followerCount: 89,
            followingCount: 156,
            recipeCount: 15,
        },
        {
            email: 'max@example.com',
            name: 'Max Bauer',
            nickname: 'Max isst alles',
            bio: 'Vegetarisch, vegan, alles außer Fleisch',
            photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
            followerCount: 45,
            followingCount: 78,
            recipeCount: 9,
        },
        {
            email: 'laura@example.com',
            name: 'Laura Fischer',
            nickname: 'Laura sweet',
            bio: 'Süßspeisen und Backen sind meine Therapie',
            photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80',
            followerCount: 234,
            followingCount: 67,
            recipeCount: 31,
        },
        {
            email: 'jan@example.com',
            name: 'Jan Müller',
            nickname: 'Jan Fast Food',
            bio: 'Schnelle Küche für Studenten',
            photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&q=80',
            followerCount: 67,
            followingCount: 234,
            recipeCount: 6,
        },
        {
            email: 'clara@example.com',
            name: 'Clara Schulz',
            nickname: 'Clara Cuisine',
            bio: 'Französische Klassiker neu interpretiert',
            photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
            followerCount: 178,
            followingCount: 89,
            recipeCount: 22,
        },
    ];

    const createdUsers = [];
    for (const u of usersData) {
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {},
            create: {
                email: u.email,
                name: u.name,
                profile: {
                    create: {
                        email: u.email,
                        nickname: u.nickname,
                        bio: u.bio,
                        photoUrl: u.photoUrl,
                        followerCount: u.followerCount,
                        followingCount: u.followingCount,
                        recipeCount: u.recipeCount,
                    },
                },
            },
        });
        createdUsers.push(user);
    }
    console.log('✅ Created users');

    // ============================================
    // GET CATEGORIES
    // ============================================
    const hauptgericht = await prisma.category.findUnique({ where: { slug: 'hauptgericht' } });
    const dessert = await prisma.category.findUnique({ where: { slug: 'dessert' } });
    const frühstück = await prisma.category.findUnique({ where: { slug: 'fruehstueck' } });

    // ============================================
    // RECIPES
    // ============================================
    const recipesData = [
        {
            id: 'recipe-1',
            title: 'Spaghetti Carbonara',
            slug: 'spaghetti-carbonara',
            description: 'Klassische italienische Carbonara mit Pancetta und Pecorino',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/spaghetti-carbonara.jpg',
            servings: 4,
            prepTime: 10,
            cookTime: 20,
            difficulty: Difficulty.MEDIUM,
            rating: 4.7,
            ratingCount: 89,
            viewCount: 1245,
            cookCount: 234,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[0].id,
            tags: ['italienisch', 'pasta', 'schnell'],
        },
        {
            id: 'recipe-2',
            title: 'Homemade Pizza Margherita',
            slug: 'pizza-margherita',
            description: 'Authentische neapolitanische Pizza mit frischem Basilikum',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/pizza-margherita.jpg',
            servings: 2,
            prepTime: 30,
            cookTime: 15,
            difficulty: Difficulty.HARD,
            rating: 4.9,
            ratingCount: 156,
            viewCount: 2341,
            cookCount: 189,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[0].id,
            tags: ['italienisch', 'pizza', 'festlich'],
        },
        {
            id: 'recipe-3',
            title: 'Asiatisches Rindfleisch Curry',
            slug: 'rindfleisch-curry',
            description: 'Würziges Rindfleisch-Curry mit Kokosmilch und Gemüse',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/rindfleisch-curry.jpg',
            servings: 4,
            prepTime: 15,
            cookTime: 30,
            difficulty: Difficulty.MEDIUM,
            rating: 4.5,
            ratingCount: 67,
            viewCount: 890,
            cookCount: 123,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[1].id,
            tags: ['asialtisch', 'schnell', 'modern'],
        },
        {
            id: 'recipe-4',
            title: 'Entenbrust mit Orangensauce',
            slug: 'entenbrust-orangensauce',
            description: 'Knusprige Entenbrust mit fruchtiger Orangensauce',
            imageUrl:
                'https://cdn.isntfunny.de/kitchenpace/mock/recipes/entenbrust-orangensauce.jpg',
            servings: 4,
            prepTime: 20,
            cookTime: 45,
            difficulty: Difficulty.HARD,
            rating: 4.8,
            ratingCount: 45,
            viewCount: 567,
            cookCount: 34,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[1].id,
            tags: ['festlich', 'gefluegel', 'deutsch'],
        },
        {
            id: 'recipe-5',
            title: 'Schnelles Hähnchen Stir-Fry',
            slug: 'huehnchen-stir-fry',
            description: '15-Minuten Hähnchenpfanne mit buntem Gemüse',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/huehnchen-stir-fry.jpg',
            servings: 2,
            prepTime: 5,
            cookTime: 10,
            difficulty: Difficulty.EASY,
            rating: 4.4,
            ratingCount: 123,
            viewCount: 1567,
            cookCount: 456,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[1].id,
            tags: ['asialtisch', 'schnell', 'einfach'],
        },
        {
            id: 'recipe-6',
            title: 'Schokoladen Mousse',
            slug: 'schokoladen-mousse',
            description: 'Luftige Schokoladencreme mit Sahne',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/schokoladen-mousse.jpg',
            servings: 4,
            prepTime: 20,
            cookTime: 0,
            difficulty: Difficulty.EASY,
            rating: 4.9,
            ratingCount: 234,
            viewCount: 3456,
            cookCount: 567,
            categoryId: dessert?.id,
            authorId: createdUsers[3].id,
            tags: ['einfach', 'festlich'],
        },
        {
            id: 'recipe-7',
            title: 'Vanille Pancakes',
            slug: 'vanille-pancakes',
            description: 'Fluffige amerikanische Pancakes mit Ahornsirup',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/vanille-pancakes.jpg',
            servings: 4,
            prepTime: 10,
            cookTime: 15,
            difficulty: Difficulty.EASY,
            rating: 4.6,
            ratingCount: 189,
            viewCount: 2890,
            cookCount: 678,
            categoryId: frühstück?.id,
            authorId: createdUsers[3].id,
            tags: ['einfach', 'schnell'],
        },
        {
            id: 'recipe-8',
            title: 'Entenbrust mit Spätzle und Soße',
            slug: 'entenbrust-spatzle-sosse',
            description:
                'Klassisches deutsches Gericht: Rosa gebratene Entenbrust mit hausgemachten Spätzle und einer reichhaltigen Rotweinsoße.',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/entenbrust-spatzle.jpg',
            servings: 4,
            prepTime: 30,
            cookTime: 45,
            difficulty: Difficulty.HARD,
            rating: 4.9,
            ratingCount: 35,
            viewCount: 180,
            cookCount: 20,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[1].id,
            tags: ['festlich', 'gefluegel', 'deutsch'],
            flowNodes: [
                {
                    id: 'start',
                    type: 'prep',
                    label: 'Start',
                    description: 'Alle Zutaten bereitstellen',
                    position: { x: 280, y: 0 },
                },
                {
                    id: 'score-duck',
                    type: 'prep',
                    label: 'Ente einschneiden',
                    description: 'Haut rautenförmig einschneiden',
                    duration: 5,
                    position: { x: 0, y: 150 },
                },
                {
                    id: 'sear-duck',
                    type: 'cook',
                    label: 'Ente anbraten',
                    description: 'Hautseite nach unten',
                    duration: 15,
                    position: { x: 0, y: 320 },
                },
                {
                    id: 'rest-duck',
                    type: 'wait',
                    label: 'Ente ruhen',
                    duration: 10,
                    position: { x: 0, y: 490 },
                },
                {
                    id: 'slice-duck',
                    type: 'prep',
                    label: 'Ente aufschneiden',
                    duration: 2,
                    position: { x: 0, y: 660 },
                },
                {
                    id: 'make-batter',
                    type: 'prep',
                    label: 'Spätzleteig',
                    duration: 10,
                    position: { x: 280, y: 150 },
                },
                {
                    id: 'rest-batter',
                    type: 'wait',
                    label: 'Teig ruhen',
                    duration: 15,
                    position: { x: 280, y: 320 },
                },
                {
                    id: 'boil-water',
                    type: 'cook',
                    label: 'Wasser kochen',
                    duration: 10,
                    position: { x: 280, y: 490 },
                },
                {
                    id: 'cook-spaetzle',
                    type: 'cook',
                    label: 'Spätzle kochen',
                    duration: 8,
                    position: { x: 280, y: 660 },
                },
                {
                    id: 'saute-spaetzle',
                    type: 'cook',
                    label: 'Spätzle schwenken',
                    duration: 5,
                    position: { x: 280, y: 830 },
                },
                {
                    id: 'prep-shallots',
                    type: 'prep',
                    label: 'Schalotten',
                    duration: 3,
                    position: { x: 560, y: 150 },
                },
                {
                    id: 'saute-shallots',
                    type: 'cook',
                    label: 'Schalotten dünsten',
                    duration: 5,
                    position: { x: 560, y: 320 },
                },
                {
                    id: 'deglaze',
                    type: 'cook',
                    label: 'Ablöschen',
                    duration: 10,
                    position: { x: 560, y: 490 },
                },
                {
                    id: 'add-stock',
                    type: 'cook',
                    label: 'Fond zugeben',
                    duration: 15,
                    position: { x: 560, y: 660 },
                },
                {
                    id: 'finish-sauce',
                    type: 'season',
                    label: 'Soße abschmecken',
                    duration: 3,
                    position: { x: 560, y: 830 },
                },
                {
                    id: 'combine',
                    type: 'combine',
                    label: 'Anrichten',
                    position: { x: 280, y: 1000 },
                },
                { id: 'serve', type: 'serve', label: 'Servieren', position: { x: 280, y: 1170 } },
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
        // Recipe-9: Thai Green Curry - popular with lots of interactions
        {
            id: 'recipe-9',
            title: 'Thai Green Curry',
            slug: 'thai-green-curry',
            description: 'Würziges Thai Green Curry mit Kokosmilch und frischem Gemüse',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/thai-green-curry.jpg',
            servings: 4,
            prepTime: 15,
            cookTime: 25,
            difficulty: Difficulty.MEDIUM,
            rating: 4.6,
            ratingCount: 156,
            viewCount: 2345,
            cookCount: 456,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[1].id,
            tags: ['asialtisch', 'schnell', 'scharf'],
        },
        // Recipe-10: Tiramisu - highly rated dessert
        {
            id: 'recipe-10',
            title: 'Klassisches Tiramisu',
            slug: 'klassisches-tiramisu',
            description: 'Authentisches italienisches Tiramisu mit Mascarpone und Espresso',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/tiramisu.jpg',
            servings: 8,
            prepTime: 30,
            cookTime: 0,
            difficulty: Difficulty.MEDIUM,
            rating: 4.9,
            ratingCount: 289,
            viewCount: 4567,
            cookCount: 678,
            categoryId: dessert?.id,
            authorId: createdUsers[3].id,
            tags: ['italienisch', 'dessert', 'festlich'],
        },
        // Recipe-11: Avocado Toast - quick breakfast
        {
            id: 'recipe-11',
            title: 'Avocado Toast',
            slug: 'avocado-toast',
            description: 'Cremiges Avocado Toast mit pochiertem Ei und Chili',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/avocado-toast.jpg',
            servings: 2,
            prepTime: 5,
            cookTime: 5,
            difficulty: Difficulty.EASY,
            rating: 4.3,
            ratingCount: 198,
            viewCount: 3456,
            cookCount: 789,
            categoryId: frühstück?.id,
            authorId: createdUsers[5].id,
            tags: ['frühstück', 'schnell', 'gesund'],
        },
        // Recipe-12: Greek Salad - light lunch
        {
            id: 'recipe-12',
            title: 'Griechischer Salat',
            slug: 'griechischer-salat',
            description: 'Frischer griechischer Salat mit Oliven, Feta und Oregano',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/greek-salad.jpg',
            servings: 4,
            prepTime: 15,
            cookTime: 0,
            difficulty: Difficulty.EASY,
            rating: 4.5,
            ratingCount: 134,
            viewCount: 1890,
            cookCount: 345,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[6].id,
            tags: ['gesund', 'vegetarisch', 'schnell'],
        },
        // Recipe-13: Beef Bourguignon - complex French dish
        {
            id: 'recipe-13',
            title: 'Boeuf Bourguignon',
            slug: 'boeuf-bourguignon',
            description: 'Französisches Rinderschmortopf mit Rotwein und Pilzen',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/boeuf-bourguignon.jpg',
            servings: 6,
            prepTime: 30,
            cookTime: 180,
            difficulty: Difficulty.HARD,
            rating: 4.8,
            ratingCount: 167,
            viewCount: 2345,
            cookCount: 234,
            categoryId: hauptgericht?.id,
            authorId: createdUsers[9].id,
            tags: ['franzosisch', 'festlich', 'klassisch'],
        },
        // Recipe-14: NEW RECIPE - Brand new with NO interactions yet
        {
            id: 'recipe-14',
            title: 'Sommerliche Beeren-Torte',
            slug: 'sommerliche-beeren-torte',
            description:
                'Leichte Torte mit frischen Beeren und Vanillecreme - ganz frisch hochgeladen!',
            imageUrl: 'https://cdn.isntfunny.de/kitchenpace/mock/recipes/beeren-torte.jpg',
            servings: 12,
            prepTime: 45,
            cookTime: 60,
            difficulty: Difficulty.HARD,
            rating: 0,
            ratingCount: 0,
            viewCount: 5,
            cookCount: 0,
            categoryId: dessert?.id,
            authorId: createdUsers[7].id,
            tags: ['dessert', 'sommer', 'backen'],
        },
        // Recipe-15: EDGE CASE - Recipe with weird data
        {
            id: 'recipe-15',
            title: 'Test Rezept',
            slug: 'test-rezept',
            description: 'A', // Very short description
            imageUrl: null, // No image!
            servings: 1,
            prepTime: 0, // No prep time
            cookTime: 0, // No cook time
            difficulty: Difficulty.EASY,
            rating: 0, // No ratings
            ratingCount: 0,
            viewCount: 1,
            cookCount: 0,
            categoryId: null, // No category!
            authorId: createdUsers[2].id, // chef user
            tags: [], // No tags
        },
    ];

    function randomPastDate(monthsBack = 6): Date {
        const now = new Date();
        const daysBack = Math.floor(Math.random() * (monthsBack * 30));
        const date = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        return date;
    }

    const createdRecipes = [];
    for (const r of recipesData) {
        const { tags: _tags, categoryId, authorId, flowNodes, flowEdges, ...recipeData } = r;
        const recipe = await prisma.recipe.upsert({
            where: { id: r.id },
            update: {},
            create: {
                ...recipeData,
                categoryId,
                authorId,
                status: 'PUBLISHED',
                publishedAt: randomPastDate(6),
                totalTime: r.prepTime + r.cookTime,
                flowNodes: flowNodes as any,
                flowEdges: flowEdges as any,
            } as any,
        });
        createdRecipes.push({ recipe, tags: r.tags });
    }
    console.log('✅ Created recipes');

    // ============================================
    // RECIPE INGREDIENTS
    // ============================================
    const recipeIngredientsMap: Record<
        string,
        {
            ingredient: string;
            amount: string;
            unit: string;
            notes: string | null;
            position: number;
        }[]
    > = {
        'recipe-1': [
            { ingredient: 'spaghetti', amount: '400', unit: 'g', notes: null, position: 0 },
            { ingredient: 'pancetta', amount: '200', unit: 'g', notes: 'gewürfelt', position: 1 },
            { ingredient: 'eier', amount: '4', unit: 'Stück', notes: 'mit Eigelb', position: 2 },
            {
                ingredient: 'parmesan',
                amount: '100',
                unit: 'g',
                notes: 'frisch gerieben',
                position: 3,
            },
            {
                ingredient: 'schwarzer-pfeffer',
                amount: '2',
                unit: 'tsp',
                notes: 'frisch gemahlen',
                position: 4,
            },
        ],
        'recipe-2': [
            { ingredient: 'mehl', amount: '500', unit: 'g', notes: 'Typ 00', position: 0 },
            { ingredient: 'hefe', amount: '7', unit: 'g', notes: 'frisch', position: 1 },
            { ingredient: 'olivenoel', amount: '3', unit: 'tbsp', notes: null, position: 2 },
            { ingredient: 'tomaten', amount: '400', unit: 'g', notes: 'San Marzano', position: 3 },
            { ingredient: 'mozzarella', amount: '250', unit: 'g', notes: 'frisch', position: 4 },
            { ingredient: 'basilikum', amount: '1', unit: 'Bund', notes: 'frisch', position: 5 },
        ],
        'recipe-3': [
            { ingredient: 'rinderhack', amount: '500', unit: 'g', notes: null, position: 0 },
            { ingredient: 'zwiebel', amount: '2', unit: 'Stück', notes: 'gewürfelt', position: 1 },
            { ingredient: 'knoblauch', amount: '4', unit: 'Zehen', notes: 'gepresst', position: 2 },
            { ingredient: 'ingwer', amount: '3', unit: 'cm', notes: 'gerieben', position: 3 },
            { ingredient: 'kokosmilch', amount: '400', unit: 'ml', notes: null, position: 4 },
        ],
        'recipe-4': [
            { ingredient: 'entenbrust', amount: '800', unit: 'g', notes: 'mit Haut', position: 0 },
            {
                ingredient: 'orangen',
                amount: '3',
                unit: 'Stück',
                notes: 'für Saft und Zesten',
                position: 1,
            },
            { ingredient: 'rotwein', amount: '200', unit: 'ml', notes: null, position: 2 },
            { ingredient: 'honig', amount: '2', unit: 'tbsp', notes: null, position: 3 },
            { ingredient: 'thymian', amount: '4', unit: 'Zweige', notes: null, position: 4 },
        ],
        'recipe-5': [
            {
                ingredient: 'haehnchenbrust',
                amount: '400',
                unit: 'g',
                notes: 'in Streifen',
                position: 0,
            },
            { ingredient: 'brokkoli', amount: '200', unit: 'g', notes: 'Röschen', position: 1 },
            { ingredient: 'paprika', amount: '2', unit: 'Stück', notes: 'bunt', position: 2 },
            { ingredient: 'sojasauc', amount: '4', unit: 'tbsp', notes: null, position: 3 },
            { ingredient: 'sesamoel', amount: '2', unit: 'tbsp', notes: null, position: 4 },
        ],
        'recipe-6': [
            { ingredient: 'schokolade', amount: '200', unit: 'g', notes: '70% Kakao', position: 0 },
            { ingredient: 'eier', amount: '4', unit: 'Stück', notes: 'getrennt', position: 1 },
            { ingredient: 'zucker', amount: '50', unit: 'g', notes: null, position: 2 },
            {
                ingredient: 'schlagsahne',
                amount: '200',
                unit: 'ml',
                notes: 'steif geschlagen',
                position: 3,
            },
            { ingredient: 'vanilleextrakt', amount: '1', unit: 'tsp', notes: null, position: 4 },
        ],
        'recipe-7': [
            { ingredient: 'mehl', amount: '200', unit: 'g', notes: null, position: 0 },
            { ingredient: 'eier', amount: '2', unit: 'Stück', notes: null, position: 1 },
            { ingredient: 'milch', amount: '250', unit: 'ml', notes: null, position: 2 },
            { ingredient: 'zucker', amount: '30', unit: 'g', notes: null, position: 3 },
            { ingredient: 'butter', amount: '30', unit: 'g', notes: 'geschmolzen', position: 4 },
        ],
    };

    for (const [recipeId, ingredients] of Object.entries(recipeIngredientsMap)) {
        for (const ing of ingredients) {
            const ingredient = await prisma.ingredient.findUnique({
                where: { slug: ing.ingredient },
            });
            if (ingredient) {
                await prisma.recipeIngredient.upsert({
                    where: {
                        recipeId_ingredientId: {
                            recipeId,
                            ingredientId: ingredient.id,
                        },
                    },
                    update: {},
                    create: {
                        recipeId,
                        ingredientId: ingredient.id,
                        amount: ing.amount,
                        unit: ing.unit,
                        notes: ing.notes,
                        position: ing.position,
                        isOptional: false,
                    },
                });
            }
        }
    }
    console.log('✅ Created recipe ingredients');

    // ============================================
    // RECIPE TAGS
    // ============================================
    for (const { recipe, tags } of createdRecipes) {
        for (const tagSlug of tags) {
            const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
            if (tag) {
                await prisma.recipeTag.upsert({
                    where: { recipeId_tagId: { recipeId: recipe.id, tagId: tag.id } },
                    update: {},
                    create: { recipeId: recipe.id, tagId: tag.id },
                });
            }
        }
    }
    console.log('✅ Created recipe tags');

    // ============================================
    // RATINGS - Extended with more users and all recipes
    // ============================================
    const ratingsData = [
        // Recipe-1: Spaghetti Carbonara
        { recipeId: 'recipe-1', userId: createdUsers[1].id, rating: 5 },
        { recipeId: 'recipe-1', userId: createdUsers[2].id, rating: 4 },
        { recipeId: 'recipe-1', userId: createdUsers[3].id, rating: 5 },
        { recipeId: 'recipe-1', userId: createdUsers[5].id, rating: 5 },
        { recipeId: 'recipe-1', userId: createdUsers[6].id, rating: 4 },
        { recipeId: 'recipe-1', userId: createdUsers[7].id, rating: 5 },
        { recipeId: 'recipe-1', userId: createdUsers[8].id, rating: 4 },
        { recipeId: 'recipe-1', userId: createdUsers[9].id, rating: 5 },
        // Recipe-2: Pizza Margherita
        { recipeId: 'recipe-2', userId: createdUsers[1].id, rating: 5 },
        { recipeId: 'recipe-2', userId: createdUsers[4].id, rating: 4 },
        { recipeId: 'recipe-2', userId: createdUsers[5].id, rating: 5 },
        { recipeId: 'recipe-2', userId: createdUsers[7].id, rating: 5 },
        { recipeId: 'recipe-2', userId: createdUsers[8].id, rating: 5 },
        // Recipe-3: Rindfleisch Curry
        { recipeId: 'recipe-3', userId: createdUsers[2].id, rating: 5 },
        { recipeId: 'recipe-3', userId: createdUsers[5].id, rating: 4 },
        { recipeId: 'recipe-3', userId: createdUsers[6].id, rating: 5 },
        { recipeId: 'recipe-3', userId: createdUsers[9].id, rating: 4 },
        // Recipe-4: Entenbrust
        { recipeId: 'recipe-4', userId: createdUsers[0].id, rating: 5 },
        { recipeId: 'recipe-4', userId: createdUsers[3].id, rating: 5 },
        { recipeId: 'recipe-4', userId: createdUsers[7].id, rating: 5 },
        { recipeId: 'recipe-4', userId: createdUsers[9].id, rating: 4 },
        // Recipe-5: Hähnchen Stir-Fry
        { recipeId: 'recipe-5', userId: createdUsers[2].id, rating: 4 },
        { recipeId: 'recipe-5', userId: createdUsers[5].id, rating: 5 },
        { recipeId: 'recipe-5', userId: createdUsers[6].id, rating: 4 },
        { recipeId: 'recipe-5', userId: createdUsers[8].id, rating: 5 },
        // Recipe-6: Schokoladen Mousse
        { recipeId: 'recipe-6', userId: createdUsers[0].id, rating: 5 },
        { recipeId: 'recipe-6', userId: createdUsers[1].id, rating: 5 },
        { recipeId: 'recipe-6', userId: createdUsers[5].id, rating: 5 },
        { recipeId: 'recipe-6', userId: createdUsers[6].id, rating: 5 },
        { recipeId: 'recipe-6', userId: createdUsers[7].id, rating: 4 },
        { recipeId: 'recipe-6', userId: createdUsers[8].id, rating: 5 },
        // Recipe-7: Vanille Pancakes
        { recipeId: 'recipe-7', userId: createdUsers[1].id, rating: 5 },
        { recipeId: 'recipe-7', userId: createdUsers[4].id, rating: 4 },
        { recipeId: 'recipe-7', userId: createdUsers[6].id, rating: 5 },
        { recipeId: 'recipe-7', userId: createdUsers[8].id, rating: 4 },
        // Recipe-8: Entenbrust mit Spätzle
        { recipeId: 'recipe-8', userId: createdUsers[0].id, rating: 5 },
        { recipeId: 'recipe-8', userId: createdUsers[2].id, rating: 5 },
        { recipeId: 'recipe-8', userId: createdUsers[3].id, rating: 4 },
        { recipeId: 'recipe-8', userId: createdUsers[4].id, rating: 5 },
        { recipeId: 'recipe-8', userId: createdUsers[5].id, rating: 5 },
        { recipeId: 'recipe-8', userId: createdUsers[7].id, rating: 5 },
        // Recipe-9: Thai Green Curry
        { recipeId: 'recipe-9', userId: createdUsers[0].id, rating: 5 },
        { recipeId: 'recipe-9', userId: createdUsers[2].id, rating: 5 },
        { recipeId: 'recipe-9', userId: createdUsers[4].id, rating: 4 },
        { recipeId: 'recipe-9', userId: createdUsers[6].id, rating: 5 },
        { recipeId: 'recipe-9', userId: createdUsers[8].id, rating: 4 },
        // Recipe-10: Tiramisu
        { recipeId: 'recipe-10', userId: createdUsers[0].id, rating: 5 },
        { recipeId: 'recipe-10', userId: createdUsers[1].id, rating: 5 },
        { recipeId: 'recipe-10', userId: createdUsers[5].id, rating: 5 },
        { recipeId: 'recipe-10', userId: createdUsers[6].id, rating: 5 },
        { recipeId: 'recipe-10', userId: createdUsers[8].id, rating: 4 },
        { recipeId: 'recipe-10', userId: createdUsers[9].id, rating: 5 },
        // Recipe-11: Avocado Toast
        { recipeId: 'recipe-11', userId: createdUsers[1].id, rating: 4 },
        { recipeId: 'recipe-11', userId: createdUsers[3].id, rating: 5 },
        { recipeId: 'recipe-11', userId: createdUsers[5].id, rating: 4 },
        { recipeId: 'recipe-11', userId: createdUsers[7].id, rating: 4 },
        // Recipe-12: Greek Salad
        { recipeId: 'recipe-12', userId: createdUsers[2].id, rating: 5 },
        { recipeId: 'recipe-12', userId: createdUsers[4].id, rating: 4 },
        { recipeId: 'recipe-12', userId: createdUsers[6].id, rating: 5 },
        { recipeId: 'recipe-12', userId: createdUsers[9].id, rating: 5 },
        // Recipe-13: Boeuf Bourguignon
        { recipeId: 'recipe-13', userId: createdUsers[0].id, rating: 5 },
        { recipeId: 'recipe-13', userId: createdUsers[3].id, rating: 5 },
        { recipeId: 'recipe-13', userId: createdUsers[5].id, rating: 4 },
        { recipeId: 'recipe-13', userId: createdUsers[7].id, rating: 5 },
        { recipeId: 'recipe-13', userId: createdUsers[9].id, rating: 5 },
        // Recipe-14: Beeren-Torte - NEW with no ratings (edge case)
        // Recipe-15: Test Rezept - EDGE CASE with no ratings
    ];

    for (const r of ratingsData) {
        await prisma.userRating.upsert({
            where: { recipeId_userId: { recipeId: r.recipeId, userId: r.userId } },
            update: {},
            create: r,
        });
    }
    console.log('✅ Created ratings');

    // ============================================
    // FAVORITES - Extended
    // ============================================
    const favoritesData = [
        { recipeId: 'recipe-1', userId: createdUsers[1].id },
        { recipeId: 'recipe-1', userId: createdUsers[5].id },
        { recipeId: 'recipe-1', userId: createdUsers[7].id },
        { recipeId: 'recipe-2', userId: createdUsers[1].id },
        { recipeId: 'recipe-2', userId: createdUsers[6].id },
        { recipeId: 'recipe-2', userId: createdUsers[8].id },
        { recipeId: 'recipe-3', userId: createdUsers[0].id },
        { recipeId: 'recipe-3', userId: createdUsers[5].id },
        { recipeId: 'recipe-4', userId: createdUsers[3].id },
        { recipeId: 'recipe-4', userId: createdUsers[7].id },
        { recipeId: 'recipe-5', userId: createdUsers[6].id },
        { recipeId: 'recipe-5', userId: createdUsers[8].id },
        { recipeId: 'recipe-6', userId: createdUsers[0].id },
        { recipeId: 'recipe-6', userId: createdUsers[1].id },
        { recipeId: 'recipe-6', userId: createdUsers[7].id },
        { recipeId: 'recipe-7', userId: createdUsers[4].id },
        { recipeId: 'recipe-7', userId: createdUsers[9].id },
        { recipeId: 'recipe-8', userId: createdUsers[0].id },
        { recipeId: 'recipe-8', userId: createdUsers[2].id },
        { recipeId: 'recipe-8', userId: createdUsers[3].id },
        { recipeId: 'recipe-8', userId: createdUsers[5].id },
        { recipeId: 'recipe-9', userId: createdUsers[1].id },
        { recipeId: 'recipe-9', userId: createdUsers[4].id },
        { recipeId: 'recipe-9', userId: createdUsers[6].id },
        { recipeId: 'recipe-10', userId: createdUsers[0].id },
        { recipeId: 'recipe-10', userId: createdUsers[3].id },
        { recipeId: 'recipe-10', userId: createdUsers[7].id },
        { recipeId: 'recipe-10', userId: createdUsers[9].id },
        { recipeId: 'recipe-11', userId: createdUsers[5].id },
        { recipeId: 'recipe-11', userId: createdUsers[8].id },
        { recipeId: 'recipe-12', userId: createdUsers[2].id },
        { recipeId: 'recipe-12', userId: createdUsers[6].id },
        { recipeId: 'recipe-13', userId: createdUsers[0].id },
        { recipeId: 'recipe-13', userId: createdUsers[4].id },
        { recipeId: 'recipe-13', userId: createdUsers[9].id },
        // Recipe-14 and 15: NO FAVORITES (edge cases)
    ];

    for (const f of favoritesData) {
        await prisma.favorite.upsert({
            where: { recipeId_userId: { recipeId: f.recipeId, userId: f.userId } },
            update: {},
            create: f,
        });
    }
    console.log('✅ Created favorites');

    // ============================================
    // FOLLOWS - Extended
    // ============================================
    const followsData = [
        // Maria (0) follows and is followed
        { followerId: createdUsers[0].id, followingId: createdUsers[1].id },
        { followerId: createdUsers[1].id, followingId: createdUsers[0].id },
        { followerId: createdUsers[2].id, followingId: createdUsers[0].id },
        { followerId: createdUsers[3].id, followingId: createdUsers[0].id },
        { followerId: createdUsers[4].id, followingId: createdUsers[0].id },
        { followerId: createdUsers[5].id, followingId: createdUsers[0].id },
        { followerId: createdUsers[8].id, followingId: createdUsers[0].id },
        // Alex (1) follows and is followed
        { followerId: createdUsers[0].id, followingId: createdUsers[1].id },
        { followerId: createdUsers[2].id, followingId: createdUsers[1].id },
        { followerId: createdUsers[6].id, followingId: createdUsers[1].id },
        { followerId: createdUsers[7].id, followingId: createdUsers[1].id },
        // Chef (2) follows some
        { followerId: createdUsers[3].id, followingId: createdUsers[2].id },
        { followerId: createdUsers[5].id, followingId: createdUsers[2].id },
        // Emma (3) is popular
        { followerId: createdUsers[4].id, followingId: createdUsers[3].id },
        { followerId: createdUsers[6].id, followingId: createdUsers[3].id },
        { followerId: createdUsers[9].id, followingId: createdUsers[3].id },
        // Lukas (4) follows
        { followerId: createdUsers[7].id, followingId: createdUsers[4].id },
        { followerId: createdUsers[9].id, followingId: createdUsers[4].id },
        // More cross follows
        { followerId: createdUsers[5].id, followingId: createdUsers[6].id },
        { followerId: createdUsers[6].id, followingId: createdUsers[5].id },
        { followerId: createdUsers[7].id, followingId: createdUsers[9].id },
        { followerId: createdUsers[8].id, followingId: createdUsers[7].id },
    ];

    for (const fl of followsData) {
        await prisma.follow.upsert({
            where: {
                followerId_followingId: { followerId: fl.followerId, followingId: fl.followingId },
            },
            update: {},
            create: fl,
        });
    }
    console.log('✅ Created follows');

    // ============================================
    // COMMENTS - Extended
    // ============================================
    const commentsData = [
        // Recipe-1: Carbonara comments
        {
            recipeId: 'recipe-1',
            authorId: createdUsers[1].id,
            content: 'Absolut lecker! Wie in Rom!',
        },
        {
            recipeId: 'recipe-1',
            authorId: createdUsers[3].id,
            content: 'Perfekte Anleitung, hat sofort geklappt.',
        },
        {
            recipeId: 'recipe-1',
            authorId: createdUsers[5].id,
            content: 'Ich hab noch etwas Knoblauch hinzugefügt - mega lecker!',
        },
        {
            recipeId: 'recipe-1',
            authorId: createdUsers[7].id,
            content: 'Die Sauce wird so cremig, wow!',
        },
        // Recipe-2: Pizza comments
        {
            recipeId: 'recipe-2',
            authorId: createdUsers[4].id,
            content: 'Die beste Pizza die ich je gemacht habe!',
        },
        {
            recipeId: 'recipe-2',
            authorId: createdUsers[6].id,
            content: 'Teig muss wirklich 24h gehen, das hab ich gemerkt.',
        },
        {
            recipeId: 'recipe-2',
            authorId: createdUsers[8].id,
            content: 'Perfekt! Knuspriger Boden wie vom Italker.',
        },
        // Recipe-3: Curry comments
        {
            recipeId: 'recipe-3',
            authorId: createdUsers[5].id,
            content: 'Würzig und cremig - genau richtig!',
        },
        {
            recipeId: 'recipe-3',
            authorId: createdUsers[9].id,
            content: 'Hab statt Hähnchen Rind genommen, geht auch!',
        },
        // Recipe-4: Entenbrust comments
        {
            recipeId: 'recipe-4',
            authorId: createdUsers[7].id,
            content: 'Die Orangensauce ist der Wahnsinn!',
        },
        {
            recipeId: 'recipe-4',
            authorId: createdUsers[0].id,
            content: 'Knusprige Haut, saftiges Fleisch - perfekt!',
        },
        // Recipe-5: Stir-Fry comments
        {
            recipeId: 'recipe-5',
            authorId: createdUsers[6].id,
            content: 'So schnell fertig und so lecker!',
        },
        {
            recipeId: 'recipe-5',
            authorId: createdUsers[8].id,
            content: 'Mein neues Lieblings-Rezept für unter der Woche.',
        },
        // Recipe-6: Mousse comments
        {
            recipeId: 'recipe-6',
            authorId: createdUsers[0].id,
            content: 'Sooo cremig! Wird definitiv wieder gemacht.',
        },
        {
            recipeId: 'recipe-6',
            authorId: createdUsers[5].id,
            content: 'Der beste Schokoladenpudding ever!',
        },
        {
            recipeId: 'recipe-6',
            authorId: createdUsers[9].id,
            content: 'Hab ihn mit Espresso gemacht - Hammer!',
        },
        // Recipe-7: Pancakes comments
        {
            recipeId: 'recipe-7',
            authorId: createdUsers[4].id,
            content: 'Super fluffig! Kinders Liebling.',
        },
        {
            recipeId: 'recipe-7',
            authorId: createdUsers[6].id,
            content: 'Rezept zum Merken - so einfach und lecker.',
        },
        // Recipe-8: Entenbrust Spätzle comments
        {
            recipeId: 'recipe-8',
            authorId: createdUsers[3].id,
            content: 'Aufwändig aber lohnt sich sooo!',
        },
        {
            recipeId: 'recipe-8',
            authorId: createdUsers[5].id,
            content: 'Die Sauce ist perfekt geworden!',
        },
        {
            recipeId: 'recipe-8',
            authorId: createdUsers[9].id,
            content: 'Deutsch-italienische Fusion - warum nicht!',
        },
        // Recipe-9: Thai Curry comments
        {
            recipeId: 'recipe-9',
            authorId: createdUsers[1].id,
            content: 'Genau die richtige Schärfe!',
        },
        {
            recipeId: 'recipe-9',
            authorId: createdUsers[4].id,
            content: 'Hab Tofu statt Fleisch genommen - geht super!',
        },
        // Recipe-10: Tiramisu comments
        {
            recipeId: 'recipe-10',
            authorId: createdUsers[0].id,
            content: 'Besser als im Restaurant!',
        },
        {
            recipeId: 'recipe-10',
            authorId: createdUsers[6].id,
            content: 'Muss 24h durchziehen, das ist der Trick.',
        },
        {
            recipeId: 'recipe-10',
            authorId: createdUsers[8].id,
            content: 'Meine Gäste waren begeistert!',
        },
        // Recipe-11: Avocado Toast comments
        { recipeId: 'recipe-11', authorId: createdUsers[3].id, content: 'Perfektes Frühstück!' },
        {
            recipeId: 'recipe-11',
            authorId: createdUsers[7].id,
            content: 'So einfach und trotzdem fancy.',
        },
        // Recipe-12: Greek Salad comments
        {
            recipeId: 'recipe-12',
            authorId: createdUsers[2].id,
            content: 'Der Feta muss wirklich griechisch sein!',
        },
        {
            recipeId: 'recipe-12',
            authorId: createdUsers[9].id,
            content: 'Ideal für heiße Sommertage.',
        },
        // Recipe-13: Boeuf Bourguignon comments
        {
            recipeId: 'recipe-13',
            authorId: createdUsers[3].id,
            content: 'Muss wirklich 3 Stunden schmoren, lohnt sich!',
        },
        {
            recipeId: 'recipe-13',
            authorId: createdUsers[7].id,
            content: 'Hab es mit Kartoffeln statt Spätzle gemacht.',
        },
        // Recipe-14: Beeren-Torte - NO COMMENTS (brand new!)
        // Recipe-15: Test Rezept - NO COMMENTS (edge case)
    ];

    for (const c of commentsData) {
        await prisma.comment.create({ data: c });
    }
    console.log('✅ Created comments');

    // ============================================
    // ACTIVITY LOGS - Extended with lots of interactions
    // ============================================
    const activitiesData = [
        // Recipe creations
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-12',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[9].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-14',
            targetType: 'recipe',
        }, // NEW recipe
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_CREATED,
            targetId: 'recipe-15',
            targetType: 'recipe',
        }, // edge case
        // Cook activities - many people cooking various recipes
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-5',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-5',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[9].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[9].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-12',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-12',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_COOKED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        // Recipe-14: Beeren-Torte - just created, NO cooking yet (brand new!)
        // Recipe-15: Test Rezept - NO cooking (edge case)
        // Ratings activities
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[9].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-5',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-5',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-12',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_RATED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        // Favorites activities
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-5',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[9].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[8].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-12',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_FAVORITED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        // Comment activities
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-1',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-2',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-3',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[7].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-4',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-5',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-6',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[4].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-7',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-8',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[1].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-9',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[0].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-10',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-11',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-12',
            targetType: 'recipe',
        },
        {
            userId: createdUsers[3].id,
            type: ActivityType.RECIPE_COMMENTED,
            targetId: 'recipe-13',
            targetType: 'recipe',
        },
        // Follow activities
        {
            userId: createdUsers[0].id,
            type: ActivityType.USER_FOLLOWED,
            targetId: createdUsers[1].id,
            targetType: 'user',
        },
        {
            userId: createdUsers[2].id,
            type: ActivityType.USER_FOLLOWED,
            targetId: createdUsers[0].id,
            targetType: 'user',
        },
        {
            userId: createdUsers[5].id,
            type: ActivityType.USER_FOLLOWED,
            targetId: createdUsers[0].id,
            targetType: 'user',
        },
        {
            userId: createdUsers[6].id,
            type: ActivityType.USER_FOLLOWED,
            targetId: createdUsers[1].id,
            targetType: 'user',
        },
        {
            userId: createdUsers[9].id,
            type: ActivityType.USER_FOLLOWED,
            targetId: createdUsers[3].id,
            targetType: 'user',
        },
    ];

    for (const a of activitiesData) {
        await prisma.activityLog.create({ data: a as any });
    }
    console.log('✅ Created activity logs');

    // ============================================
    // NOTIFICATIONS - Extended
    // ============================================
    const notificationsData = [
        {
            userId: createdUsers[0].id,
            type: NotificationType.NEW_FOLLOWER,
            title: 'Neuer Follower',
            message: 'Alex Chen folgt dir jetzt',
        },
        {
            userId: createdUsers[0].id,
            type: NotificationType.RECIPE_RATING,
            title: 'Neue Bewertung',
            message: 'Jemand hat dein Rezept bewertet',
        },
        {
            userId: createdUsers[1].id,
            type: NotificationType.NEW_FOLLOWER,
            title: 'Neuer Follower',
            message: 'Sophie Meyer folgt dir jetzt',
        },
        {
            userId: createdUsers[0].id,
            type: NotificationType.RECIPE_RATING,
            title: '5 Sterne!',
            message: 'Jemand hat Spaghetti Carbonara mit 5 Sternen bewertet',
        },
        {
            userId: createdUsers[1].id,
            type: NotificationType.RECIPE_RATING,
            title: 'Neue Bewertung',
            message: 'Jemand hat Thai Green Curry bewertet',
        },
        {
            userId: createdUsers[3].id,
            type: NotificationType.NEW_FOLLOWER,
            title: 'Neuer Follower',
            message: 'Max Bauer folgt dir jetzt',
        },
        {
            userId: createdUsers[0].id,
            type: NotificationType.RECIPE_COMMENT,
            title: 'Neuer Kommentar',
            message: 'Maria Rossi hat einen Kommentar hinterlassen',
        },
        {
            userId: createdUsers[1].id,
            type: NotificationType.RECIPE_COMMENT,
            title: 'Neuer Kommentar',
            message: 'Emma Schmidt hat dein Rezept kommentiert',
        },
        {
            userId: createdUsers[3].id,
            type: NotificationType.RECIPE_RATING,
            title: 'Perfekte Bewertung',
            message: 'Dein Tiramisu hat 5 Sterne bekommen!',
        },
        {
            userId: createdUsers[5].id,
            type: NotificationType.NEW_FOLLOWER,
            title: 'Neuer Follower',
            message: 'Laura sweet folgt dir jetzt',
        },
        {
            userId: createdUsers[9].id,
            type: NotificationType.RECIPE_RATING,
            title: 'Neue Bewertung',
            message: 'Jemand hat Boeuf Bourguignon bewertet',
        },
        {
            userId: createdUsers[0].id,
            type: NotificationType.WEEKLY_PLAN_REMINDER,
            title: 'Wochenplan',
            message: 'Vergiss nicht, deinen Wochenplan zu erstellen!',
        },
    ];

    for (const n of notificationsData) {
        await prisma.notification.create({ data: n as any });
    }
    console.log('✅ Created notifications');

    // ============================================
    // MEAL PLANS
    // ============================================
    await prisma.mealPlan.create({
        data: {
            userId: createdUsers[0].id,
            name: 'Wochenplan KW 12',
            startDate: new Date('2026-03-16'),
            endDate: new Date('2026-03-22'),
            meals: {
                create: [
                    {
                        recipeId: 'recipe-1',
                        date: new Date('2026-03-16'),
                        mealType: 'DINNER',
                        servings: 4,
                    },
                    {
                        recipeId: 'recipe-3',
                        date: new Date('2026-03-17'),
                        mealType: 'DINNER',
                        servings: 4,
                    },
                    {
                        recipeId: 'recipe-5',
                        date: new Date('2026-03-18'),
                        mealType: 'DINNER',
                        servings: 2,
                    },
                    {
                        recipeId: 'recipe-4',
                        date: new Date('2026-03-19'),
                        mealType: 'DINNER',
                        servings: 4,
                    },
                    {
                        recipeId: 'recipe-7',
                        date: new Date('2026-03-20'),
                        mealType: 'BREAKFAST',
                        servings: 4,
                    },
                    {
                        recipeId: 'recipe-6',
                        date: new Date('2026-03-21'),
                        mealType: 'DINNER',
                        servings: 4,
                    },
                ],
            },
        },
    });
    console.log('✅ Created meal plan');

    // ============================================
    // SHOPPING LIST
    // ============================================
    const mealPlan = await prisma.mealPlan.findFirst({ where: { userId: createdUsers[0].id } });
    if (mealPlan) {
        await prisma.shoppingList.create({
            data: {
                userId: createdUsers[0].id,
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
                            name: 'Rinderhack',
                            amount: '500',
                            unit: 'g',
                            category: ShoppingCategory.FLEISCH,
                        },
                        {
                            name: 'Kokosmilch',
                            amount: '400',
                            unit: 'ml',
                            category: ShoppingCategory.SONSTIGES,
                        },
                        {
                            name: 'Schokolade',
                            amount: '200',
                            unit: 'g',
                            category: ShoppingCategory.BACKEN,
                        },
                    ],
                },
            },
        });
    }
    console.log('✅ Created shopping list');

    // ============================================
    // VIEW HISTORY
    // ============================================
    const viewHistoryData = [
        { userId: createdUsers[0].id, recipeId: 'recipe-1' },
        { userId: createdUsers[0].id, recipeId: 'recipe-2' },
        { userId: createdUsers[0].id, recipeId: 'recipe-6' },
        { userId: createdUsers[1].id, recipeId: 'recipe-3' },
        // Recipe-8 (Entenbrust) view history - lots of views!
        { userId: createdUsers[0].id, recipeId: 'recipe-8' },
        { userId: createdUsers[1].id, recipeId: 'recipe-8' },
        { userId: createdUsers[2].id, recipeId: 'recipe-8' },
        { userId: createdUsers[3].id, recipeId: 'recipe-8' },
        { userId: createdUsers[4].id, recipeId: 'recipe-8' },
    ];

    for (const vh of viewHistoryData) {
        await prisma.userViewHistory.create({ data: vh }).catch(() => {});
    }
    console.log('✅ Created view history');

    console.log('🎉 Comprehensive seed completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
