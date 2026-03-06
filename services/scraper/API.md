# Scraper Service API Documentation

## Overview

The KitchenPace Scraper Service provides recipe content extraction from any URL using Scrapling CLI with three different modes.

## Base URL

```
http://scraper:8000
```

## Endpoints

### POST /api/scrape

Scrape a URL and return Markdown content.

**Request Body:**

```json
{
    "url": "https://example.com/recipe",
    "mode": "stealthy-fetch",
    "timeout": 60,
    "wait_for_network_idle": true,
    "solve_cloudflare": false
}
```

**Modes:**

- `get` - Simple HTTP request (fastest, static sites)
- `fetch` - Playwright browser (JavaScript-heavy sites)
- `stealthy-fetch` - Camoufox with anti-bot protection (protected sites like Chefkoch)

**Response:**

```json
{
    "success": true,
    "markdown": "# Recipe Title\n\nIngredients...",
    "title": "Recipe Title",
    "description": null,
    "image_url": null,
    "source_url": "https://example.com/recipe",
    "extraction_time_ms": 1234
}
```

### POST /api/scrape/stream

Stream scrape progress using Server-Sent Events (SSE).

**Event Types:**

- `status` - Initial status with URL and mode
- `progress` - Progress updates with step and message
- `log` - Log output from CLI
- `complete` - Final result with markdown
- `error` - Error information

**Example:**

```javascript
const eventSource = new EventSource('/api/scrape/stream', {
    method: 'POST',
    body: JSON.stringify({ url, mode: 'stealthy-fetch' }),
});

eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    console.log(data.message);
});

eventSource.addEventListener('complete', (e) => {
    const result = JSON.parse(e.data);
    console.log('Done:', result.markdown);
});
```

### GET /health

Health check endpoint.

**Response:**

```json
{
    "status": "healthy",
    "service": "scraper",
    "version": "2.0.0-cli"
}
```

## Docker

Build and run:

```bash
docker build -t kitchenpace-scraper .
docker run -p 64001:8000 kitchenpace-scraper
```

Or use docker-compose:

```yaml
scraper:
    build:
        context: ./services/scraper
        dockerfile: Dockerfile
    ports:
        - '64001:8000'
```
