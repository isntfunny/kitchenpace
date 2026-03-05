# MJML Email Templates

This directory contains email templates in MJML (Mailjet Markup Language) format, ready for import into Notifuse.

## Notifuse Integration

These templates use **Liquid templating** syntax for dynamic variables, which is supported by Notifuse.

### Variable Syntax

| Type              | Syntax                                 | Example                                           |
| ----------------- | -------------------------------------- | ------------------------------------------------- |
| Contact fields    | `{{ contact.field }}`                  | `{{ contact.first_name }}`, `{{ contact.email }}` |
| Subject (preview) | `{{{ subject }}}`                      | `{{{ subject }}}`                                 |
| Message/Text      | `{{{ message }}}`                      | `{{{ message }}}`                                 |
| Button            | `{{ buttonText }}`, `{{ buttonLink }}` | `{{ buttonText }}`, `{{ buttonLink }}`            |
| System URLs       | `{{ unsubscribe_url }}`                | `{{ unsubscribe_url }}`                           |

### Triple Braces vs Double Braces

- Use `{{{ variable }}}` for variables that may contain HTML (e.g., message content)
- Use `{{ variable }}` for plain text variables (e.g., names, URLs)

## Template Files

| Template                 | Description                                                  |
| ------------------------ | ------------------------------------------------------------ |
| `generic.mjml`           | Reusable template with subject, message, and optional button |
| `weekly-newsletter.mjml` | Weekly recipe digest with latest and top-rated recipes       |
| `welcome.mjml`           | Welcome email for new users                                  |
| `recipe-of-the-day.mjml` | Daily recipe recommendation                                  |

### weekly-newsletter.mjml Variables

This template uses **Liquid loops** to render recipe cards dynamically.

#### Required Variables

| Variable              | Type   | Description                                        |
| --------------------- | ------ | -------------------------------------------------- |
| `contact.first_name`  | string | Recipient's first name                             |
| `latest_recipes`      | array  | Array of latest recipes (3 recipes recommended)    |
| `top_recipes`         | array  | Array of top-rated recipes (3 recipes recommended) |
| `trending_recipes`    | array  | Array of trending recipes (3 recipes recommended)  |
| `categoryCookingUrl`  | string | URL to cooking recipes category                    |
| `categoryBakingUrl`   | string | URL to baking recipes category                     |
| `categorySideDishUrl` | string | URL to side dishes category                        |
| `unsubscribe_url`     | string | Link to unsubscribe                                |

#### Recipe Object Structure

Each recipe in `latest_recipes`, `top_recipes`, and `trending_recipes` should have:

```json
{
    "name": "Pasta Carbonara",
    "description": "Cremige Pasta mit Speck und Parmesan",
    "image_url": "https://example.com/recipes/pasta-carbonara.jpg",
    "url": "https://kitchenpace.de/recipe/pasta-carbonara",
    "time_minutes": 25,
    "difficulty": "Einfach",
    "rating": 4.8
}
```

#### Example API Payload

