import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Define CircularExchangeItem shape mirroring the application interface
interface TestExchangeItem {
  id: string;
  authorId: string;
  authorName: string;
  precinct: string;
  listingType: 'giveaway' | 'exchange';
  title: string;
  description: string;
  category: string;
  condition: 'brand_new' | 'like_new' | 'good' | 'fair';
  status: 'available' | 'reserved' | 'completed';
  seekingItem?: string;
}

// Sample dataset including diverse categories, conditions, types, and statuses
const mockExchangeItems: TestExchangeItem[] = [
  {
    id: 'ex-1',
    authorId: 'u1',
    authorName: 'Ahmad Faiz',
    precinct: 'Elmina Valley 1',
    listingType: 'giveaway',
    title: 'Solid Wood Coffee Table',
    description: 'Minor scratches on surface. Sturdy teak frame.',
    category: 'furniture',
    condition: 'good',
    status: 'available',
  },
  {
    id: 'ex-2',
    authorId: 'u2',
    authorName: 'Siti Sarah',
    precinct: 'Elmina Valley 3',
    listingType: 'giveaway',
    title: 'Philips Air Fryer 4.1L',
    description: 'Working well, upgraded to dual-basket model.',
    category: 'appliances',
    condition: 'like_new',
    status: 'available',
  },
  {
    id: 'ex-3',
    authorId: 'u3',
    authorName: 'Kavitha Nair',
    precinct: 'Elmina West',
    listingType: 'exchange',
    title: 'Baby Stroller Joie Muze',
    description: 'Clean, used for 1 year. Looking for balance bike.',
    category: 'baby_kids',
    condition: 'good',
    status: 'available',
    seekingItem: 'Toddler balance bike or tricycle',
  },
  {
    id: 'ex-4',
    authorId: 'u4',
    authorName: 'Wong Kah Chun',
    precinct: 'Denai Alam',
    listingType: 'giveaway',
    title: 'Monstera Deliciosa Cuttings',
    description: 'Rooted cuttings ready to pot. 3 available.',
    category: 'plants_garden',
    condition: 'brand_new',
    status: 'reserved',
  },
  {
    id: 'ex-5',
    authorId: 'u5',
    authorName: 'Azlan Shah',
    precinct: 'Elmina Green 1',
    listingType: 'exchange',
    title: 'Cordless Drill & Impact Driver Set',
    description: 'Bosch 12V set with 2 batteries. Want camping tent.',
    category: 'appliances',
    condition: 'good',
    status: 'available',
    seekingItem: '4-person waterproof camping tent',
  },
  {
    id: 'ex-6',
    authorId: 'u6',
    authorName: 'Tan Mei Ling',
    precinct: 'Elmina Valley 2',
    listingType: 'giveaway',
    title: 'SPM Revision Books & Workbooks',
    description: 'Form 4 and 5 reference books, physics, chemistry.',
    category: 'books_study',
    condition: 'fair',
    status: 'available',
  },
  {
    id: 'ex-7',
    authorId: 'u7',
    authorName: 'Farid Kamil',
    precinct: 'Elmina Central Park',
    listingType: 'giveaway',
    title: 'Decathlon Adult Helmet & Bike Pump',
    description: 'Size M helmet, barely used. Universal hand pump.',
    category: 'sports_leisure',
    condition: 'like_new',
    status: 'available',
  },
];

