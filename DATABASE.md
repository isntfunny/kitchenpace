# KitchenPace Database Documentation

## Overview

This document describes the PostgreSQL database schema for KitchenPace (KüchenTakt), a recipe application that transforms traditional linear recipes into interactive visual flow diagrams.

## Search index layer

While PostgreSQL remains the source of truth, an OpenSearch cluster (available via `docker-compose`) mirrors the published `Recipe` data so that filters, tag counts, and numeric distributions can be answered without expensive Prisma joins. A background sync job (`npm run opensearch:sync`) performs batch upserts/deletes and keeps the `recipes` index aligned with the published data in near real time.

## Project Context

### Technology Stack

| Category    | Technology                 |
| ----------- | -------------------------- |
| Framework   | Next.js 16 (App Router)    |
| UI Library  | Radix UI + Panda CSS       |
| Database    | PostgreSQL                 |
| ORM         | Prisma 7                   |
| Flow Editor | React Flow (@xyflow/react) |
| Auth        | Logto                      |
| Storage     | S3 (MinIO)                 |

### Core Features (from KUC-1 MVP)

- Recipe creation with image upload
- Workflow steps using React Flow with lanes
- Ingredients list
- Tags (auto-assigned via AI)
- Category (Backen / Kochen / Getränk / Beilage)
- Recipe search
- Recipe ratings
- User registration
- Homepage with: Daily Highlight, Neuste Rezepte, Top Rated, "Passt zu jetzt", Saisonal

---

## Schema Overview

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                    User                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ id, name, email, image, hashedPassword                                     │
│ isActive, activationToken, resetToken, resetTokenExpiry                    │
│                                                                             │
│ 1:1 Profile ─────────┐                                                    │
│ 1:m Recipe ──────────┼────────────────────────────────────────────────────┤
│ 1:m Comment ─────────┤                                                    │
│ 1:m UserRating ──────┤    ┌──────────────┐    ┌─────────────────────┐   │
│ 1:m Favorite ────────┤    │    Follow    │    │   Notification     │   │
│ 1:m Follow ─────────┼───►│ followerId   │◄───│ userId             │   │
│                      │    │ followingId  │    │ type               │   │
│ 1:m MealPlan ───────┤    └──────────────┘    │ title, message    │   │
│ 1:m ShoppingList ───┤                          └─────────────────────┘   │
│ 1:m ActivityLog ────┤                                                    │
│ 1:m PinnedFavorite ┤    ┌──────────────┐    ┌─────────────────────┐   │
│ 1:m CookHistory ────┤    │ CookImage   │    │  UserCookHistory   │   │
│ 1:m CookImage ──────┘    │ recipeId    │    │ userId, recipeId   │   │
│                          │ userId      │    │ imageUrl           │   │
│                          └──────────────┘    └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                 Recipe                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ id, title, slug, description, imageUrl, imageKey                          │
│ blurhash, imageWidth, imageHeight                                          │
│ servings, prepTime, cookTime, totalTime, difficulty                       │
│ rating, ratingCount, viewCount, cookCount                                  │
│ status, publishedAt                                                         │
│ flowNodes (JSON), flowEdges (JSON)  ◄── Core feature                     │
│                                                                             │
│ m:1 Author (User) ─────────────────────────────────────────────────────┐   │
│ m:m Category (via RecipeCategory) ──────────────────────────────────────┤   │
│ 1:m RecipeIngredient ───────────────────────────────────────────────────┤   │
│   └── 1:1 Ingredient (master) ◄─── 1:m shoppingItems                  │   │
│ 1:m Comment  ───────────────────────────────────────────────────────────┤   │
│ 1:m UserRating ────────────────────────────────────────────────────────┤   │
│ 1:m Favorite ───────────────────────────────────────────────────────────┤   │
│ 1:m RecipeTag ──────────────────────────────────────────────────────────┤   │
│ 1:m MealPlanRecipe ────────────────────────────────────────────────────┤   │
│ 1:m UserViewHistory ───────────────────────────────────────────────────┤   │
│ 1:m PinnedFavorite ─────────────────────────────────────────────────────┤   │
│ 1:m CookImage ─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Models Detail

### 1. User & Authentication

#### User

