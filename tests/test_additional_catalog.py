"""Regression coverage for category-scoped, exact-pack source imports."""
import contextlib
import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts/build_additional_catalog.py'
SPEC = importlib.util.spec_from_file_location('additional_catalog', SCRIPT)
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)


class AdditionalCatalogTests(unittest.TestCase):
 def setUp(self):
  self.temp = tempfile.TemporaryDirectory()
  self.addCleanup(self.temp.cleanup)
  self.root = pathlib.Path(self.temp.name)
  self.data = self.root / 'docs/data'
  self.data.mkdir(parents=True)
  self.entries = [
   dict(category='melatonin', brand='Example', base='https://example.org', handle='melatonin', product='Melatonin 2 mg', form='Capsule', type='Melatonin', subclass='Unspecified release', source='Not specified', packCount=120, servingUnits=1, melatoninMg=2, numericVariantIsCount=False),
   dict(category='glutathione', brand='Example', base='https://example.org', handle='glutathione', product='Glutathione', form='Capsule', type='L-glutathione', subclass='Blend', source='Not specified', packCount=60, servingUnits=None, glutathioneMg=None),
  ]
  self.write('additional-sources.json', dict(labelChecked='2026-10-31', products=self.entries))
  self.write('price-observations.json', dict(checked='2026-10-29', observations=[]))

 def write(self, file, data):
  (self.data / file).write_text(json.dumps(data), encoding='utf-8')

 def get(self, url):
  variant = dict(id=101 if 'melatonin' in url else 102, title='2' if 'melatonin' in url else 'Default Title', price='480.00', available=True)
  return json.dumps(dict(product=dict(variants=[variant])))

 def run_import(self, *extra):
  with patch.object(IMPORTER, 'ROOT', self.root), patch.object(IMPORTER, 'get', self.get), patch('sys.argv', ['importer', '--as-of', '2026-10-31', *extra]), contextlib.redirect_stdout(io.StringIO()):
   IMPORTER.main()

 def test_strength_option_is_not_mistaken_for_two_capsules(self):
  self.run_import('--categories', 'melatonin')
  offer = json.loads((self.data / 'melatonin.json').read_text())['offers'][0]
  self.assertEqual(offer['packCount'], 120)
  self.assertEqual(offer['melatoninMg'], 2)
  self.assertNotIn('numericVariantIsCount', offer)

 def test_scoped_import_does_not_rewrite_other_category(self):
  original = '{"checked":"2026-10-29","offers":[]}'
  (self.data / 'glutathione.json').write_text(original)
  self.run_import('--categories', 'melatonin')
  self.assertEqual((self.data / 'glutathione.json').read_text(), original)
  ledger = json.loads((self.data / 'price-observations.json').read_text())
  self.assertEqual([r['category'] for r in ledger['observations']], ['melatonin'])

 def test_default_categories_come_from_manifest_and_unknowns_stay_unknown(self):
  self.run_import()
  offer = json.loads((self.data / 'glutathione.json').read_text())['offers'][0]
  self.assertIsNone(offer['servingUnits'])
  self.assertIsNone(offer['glutathioneMg'])
  self.assertTrue((self.data / 'melatonin.json').exists())

 def test_unknown_category_fails_before_writing_dataset(self):
  with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
   self.run_import('--categories', 'not-in-manifest')
  self.assertEqual(error.exception.code, 2)
  self.assertFalse((self.data / 'melatonin.json').exists())


if __name__ == '__main__':
 unittest.main()