// Replicate the exact filtering algorithm implemented in ExchangeView.tsx
function filterItems(
  items: TestExchangeItem[],
  selectedCategory: string,
  selectedTypeFilter: 'all' | 'Free' | 'Exchange' = 'all',
  selectedCondition: string = 'all',
  selectedAvailability: string = 'all',
  searchQuery: string = ''
): TestExchangeItem[] {
  return items.filter((item) => {
    // Mode Filter (Free / Giveaway vs Exchange)
    if (selectedTypeFilter === 'Free') {
      if (item.listingType !== 'giveaway') return false;
    } else if (selectedTypeFilter === 'Exchange') {
      if (item.listingType !== 'exchange') return false;
    }

    // Category Filter: Treat 'all' / 'All' (or empty/undefined/whitespace) as special unrestricted filter
    const isAllCategory = !selectedCategory || !selectedCategory.trim() || selectedCategory.toLowerCase().trim() === 'all';
    if (!isAllCategory) {
      const catMap: Record<string, string[]> = {
        'furniture': ['furniture'],
        'electronics': ['electronics', 'appliances'],
        'home & kitchen': ['appliances', 'home_decor', 'plants_garden'],
        'clothing': ['clothing', 'fashion'],
        'books': ['books_study', 'books'],
        'baby items': ['baby_kids'],
        'sports & outdoor': ['sports_leisure'],
        'other': ['others', 'other'],
      };
      const normalizedSelected = selectedCategory.toLowerCase().trim();
      const allowedCategories = catMap[normalizedSelected] || [normalizedSelected];
      const itemCat = (item.category || '').toLowerCase().trim();
      if (!allowedCategories.includes(itemCat)) return false;
    }

    // Condition Filter
    if (selectedCondition !== 'all') {
      const condMap: Record<string, string[]> = {
        'New': ['brand_new'],
        'Like New': ['like_new'],
        'Good': ['good'],
        'Fair': ['fair'],
      };
      const allowed = condMap[selectedCondition] || [];
      if (!allowed.includes(item.condition)) return false;
    }

    // Availability Filter
    if (selectedAvailability !== 'all') {
      if (selectedAvailability === 'Available Now' && item.status !== 'available') return false;
      if (selectedAvailability === 'Reserved' && item.status !== 'reserved') return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchPrecinct = item.precinct.toLowerCase().includes(q);
      const matchAuthor = item.authorName.toLowerCase().includes(q);
      const matchSeeking = (item.seekingItem || '').toLowerCase().includes(q);
      return matchTitle || matchDesc || matchPrecinct || matchAuthor || matchSeeking;
    }

    return true;
  });
}