```prisma
model User {
  id              String    @id @default(cuid())
  name            String?
  email           String?   @unique
  emailVerified   DateTime?
  image           String?
  hashedPassword  String?
  isActive        Boolean   @default(false) // Must be activated via email
  activationToken String?
  resetToken      String?
  resetTokenExpiry DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  accounts        Account[]
  sessions        Session[]
  profile        Profile?
  recipes        Recipe[]
  comments       Comment[]
  ratings        UserRating[]
  favorites      Favorite[]
  followedBy     Follow[]   @relation("FollowedBy")
  following      Follow[]   @relation("Following")
  notifications  Notification[]
  mealPlans      MealPlan[]
  shoppingLists  ShoppingList[]
  activities     ActivityLog[]
  viewHistory    UserViewHistory[]
  cookHistory    UserCookHistory[]
  pinnedFavorites PinnedFavorite[]
  cookImages     CookImage[]
}
```

**Usage in Components:**

- `/app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `/app/api/auth/register/route.ts` - User registration
- `/app/profile/page.tsx` - User profile display with dashboard insights

#### Profile

```prisma
model Profile {
  id             String   @id @default(cuid())
  userId         String   @unique
  email          String
  nickname       String?
  teaser         String?
  photoUrl       String?
  bio            String?
  followerCount  Int      @default(0)
  followingCount Int      @default(0)
  recipeCount    Int      @default(0)
  ratingsPublic   Boolean  @default(true)
  followsPublic   Boolean  @default(true)
  favoritesPublic Boolean  @default(true)
  showInActivity  Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

**Design Decision:**

- Cached counts for performance (updated via triggers/application logic)
- Three privacy toggles (`ratingsPublic`, `followsPublic`, `favoritesPublic`) let users decide what activity is visible to others

**Usage in Components:**

- `/components/dashboard/UserDashboard.tsx` - User profile in dashboard
- `/app/user/[id]/UserProfileClient.tsx` - Public profile page
- `/components/features/HeaderAuth.tsx` - Header with user info

#### Account, Session

Standard NextAuth models for OAuth providers.

---

### 2. Recipe & Flow Data

#### Recipe (Core Model)

```prisma
model Recipe {
  id           String      @id @default(cuid())
  title        String
  slug         String      @unique
  description  String?
  imageUrl     String?
  imageKey     String?
  blurhash     String?
  imageWidth   Int?
  imageHeight  Int?
  servings     Int         @default(4)
  prepTime     Int         @default(0)
  cookTime     Int         @default(0)
  totalTime    Int         @default(0)
  difficulty   Difficulty  @default(MEDIUM)
  status       RecipeStatus @default(DRAFT)
  publishedAt  DateTime?
  rating       Float       @default(0)
  ratingCount  Int         @default(0)
  viewCount    Int         @default(0)
  cookCount    Int         @default(0)

  // Flow data stored as JSON
  flowNodes    Json?
  flowEdges    Json?

  authorId     String
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  // Relations
  author       User        @relation(fields: [authorId], references: [id], onDelete: Cascade)
  categories   RecipeCategory[]
  recipeIngredients RecipeIngredient[]
  comments     Comment[]
  ratings      UserRating[]
  favorites    Favorite[]
  tags         RecipeTag[]
  mealPlanRecipes MealPlanRecipe[]
  shoppingItems ShoppingItem[]
  userViewHistory UserViewHistory[]
  cookHistory  UserCookHistory[]
  pinnedFavorites PinnedFavorite[]
  cookImages   CookImage[]

  @@index([authorId])
  @@index([difficulty])
  @@index([createdAt])
  @@index([rating])
  @@index([status])
}
```

**Design Decision:**

1. `flowNodes` and `flowEdges` stored as JSON rather than separate tables because the data is tightly coupled, queried together, and needs to evolve quickly without schema churn.
2. `rating`, `ratingCount`, `viewCount`, and `cookCount` stay on the recipe for fast sorting/filtering, but every rating, view, and cook is also logged in normalized tables to allow per-user history and rebuilding the aggregates when needed.

**Flow Node Structure (Frontend TypeScript):**

```typescript
interface FlowNode {
    id: string;
    type: 'prep' | 'cook' | 'wait' | 'season' | 'combine' | 'serve';
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
```

**Usage in Components:**

- `/app/recipe/[id]/RecipeDetailClient.tsx` - Recipe detail page
- `/app/recipe/[id]/data.ts` - Mock recipe data
- `/components/flow/RecipeFlow.tsx` - React Flow visualization
- `/components/features/RecipeCard.tsx` - Recipe card display
- `/components/dashboard/DashboardRecentRecipes.tsx` - Recent recipes

#### Ingredient (Master List + Recipe-specific)

```prisma
model Ingredient {
  id        String            @id @default(cuid())
  name      String
  slug      String            @unique
  category  ShoppingCategory?  // For grouping (Gemüse, Fleisch, etc.)
  units     String[]          // Available units: ["g", "kg", "oz"], ["ml", "l"], etc.
  recipes   RecipeIngredient[]
  shoppingItems ShoppingItem[]
  createdAt DateTime          @default(now())

  @@index([name])
  @@index([slug])
}

model RecipeIngredient {
  id           String    @id @default(cuid())
  recipeId     String
  ingredientId String
  amount       String    // Recipe-specific: "400", "1/2", "2-3"
  unit         String    // Selected unit from ingredient.units
  notes        String?   // "finely chopped", "room temperature", etc.
  position     Int       @default(0)
  isOptional   Boolean   @default(false)

  recipe       Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([recipeId, ingredientId])
  @@index([recipeId])
  @@index([ingredientId])
}
```

**Design Decisions:**

- **Ingredient (master):** Reusable across recipes, stores category and available units
- **RecipeIngredient (junction):** Recipe-specific amount, selected unit, notes
- **units String[]:** Allows multiple unit options per ingredient (e.g., `["g", "kg", "oz"]`)
- **notes:** For recipe-specific instructions like "finely chopped", "room temperature"
- **isOptional:** Mark optional ingredients

\*\*Usage in Components:

- `/app/recipe/[id]/RecipeDetailClient.tsx` - Ingredients list display
- `/app/recipe/[id]/data.ts` - Mock ingredients data

---

### 3. Categories & Tags

#### Category

```prisma
model Category {
  id          String   @id @default(cuid())
  name        String   @unique
  slug        String   @unique
  description String?
  imageUrl    String?
  color       String?  // Hex color for UI theming
  createdAt   DateTime @default(now())

  recipes RecipeCategory[]
}

model RecipeCategory {
  recipeId   String
  categoryId String
  position   Int      @default(0) // For ordering categories

  recipe   Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([recipeId, categoryId])
  @@index([recipeId])
  @@index([categoryId])
}
```

**Categories:** Hauptgericht, Beilage, Backen, Getränk, Dessert, Frühstück

**Usage in Components:**

- `/app/recipe/[id]/RecipeDetailClient.tsx` - Category badge
- `/components/features/RecipeCard.tsx` - Category display

#### Tag (Many-to-Many)

```prisma
model Tag {
  id        String      @id @default(cuid())
  name      String      @unique
  slug      String      @unique
  recipes   RecipeTag[]
  createdAt DateTime    @default(now())
}

model RecipeTag {
  recipeId String
  tagId    String
  createdAt DateTime @default(now())

  recipe   Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  tag      Tag    @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([recipeId, tagId])
}
```

**Usage in Components:**

- `/app/recipe/[id]/RecipeDetailClient.tsx` - Recipe tags
- `/components/features/TrendingTags.tsx` - Trending tags sidebar

#### Comment

```prisma
model Comment {
  id        String   @id @default(cuid())
  content   String
  imageUrl  String?
  recipeId  String
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  author User   @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([recipeId])
  @@index([authorId])
}
```

---

### 4. Social Features

#### UserRating

```prisma
model UserRating {
  id        String   @id @default(cuid())
  recipeId  String
  userId    String
  rating    Int      // 1-5
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([recipeId, userId])
  @@index([recipeId])
  @@index([userId])
}
```

**Design Decision:** Individual ratings stored separately for:

- Preventing duplicate ratings
- Calculating weighted averages
- User can change their rating

**Usage in Components:**

- `/components/features/ActivitySidebar.tsx` - Rating activities
- `/components/dashboard/DashboardRecentRecipes.tsx` - Recipe ratings

#### Favorite

```prisma
model Favorite {
  id        String   @id @default(cuid())
  recipeId  String
  userId    String
  createdAt DateTime @default(now())

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([recipeId, userId])
  @@index([userId])
}
```

**Usage in Components:**

- `/app/recipe/[id]/RecipeDetailClient.tsx` - Save/favorite button
- `/components/dashboard/DashboardRecentRecipes.tsx` - Favorite filter

#### Follow

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())

  follower    User     @relation("FollowedBy", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("Following", fields: [followingId], references: [id], onDelete: Cascade)

  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}
