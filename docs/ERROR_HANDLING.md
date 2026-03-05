# Error Handling & Sentry Best Practices

This guide explains how to properly handle errors and when to use Sentry's `showReportDialog()`.

## Overview

- **Sentry** is configured to capture all errors automatically
- **`showReportDialog()`** shows a feedback dialog to users so they can provide context
- Use different strategies based on error severity and context

## When to Use `showReportDialog()`

### ✅ DO use `showReportDialog()` for:

- **Critical/blocking errors** that stop the user from using the app
- **Global errors** (use `global-error.tsx`)
- **Important features failing** (payments, form submissions, data loss)
- Errors where **user context is valuable** for debugging

### ❌ DON'T use for:

- Network timeouts (retry automatically)
- Expected/handled errors (display your own message)
- Minor validation errors
- Background sync failures
- High-frequency errors (would spam users)

---

## Usage Examples

### 1. Global Application Error

```tsx
// src/app/global-error.tsx - Already configured
// Shows dialog automatically on critical errors
```

### 2. Error Boundary (React Component Errors)

```tsx
import { ErrorBoundary } from '@app/components/error/ErrorBoundary';

export function Page() {
    return (
        <ErrorBoundary context="Recipe Form">
            <RecipeForm />
        </ErrorBoundary>
    );
}
```

### 3. Server Action Errors

```tsx
import { captureErrorWithDialog } from '@app/lib/sentry';

export async function saveRecipe(data: RecipeData) {
    try {
        return await prisma.recipe.create({ data });
    } catch (error) {
        captureErrorWithDialog(
            error instanceof Error ? error : new Error(String(error)),
            'Recipe Save',
        );
        throw error; // Re-throw for client to handle
    }
}
```

### 4. API Route Errors

```tsx
import { captureErrorWithDialog } from '@app/lib/sentry';

export async function POST(req: Request) {
    try {
        const data = await req.json();
        // process...
    } catch (error) {
        captureErrorWithDialog(
            error instanceof Error ? error : new Error(String(error)),
            'File Upload',
        );
        return Response.json({ error: 'Upload failed' }, { status: 500 });
    }
}
```

### 5. Silent Error Capture (No Dialog)

```tsx
import { captureErrorSilent } from '@app/lib/sentry';

// For non-critical errors, don't show dialog
try {
    await syncUserPreferences();
} catch (error) {
    captureErrorSilent(
        error instanceof Error ? error : new Error(String(error)),
        'Preferences Sync',
    );
    // Continue gracefully
}
```

### 6. Async Operations (Try-Catch in Event Handlers)

```tsx
const handleImageUpload = async (file: File) => {
    try {
        const result = await uploadImage(file);
    } catch (error) {
        captureErrorWithDialog(
            error instanceof Error ? error : new Error('Upload failed'),
            'Image Upload',
        );
        setError('Image upload failed. Please try again.');
    }
};
```

---

## Dialog Customization

The feedback dialog is **already localized to German** in `global-error.tsx`. Customize text in `src/lib/sentry.ts`:

```ts
Sentry.showReportDialog({
    title: 'Fehler aufgetreten',
    subtitle: 'Your custom message...',
    labelComments: 'What happened?',
    labelClose: 'Close',
    labelSubmit: 'Report',
    successMessage: 'Thanks for the feedback!',
});
```

---

## Best Practices

### 1. **Add Context to Errors**

```tsx
captureErrorWithDialog(error, 'Form Submission'); // ✅ Good
captureErrorWithDialog(error); // ❌ Less useful
```

### 2. **Don't Show Dialog for Expected Errors**

```tsx
// ❌ Bad - user already knows about this error
try {
    const recipe = await fetchRecipe(id);
} catch {
    captureErrorWithDialog(error, 'Recipe Fetch'); // Wrong!
    showUserMessage('Recipe not found');
}

// ✅ Good - silent capture
try {
    const recipe = await fetchRecipe(id);
} catch {
    captureErrorSilent(error, 'Recipe Fetch');
    showUserMessage('Recipe not found');
}
```

### 3. **For Validation Errors, Never Show Dialog**

```tsx
// ❌ Bad
if (!email) {
    captureErrorWithDialog(new Error('Email required'));
}

// ✅ Good
if (!email) {
    setErrors({ email: 'Email is required' });
}
```

### 4. **Use Error Boundaries for Component Trees**

```tsx
// ✅ Good - catches all errors in subtree
<ErrorBoundary context="Dashboard">
    <Widget1 />
    <Widget2 />
    <Widget3 />
</ErrorBoundary>

// ❌ Not ideal - requires wrapping each component
<Widget1 />
<Widget2 />
<Widget3 />
```

### 5. **Add User Identification to Errors**

```tsx
import * as Sentry from '@sentry/nextjs';

// In your auth setup
Sentry.setUser({
    id: userId,
    email: userEmail,
    username: userName,
});

// Now all captured errors include user info automatically
```

---

## Available Functions

### `captureErrorWithDialog(error, context?)`

Captures error AND shows feedback dialog. Use for critical, user-blocking errors.

**Parameters:**

- `error: Error` - The error object
- `context?: string` - Optional description (e.g., "Form Submission")

**Example:**

```ts
try {
    await criticalOperation();
} catch (error) {
    captureErrorWithDialog(
        error instanceof Error ? error : new Error(String(error)),
        'Critical Op',
    );
}
```

### `captureErrorSilent(error, context?)`

Captures error WITHOUT dialog. Use for non-critical issues.

**Example:**

```ts
try {
    await backgroundSync();
} catch (error) {
    captureErrorSilent(error instanceof Error ? error : new Error(String(error)), 'Sync');
}
```

### `captureMessage(message, level?)`

Captures a message (not an error). Use for logging important events.

**Parameters:**

- `message: string` - The message text
- `level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'` - Severity level

**Example:**

```ts
captureMessage('User initiated logout', 'info');
captureMessage('High API latency detected', 'warning');
```

---

## Testing in Development

To test the feedback dialog:

```tsx
// Throw an error somewhere
throw new Error('Test error - check if dialog appears');

// Or call directly in component
useEffect(() => {
    Sentry.showReportDialog({ title: 'Test' });
}, []);
```

The dialog will only appear if Sentry is properly configured (it checks `dsn` is set).

---

## Monitoring & Alerts

After implementing `showReportDialog()`:

1. **Visit your Sentry dashboard** → All Projects → KitchenPace
2. **Check "Issues"** tab for captured errors
3. **View feedback** users provided in the error details
4. **Set up alerts** for critical errors:
    - Issues tab → Create Alert Rule
    - Condition: Error level = `error` or `fatal`
    - Action: Send email notification

---

## References

- [Sentry showReportDialog Docs](https://docs.sentry.io/platforms/javascript/enriching-events/user-feedback/)
- [Sentry Next.js Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Our Sentry Config](../sentry.server.config.ts)
