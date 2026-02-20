/**
 * Ensure Panda CSS runs during PostCSS so the generated styles make it into
 * the `@layer reset, base, tokens, recipes, utilities` block inside
 * `app/globals.css`.
 */
module.exports = {
    plugins: {
        '@pandacss/dev/postcss': {},
    },
};