```json
{
    "contact": { "first_name": "Maria" },
    "latest_recipes": [
        {
            "name": "Spaghetti Carbonara",
            "description": "Cremige italienische Pasta mit Eiern, Käse und knusprigem Speck",
            "image_url": "https://kitchenpace.de/images/carbonara.jpg",
            "url": "https://kitchenpace.de/recipe/spaghetti-carbonara",
            "time_minutes": 25,
            "difficulty": "Einfach"
        },
        {
            "name": "Ramen Suppe",
            "description": "Traditionelle japanische Brühe mit Nudeln",
            "image_url": "https://kitchenpace.de/images/ramen.jpg",
            "url": "https://kitchenpace.de/recipe/ramen-suppe",
            "time_minutes": 45,
            "difficulty": "Mittel"
        },
        {
            "name": "Pizza Margherita",
            "description": "Klassische italienische Pizza mit Tomaten und Mozzarella",
            "image_url": "https://kitchenpace.de/images/pizza.jpg",
            "url": "https://kitchenpace.de/recipe/pizza-margherita",
            "time_minutes": 60,
            "difficulty": "Mittel"
        }
    ],
    "top_recipes": [
        {
            "name": "Boeuf Bourguignon",
            "description": "Französisches Rindfleischgericht mit Rotwein",
            "image_url": "https://kitchenpace.de/images/boeuf.jpg",
            "url": "https://kitchenpace.de/recipe/boeuf-bourguignon",
            "time_minutes": 180,
            "difficulty": "Schwer",
            "rating": 4.9
        },
        {
            "name": "Tiramisu",
            "description": "Italienisches Dessert mit Mascarpone und Espresso",
            "image_url": "https://kitchenpace.de/images/tiramisu.jpg",
            "url": "https://kitchenpace.de/recipe/tiramisu",
            "time_minutes": 30,
            "difficulty": "Einfach",
            "rating": 4.8
        },
        {
            "name": "Sushi",
            "description": "Japanische Reisspezialität mit frischem Fisch",
            "image_url": "https://kitchenpace.de/images/sushi.jpg",
            "url": "https://kitchenpace.de/recipe/sushi",
            "time_minutes": 60,
            "difficulty": "Schwer",
            "rating": 4.7
        }
    ],
    "categoryCookingUrl": "https://kitchenpace.de/category/kochen",
    "categoryBakingUrl": "https://kitchenpace.de/category/backen",
    "categorySideDishUrl": "https://kitchenpace.de/category/beilage",
    "unsubscribe_url": "https://kitchenpace.de/unsubscribe"
}
```

#### Liquid Loop Syntax

The template uses standard Liquid `for` loops:

```liquid
{% for recipe in latest_recipes %}
  <!-- Recipe card markup -->
  {{ recipe.name }}
  {{ recipe.image_url }}
{% endfor %}
```

### generic.mjml Variables

| Variable                   | Required | Description                           |
| -------------------------- | -------- | ------------------------------------- |
| `{{{ subject }}}`          | Yes      | Email subject line (shown in preview) |
| `{{{ message }}}`          | Yes      | Main email content (supports HTML)    |
| `{{ contact.first_name }}` | Yes      | Recipient's first name                |
| `{{ buttonText }}`         | No       | Button text                           |
| `{{ buttonLink }}`         | No       | Button URL (requires buttonText)      |

## Import to Notifuse

1. Open Notifuse dashboard
2. Go to **Templates** section
3. Click **New Template** or import
4. Copy the contents of each `.mjml` file
5. Notifuse will compile MJML to responsive HTML automatically

## Available Data in Notifuse

```json
{
    "contact": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
    },
    "list": {
        "id": "newsletter",
        "name": "Newsletter"
    },
    "unsubscribe_url": "https://...",
    "confirm_subscription_url": "https://...",
    "notification_center_url": "https://...",
    "variables": {
        "customField": "value"
    }
}
```

## Design Guidelines

- **Brand Colors**: Primary `#e07b53`, Secondary `#f8b500`
- **Background**: `#f7f9fc`
- **Border Radius**: 10px for wrapper, 999px for buttons
- **Typography**: Arial, sans-serif
- **Responsive**: MJML handles responsive behavior automatically

## Notifuse Data Feed Setup

The weekly newsletter uses Notifuse's **Global Data Feed** feature to fetch recipes dynamically.

### Configuration in Notifuse

1. Create a new **Broadcast Campaign**
2. Select your newsletter contact list
3. Choose the `weekly-newsletter.mjml` template
4. In **Data Feeds** section:
    - Enable **Global Data Feed**
    - **Feed URL**: `https://your-domain.com/api/newsletter/weekly`
    - **Method**: POST (default)
5. Schedule the broadcast (e.g., every Monday at 9:00 AM)

### How It Works

1. When the broadcast starts, Notifuse sends a POST request to your API
2. Your API returns the latest and top-rated recipes
3. The data is available in the template as `global_feed` variable
4. Liquid loops render the recipe cards dynamically

### Template Variables

All variables are accessed via `global_feed`:

```liquid
{% for recipe in global_feed.latest_recipes %}
  {{ recipe.name }}
  {{ recipe.image_url }}
{% endfor %}

{{ global_feed.categoryCookingUrl }}
{{ global_feed.unsubscribe_url }}
```