```

**Design Decision:** Simple follow system (full, no requests) as per user selection.

**Usage in Components:**

- `/app/user/[id]/UserProfileClient.tsx` - Follow button, follower count
- `/app/recipe/[id]/RecipeDetailClient.tsx` - Author follow button

#### Notification

```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  title     String
  message   String
  data      Json?
  read      Boolean          @default(false)
}

enum NotificationType {
  NEW_FOLLOWER
  RECIPE_LIKE
  RECIPE_COMMENT
  RECIPE_RATING
  WEEKLY_PLAN_REMINDER
  SYSTEM
}
```

---

### 5. Meal Planning

#### MealPlan

```prisma
model MealPlan {
  id        String             @id @default(cuid())
  userId    String
  name      String?             // "Wochenplan KW 12"
  startDate DateTime
  endDate   DateTime
  meals     MealPlanRecipe[]
  shoppingLists ShoppingList[]
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, startDate])
}

model MealPlanRecipe {
  id          String      @id @default(cuid())
  mealPlanId  String
  recipeId    String
  date        DateTime
  mealType    MealType
  servings    Int         @default(4)
  status      MealStatus  @default(PLANNED)
  notes       String?

  mealPlan    MealPlan    @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  recipe      Recipe      @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([mealPlanId])
  @@index([recipeId])
}
```

**Usage in Components:**

- `/components/dashboard/DashboardToday.tsx` - Today's cooking timeline
- `/components/features/WeeklyPlanDialog.tsx` - Weekly plan dialog

---

### 6. Shopping Lists

#### ShoppingList & ShoppingItem

```prisma
model ShoppingList {
  id          String          @id @default(cuid())
  userId      String
  name        String?
  mealPlanId  String?
  items       ShoppingItem[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  user        User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  mealPlan    MealPlan?       @relation(fields: [mealPlanId], references: [id], onDelete: SetNull)

  @@index([userId])
}

model ShoppingItem {
  id             String           @id @default(cuid())
  shoppingListId String
  recipeId       String?          // Original recipe (optional)
  ingredientId   String?          // Master ingredient (optional)
  name           String           // Display name (fallback)
  amount         String?
  unit           String?
  category       ShoppingCategory @default(SONSTIGES)
  checked        Boolean           @default(false)
  position       Int               @default(0)

  shoppingList   ShoppingList      @relation(fields: [shoppingListId], references: [id], onDelete: Cascade)
  recipe         Recipe?          @relation(fields: [recipeId], references: [id], onDelete: SetNull)
  ingredient     Ingredient?      @relation(fields: [ingredientId], references: [id], onDelete: SetNull)

  @@index([shoppingListId])
}
```

**Design Decision:** Linked to MealPlan for auto-generation from planned recipes.

**Usage in Components:**

- `/components/dashboard/DashboardShoppingList.tsx` - Shopping list display

---

### 7. Activity & Tracking

#### ActivityLog

```prisma
model ActivityLog {
  id         String       @id @default(cuid())
  userId     String
  type       ActivityType
  targetId   String?
  targetType String?
  metadata   Json?
  createdAt  DateTime     @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, createdAt])
  @@index([createdAt])
}

