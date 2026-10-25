import datetime,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
from research_price_history import quarters,page_weight_issue
from apply_quarter_audit import price_from_html,historical_identity_issue

class PublicHistoryResearchTests(unittest.TestCase):
    def setUp(self):
        self.offer=dict(brand='Example',url='https://brand.example/products/whey?variant=1',kg=1,grams=1000,flavour='Chocolate')
    def test_window_is_twelve_completed_quarters_and_rolls_over_years(self):
        window=quarters('2026-10-25',12)
        self.assertEqual(len(window),12);self.assertEqual(window[0]['start'],'2023-10-01');self.assertEqual(window[-1]['end'],'2026-09-30')
        for a,b in zip(window,window[1:]):self.assertEqual(datetime.date.fromisoformat(a['end'])+datetime.timedelta(days=1),datetime.date.fromisoformat(b['start']))
        self.assertEqual(quarters('2027-01-01',12)[0]['start'],'2024-01-01')
    def test_selected_variant_price_does_not_borrow_another_variants_price(self):
        raw='<script>{"variants":[{"id":1,"title":"Chocolate / 1kg","available":true,"options":["Chocolate","1kg"],"price":190000},{"id":2,"title":"Vanilla / 1kg","available":true,"options":["Vanilla","1kg"],"price":10000}]}</script>'
        self.assertEqual(price_from_html(self.offer,raw)[0],1900)
        self.assertIsNone(price_from_html({**self.offer,'url':'https://brand.example/products/whey?variant=3'},raw)[0])
        self.assertIsNone(historical_identity_issue(self.offer,raw,None,1900,2000))
        self.assertIsNotNone(historical_identity_issue({**self.offer,'kg':2},raw,None,1900,2000))
        self.assertIsNotNone(historical_identity_issue({**self.offer,'flavour':'Mango'},raw,None,1900,2000))
    def test_explicit_archived_pack_weight_can_disqualify_a_reused_variant_id(self):
        self.assertIsNotNone(page_weight_issue(self.offer,'<h1>Chocolate whey 500 g</h1>'))
        self.assertIsNone(page_weight_issue(self.offer,'<h1>Chocolate whey 1 kg</h1>'))
        self.assertIsNone(page_weight_issue(self.offer,'<h1>Chocolate whey with 24g protein per scoop</h1>'))
        self.assertIsNone(page_weight_issue(self.offer,'<h1>Gold Whey Isolate | 27g Isolate Protein</h1>'))
        raw='<h1>Chocolate whey 500 g</h1><script>{"variants":[{"id":1,"title":"Chocolate / 1 kg","options":["Chocolate","1 kg"]}]}</script>'
        self.assertIsNone(page_weight_issue(self.offer,raw))

if __name__=='__main__':unittest.main()
