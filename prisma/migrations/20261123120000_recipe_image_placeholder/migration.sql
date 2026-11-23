-- KUC-146: tiny blurred preview of the recipe image, shown until the real image loads.
-- Added next to the unused "blurhash" column instead of renaming it: the old
-- container still selects "blurhash" until the new one is up.
ALTER TABLE "Recipe" ADD COLUMN "imagePlaceholder" TEXT;

-- A preview always belongs to the image it was made from. Every writer of
-- "imageKey" (upload, approval, import, admin) clears it via this trigger, so no
-- code path can show a stale preview; the worker fills it again.
CREATE OR REPLACE FUNCTION recipe_clear_image_placeholder() RETURNS trigger AS $$
BEGIN
    IF NEW."imageKey" IS DISTINCT FROM OLD."imageKey" THEN
        NEW."imagePlaceholder" := NULL;
        NEW."imageWidth" := NULL;
        NEW."imageHeight" := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_clear_image_placeholder
    BEFORE UPDATE OF "imageKey" ON "Recipe"
    FOR EACH ROW EXECUTE FUNCTION recipe_clear_image_placeholder();