enum ActivityType {
  RECIPE_CREATED
  RECIPE_COOKED
  RECIPE_RATED
  RECIPE_COMMENTED
  RECIPE_FAVORITED
  RECIPE_UNFAVORITED
  USER_FOLLOWED
  SHOPPING_LIST_CREATED
  MEAL_PLAN_CREATED
}
```

**Design Decision:** Append-only log for fast activity feed queries.

**Usage in Components:**

- `/components/features/ActivitySidebar.tsx` - Activity feed sidebar
- `/app/recipe/[id]/RecipeDetailClient.tsx` - Recipe activities

#### UserViewHistory

```prisma
model UserViewHistory {
  id        String   @id @default(cuid())
  userId    String
  recipeId  String
  viewedAt  DateTime @default(now())
  pinned    Boolean  @default(false)

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([userId, recipeId])
  @@index([userId])
  @@index([recipeId])
  @@index([userId, viewedAt])
}
```

**Usage:** Append-only per-user view log powering "Recently viewed", personalized recommendations, frequency tracking, and analytics.

#### UserCookHistory

```prisma
model UserCookHistory {
  id        String   @id @default(cuid())
  userId    String
  recipeId  String
  cookedAt  DateTime @default(now())
  servings  Int?
  notes     String?
  imageUrl  String?  // User's photo of the cooked meal
  imageKey  String?  // S3 key for the image

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([recipeId])
  @@index([userId, cookedAt])
}
```

**Usage:** Tracks each time a user cooks a recipe so we can show cook streaks, rebuild `cookCount`, and highlight favorite dishes.

---

### 8. Cook Images (User-submitted photos)

#### CookImage

```prisma
model CookImage {
  id          String   @id @default(cuid())
  recipeId    String
  userId      String
  imageUrl    String
  imageKey    String?  // S3 key for the image
  blurhash    String?
  caption     String?
  createdAt   DateTime @default(now())

  recipe      Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([recipeId])
  @@index([userId])
  @@index([createdAt])
}
```

---

### 9. Pinned Favorites (KUC-5)

#### PinnedFavorite

```prisma
model PinnedFavorite {
  id        String   @id @default(cuid())
  userId    String
  recipeId  String
  position  Int      // 0, 1, or 2 (max 3)
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@unique([userId, position])
  @@unique([userId, recipeId])
  @@index([userId])
}
```

**Design Decision:** Max 3 pinned favorites for submenu quick access (KUC-5 requirement).

---

## Migration Strategy

### Phase 1: Core Foundation

1. Run `prisma db push` to create tables
2. Categories and Tags
3. Recipes with flow JSON
4. Ingredients

### Phase 2: Social Features

5. Follow system
6. Favorites
7. Ratings
8. Notifications
9. Pinned favorites

### Phase 3: Activity & Tracking

10. Activity logs
11. View history

### Phase 4: Planning & Shopping

12. Meal plans
13. Shopping lists

---

## Running the Database

### Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed demo data
npm run db:seed

# Reset and reseed
npm run db:reset
```