describe('TESDH Community Hub — Exchange Filter Bug Fix & Section Renaming', () => {
  const rootDir = process.cwd();

  // ==========================================================================
  // 1. "ALL" CATEGORY FILTER BUG FIX
  // ==========================================================================
  describe('1. "All" Category Filter Logic', () => {
    it('returns all items when selectedCategory is "all"', () => {
      const results = filterItems(mockExchangeItems, 'all');
      assert.strictEqual(results.length, mockExchangeItems.length);
    });

    it('returns all items when selectedCategory is uppercase "All"', () => {
      // Prior bug: clicking "All" in the pill scroller passed "All", which failed !== 'all' check and looked up catMap['All']
      const results = filterItems(mockExchangeItems, 'All');
      assert.strictEqual(results.length, mockExchangeItems.length, 'Clicking "All" must return all listings');
    });

    it('returns all items when selectedCategory is empty string or whitespace', () => {
      const results = filterItems(mockExchangeItems, '');
      assert.strictEqual(results.length, mockExchangeItems.length);
      const resultsWhitespace = filterItems(mockExchangeItems, '   ');
      assert.strictEqual(resultsWhitespace.length, mockExchangeItems.length);
    });

    it('never compares "all" as a literal category against item.category', () => {
      // Ensure no items are dropped if an item has a category not named "all"
      const results = filterItems(mockExchangeItems, 'All');
      const ids = results.map((r) => r.id);
      assert.deepStrictEqual(ids, ['ex-1', 'ex-2', 'ex-3', 'ex-4', 'ex-5', 'ex-6', 'ex-7']);
    });
  });

  // ==========================================================================
  // 2. SPECIFIC CATEGORY FILTERING & MULTI-FILTER COMBINATIONS
  // ==========================================================================
  describe('2. Specific Category Filtering & Filter Combinations', () => {
    it('filters correctly for "Furniture"', () => {
      const results = filterItems(mockExchangeItems, 'Furniture');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Solid Wood Coffee Table');
    });

    it('filters correctly for "Baby Items"', () => {
      const results = filterItems(mockExchangeItems, 'Baby Items');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Baby Stroller Joie Muze');
    });

    it('filters correctly for "Home & Kitchen" (covers appliances and plants)', () => {
      const results = filterItems(mockExchangeItems, 'Home & Kitchen');
      assert.strictEqual(results.length, 3);
      const titles = results.map((r) => r.title);
      assert.ok(titles.includes('Philips Air Fryer 4.1L'));
      assert.ok(titles.includes('Monstera Deliciosa Cuttings'));
      assert.ok(titles.includes('Cordless Drill & Impact Driver Set'));
    });

    it('combines category filter with listing type filter ("Free" / Giveaway)', () => {
      // Home & Kitchen has 3 items: 2 giveaway, 1 exchange
      const results = filterItems(mockExchangeItems, 'Home & Kitchen', 'Free');
      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.listingType === 'giveaway'));
    });

    it('combines category filter with listing type filter ("Exchange")', () => {
      const results = filterItems(mockExchangeItems, 'Home & Kitchen', 'Exchange');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Cordless Drill & Impact Driver Set');
    });

    it('combines category filter with condition filter', () => {
      const results = filterItems(mockExchangeItems, 'all', 'all', 'Like New');
      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.condition === 'like_new'));
    });

    it('combines category filter with availability filter', () => {
      const resultsAvailable = filterItems(mockExchangeItems, 'all', 'all', 'all', 'Available Now');
      assert.strictEqual(resultsAvailable.length, 6);
      assert.ok(resultsAvailable.every((r) => r.status === 'available'));

      const resultsReserved = filterItems(mockExchangeItems, 'all', 'all', 'all', 'Reserved');
      assert.strictEqual(resultsReserved.length, 1);
      assert.strictEqual(resultsReserved[0].id, 'ex-4');
    });

    it('combines category filter with text search', () => {
      const results = filterItems(mockExchangeItems, 'all', 'all', 'all', 'all', 'coffee');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].title, 'Solid Wood Coffee Table');
    });

    it('resetting all filters restores the complete dataset', () => {
      // First apply narrow filters
      const narrowed = filterItems(mockExchangeItems, 'Furniture', 'Free', 'Good', 'Available Now', 'Wood');
      assert.strictEqual(narrowed.length, 1);

      // Now reset to defaults: category 'all', type 'all', condition 'all', availability 'all', search ''
      const reset = filterItems(mockExchangeItems, 'all', 'all', 'all', 'all', '');
      assert.strictEqual(reset.length, mockExchangeItems.length);
    });

    it('handles empty datasets safely without exceptions', () => {
      const results = filterItems([], 'All');
      assert.deepStrictEqual(results, []);
    });

    it('handles items with missing or undefined category safely', () => {
      const itemsWithMissingCategory = [
        ...mockExchangeItems,
        {
          id: 'ex-corrupt',
          authorId: 'u99',
          authorName: 'Test',
          precinct: 'Elmina',
          listingType: 'giveaway' as const,
          title: 'Uncategorised item',
          description: 'No category set',
          category: '',
          condition: 'good' as const,
          status: 'available' as const,
        },
      ];
      // With 'All', it should return all 8 items
      const results = filterItems(itemsWithMissingCategory, 'All');
      assert.strictEqual(results.length, 8);
    });
  });

  // ==========================================================================
  // 3. CODEBASE VERIFICATION: RENAMING "CIRCULAR EXCHANGE" TO "EXCHANGE"
  // ==========================================================================
  describe('3. Codebase Verification: Renaming to "Exchange"', () => {
    it('ExchangeView.tsx renders <h1>Exchange</h1> as the page title', () => {
      const viewPath = path.join(rootDir, 'src/components/exchange/ExchangeView.tsx');
      const content = fs.readFileSync(viewPath, 'utf8');
      assert.match(content, /<h1[^>]*>\s*Exchange\s*<\/h1>/);
      assert.strictEqual(
        content.includes('<h1>Circular Exchange</h1>'),
        false,
        'Should not contain <h1>Circular Exchange</h1>'
      );
    });

    it('ExchangeView.tsx uses "Create Exchange Listing" for the listing modal', () => {
      const viewPath = path.join(rootDir, 'src/components/exchange/ExchangeView.tsx');
      const content = fs.readFileSync(viewPath, 'utf8');
      assert.match(content, /<h3[^>]*>\s*Create Exchange Listing\s*<\/h3>/);
      assert.strictEqual(content.includes('Create Circular Listing'), false);
    });

    it('ExchangeView.tsx sets "Exchange Inquiry" in secure message threads', () => {
      const viewPath = path.join(rootDir, 'src/components/exchange/ExchangeView.tsx');
      const content = fs.readFileSync(viewPath, 'utf8');
      assert.ok(content.includes('Exchange Inquiry:'));
      assert.strictEqual(content.includes('Circular Exchange Inquiry:'), false);
    });

    it('Sidebar.tsx renders "Exchange" in left navigation', () => {
      const sidebarPath = path.join(rootDir, 'src/components/navigation/Sidebar.tsx');
      const content = fs.readFileSync(sidebarPath, 'utf8');
      assert.match(content, /<span className="text-\[13px\] tracking-tight">Exchange<\/span>/);
      assert.strictEqual(
        content.includes('<span className="text-[13px] tracking-tight">Circular Exchange</span>'),
        false,
        'Sidebar must not contain Circular Exchange'
      );
    });

    it('HomeView.tsx renders "Exchange" in feature card heading and aria-label', () => {
      const homePath = path.join(rootDir, 'src/components/home/HomeView.tsx');
      const content = fs.readFileSync(homePath, 'utf8');
      assert.match(content, /aria-label="Open Exchange\. Give useful items a second life\."/);
      assert.match(content, /<h2[^>]*>\s*Exchange\s*<\/h2>/);
      assert.strictEqual(content.includes('<h2>Circular Exchange</h2>'), false);
    });

    it('translations.ts defines navExchange as "Exchange"', () => {
      const transPath = path.join(rootDir, 'src/lib/i18n/translations.ts');
      const content = fs.readFileSync(transPath, 'utf8');
      assert.match(content, /navExchange:\s*'Exchange',/);
      assert.strictEqual(content.includes("navExchange: 'Circular Exchange'"), false);
    });

    it('GlobalSearch.tsx renders "Exchange (count)" result group header', () => {
      const searchPath = path.join(rootDir, 'src/components/navigation/GlobalSearch.tsx');
      const content = fs.readFileSync(searchPath, 'utf8');
      assert.match(content, /<span>Exchange \(\{groupedResults\.exchange\.length\}\)<\/span>/);
      assert.strictEqual(content.includes('<span>Circular Exchange ({groupedResults.exchange.length})</span>'), false);
    });

    it('SettingsView.tsx renders "Exchange & Local Services Updates" in notification preferences', () => {
      const settingsPath = path.join(rootDir, 'src/components/settings/SettingsView.tsx');
      const content = fs.readFileSync(settingsPath, 'utf8');
      assert.ok(content.includes('Exchange &amp; Local Services Updates'));
      assert.strictEqual(content.includes('Circular Exchange &amp; Local Services Updates'), false);
    });

    it('layout.tsx metadata description references "Exchange"', () => {
      const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');
      assert.ok(content.includes('Exchange'));
      assert.strictEqual(content.includes('Circular Exchange, and Mediated Privacy.'), false);
    });

    it('preserves internal database identifiers and tab keys', () => {
      const exchangeViewPath = path.join(rootDir, 'src/components/exchange/ExchangeView.tsx');
      const viewContent = fs.readFileSync(exchangeViewPath, 'utf8');
      // Must preserve CircularExchangeItem type and internal contracts
      assert.ok(viewContent.includes('CircularExchangeItem'));

      const appContextPath = path.join(rootDir, 'src/lib/context/AppContext.tsx');
      const appContent = fs.readFileSync(appContextPath, 'utf8');
      assert.ok(appContent.includes('exchangeItems'));
      assert.ok(appContent.includes("'exchange'"));
    });
  });
});
