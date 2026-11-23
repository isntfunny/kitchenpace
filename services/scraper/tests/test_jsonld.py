"""JSON-LD parsing for the shapes real recipe sites send (KUC-141).

    cd services/scraper && python3 -m unittest discover tests
"""
import json
import unittest

from app.strategies.jsonld import _find_recipe, _get_image, _recipe_to_markdown


def page(*blocks) -> str:
    return "".join(f'<script type="application/ld+json">{json.dumps(b)}</script>' for b in blocks)


BASE = {"@type": "Recipe", "name": "Testrezept", "recipeIngredient": ["1 Ei"], "recipeInstructions": ["Kochen."]}


class ImageTest(unittest.TestCase):
    def test_plain_string(self):
        self.assertEqual(_get_image({"image": "https://x/a.jpg"}), "https://x/a.jpg")

    def test_list_of_strings(self):
        self.assertEqual(_get_image({"image": ["https://x/a.jpg", "https://x/b.jpg"]}), "https://x/a.jpg")

    def test_list_of_image_objects(self):
        # einfachbacken.de, lecker.de
        img = [{"@type": "ImageObject", "url": "https://x/a.jpg"}, {"@type": "ImageObject", "url": "https://x/b.jpg"}]
        self.assertEqual(_get_image({"image": img}), "https://x/a.jpg")

    def test_image_object(self):
        self.assertEqual(_get_image({"image": {"@type": "ImageObject", "contentUrl": "https://x/c.jpg"}}), "https://x/c.jpg")

    def test_id_reference_resolved_from_graph(self):
        # chefkoch.de: Recipe.image is {"@id": ...}, the ImageObject sits elsewhere in @graph
        html = page({"@graph": [
            {"@type": "ImageObject", "@id": "https://x/#img", "url": "https://x/d.jpg"},
            dict(BASE, image={"@id": "https://x/#img"}),
        ]})
        recipe = _find_recipe(html)
        self.assertEqual(_get_image(recipe), "https://x/d.jpg")

    def test_unresolvable_reference_gives_none(self):
        self.assertIsNone(_get_image({"image": {"@id": "https://x/#missing"}}))

    def test_result_is_always_a_string_or_none(self):
        for img in (None, [], [{}], {}, 42, [[{"url": "https://x/e.jpg"}]]):
            value = _get_image({"image": img})
            self.assertTrue(value is None or isinstance(value, str), img)


class FindRecipeTest(unittest.TestCase):
    def test_type_as_list(self):
        html = page(dict(BASE, **{"@type": ["Recipe", "NewsArticle"]}))
        self.assertEqual(_find_recipe(html)["name"], "Testrezept")

    def test_graph_in_list(self):
        html = page([{"@type": "WebSite"}, {"@graph": [BASE]}])
        self.assertEqual(_find_recipe(html)["name"], "Testrezept")


class MarkdownTest(unittest.TestCase):
    def test_numeric_nutrition(self):
        # gutekueche.at: "calories": 258
        md = _recipe_to_markdown(dict(BASE, nutrition={"@type": "NutritionInformation", "calories": 258}))
        self.assertIn("258", md)

    def test_nutrition_as_list(self):
        # oetker.de: nutrition is a list of NutritionInformation
        md = _recipe_to_markdown(dict(BASE, nutrition=[{"calories": "232 kcal", "fatContent": "14.66 g"}]))
        self.assertIn("232 kcal", md)
        self.assertIn("Fett: 14.66 g", md)

    def test_numeric_yield(self):
        md = _recipe_to_markdown(dict(BASE, recipeYield=4))
        self.assertIn("**Portionen:** 4", md)

    def test_nested_sections_and_step_names(self):
        steps = [{"@type": "HowToSection", "name": "Teig", "itemListElement": [{"@type": "HowToStep", "text": "Rühren."}]},
                 {"@type": "HowToStep", "text": "Backen."}]
        md = _recipe_to_markdown(dict(BASE, recipeInstructions=steps))
        self.assertIn("1. Rühren.", md)
        self.assertIn("2. Backen.", md)


if __name__ == "__main__":
    unittest.main()