### Demo Data Included

- 3 users (Maria Rossi, Alex Koch, KitchenPace Chef)
- 4 recipes with full flow diagrams:
    - Classic Pasta Carbonara (30 min, medium)
    - Beef Stir Fry (25 min, easy)
    - Homemade Pizza (90 min, hard)
    - Entenbrust mit Spätzle (75 min, hard)
- Categories: Hauptgericht, Beilage, Backen, Getränk, Dessert, Frühstück
- Tags: Italienisch, Deutsch, Schnell, Vegetarisch, etc.
- Follows, ratings, favorites
- Sample meal plan and shopping list
- Activity logs and notifications

---

## API Routes Using Database

| Route                     | Models Used            |
| ------------------------- | ---------------------- |
| `/api/auth/register`      | User, Profile          |
| `/api/auth/[...nextauth]` | User, Account, Session |
| `/api/upload`             | Recipe (imageUrl)      |
| `/api/profile`            | User, Profile          |

---

## Frontend Components Using Data

| Component               | Data Models                                                |
| ----------------------- | ---------------------------------------------------------- |
| `RecipeDetailClient`    | Recipe, Ingredient, Category, Tag, User, Comment, Favorite |
| `RecipeFlow`            | Recipe.flowNodes, Recipe.flowEdges                         |
| `RecipeCard`            | Recipe (title, image, rating, category)                    |
| `UserProfileClient`     | User, Profile, Follow, Recipe                              |
| `DashboardToday`        | MealPlan, MealPlanRecipe                                   |
| `DashboardShoppingList` | ShoppingList, ShoppingItem                                 |
| `ActivitySidebar`       | ActivityLog                                                |
| `TrendingTags`          | Tag                                                        |
| `WeeklyPlanDialog`      | MealPlan                                                   |

---

## Design Decisions Summary

1. **JSON for Flow Data:** Flow nodes/edges stored as JSON rather than separate table because they're tightly coupled and queried together.

2. **Cached Counts:** Profile followerCount, recipeCount stored for performance (updated via application logic).

3. **String Amounts:** Ingredients use String for amounts to handle fractions ("1/2") and ranges.

4. **Separate Ingredient Tables:** Master ingredient list + recipe-specific junction table with:
    - `units String[]` for multiple unit options per ingredient
    - `notes` for recipe-specific instructions
    - `isOptional` flag

5. **Append-Only ActivityLog:** Single table for all activities rather than aggregating from source tables for faster reads.

6. **Max 3 Pinned Favorites:** KUC-5 requirement - limited to 3 for submenu UI.

7. **MealPlan → ShoppingList:** Shopping list can be auto-generated from meal plan recipes.

8. **Event Logs + Aggregates:** Keep `rating`, `viewCount`, `cookCount` on `Recipe` for fast ordering, but also store every rating/view/cook event in their own tables so per-user history and analytics stay accurate.
