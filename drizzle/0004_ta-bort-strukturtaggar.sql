-- Syrligt, Strävt och Sött ersattes av smakklockorna. Taggarna tas bort ur
-- befintliga betyg så att alla sparade taggar finns i RATING_TAGS.
UPDATE "ratings"
SET "tags" = array_remove(array_remove(array_remove("tags", 'acidic'), 'tannic'), 'sweet')
WHERE "tags" && ARRAY['acidic', 'tannic', 'sweet']::text[];
