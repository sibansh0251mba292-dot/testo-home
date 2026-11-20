import React, { useMemo, useState } from 'react';
import { Search, Clock, Info, Plus, Check, ShoppingBag, ArrowRight, Droplet } from 'lucide-react';
import { CartItem, DiagnosticTest, HealthPackage, Language } from '../types';
import { TEST_CATEGORIES } from '../data/seedCatalog';
import { TRANSLATIONS } from '../i18n/translations';

interface TestsCatalogueProps {
  language: Language;
  tests: DiagnosticTest[];
  packages: HealthPackage[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cart: CartItem[];
  onToggleTest: (test: DiagnosticTest) => void;
  onTogglePackage: (pkg: HealthPackage) => void;
  onOpenBookingWizard: () => void;
}

export const TestsCatalogue: React.FC<TestsCatalogueProps> = ({
  language,
  tests,
  packages,
  searchQuery,
  onSearchChange,
  cart,
  onToggleTest,
  onTogglePackage,
  onOpenBookingWizard,
}) => {
  const t = TRANSLATIONS[language];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'all' | 'tests' | 'packages'>('all');
  const [expandedPrepId, setExpandedPrepId] = useState<string | null>(null);

  const cartIds = useMemo(() => new Set(cart.map((c) => c.id)), [cart]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);

  const filteredTests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tests.filter((item) => {
      if (!item.active) return false;
      const catMatch = selectedCategory === 'All' || item.category === selectedCategory;
      const qMatch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.shortDescription.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [tests, selectedCategory, searchQuery]);

  const filteredPackages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (!pkg.active) return false;
      if (selectedCategory !== 'All' && selectedCategory !== 'Full Body Checkup') return false;
      return (
        !q ||
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.includedTests.some((inc) => inc.toLowerCase().includes(q))
      );
    });
  }, [packages, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6 pb-20">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {language === 'en' ? 'Blood Tests & Health Packages' : 'ब्लड टेस्ट और हेल्थ पैकेज'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {language === 'en'
              ? 'Transparent preparation instructions and sample collection from your home.'
              : 'स्पष्ट तैयारी निर्देश और घर पर सुरक्षित सैंपल कलेक्शन।'}
          </p>
        </div>

        {/* Segmented Type Switch */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start">
          {(['all', 'tests', 'packages'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                viewMode === mode
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {mode === 'all'
                ? language === 'en'
                  ? 'All'
                  : 'सभी'
                : mode === 'tests'
                  ? language === 'en'
                    ? 'Individual Tests'
                    : 'सिंगल टेस्ट'
                  : language === 'en'
                    ? 'Health Packages'
                    : 'हेल्थ पैकेज'}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full min-h-[46px] pl-11 pr-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-700"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', ...TEST_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-900 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Health Packages Section */}
      {viewMode !== 'tests' && filteredPackages.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'en' ? 'Preventive Health Packages' : 'प्रिवेंटिव हेल्थ पैकेज'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPackages.map((pkg) => {
              const inCart = cartIds.has(pkg.id);
              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-teal-700 dark:text-teal-400 font-semibold">
                      <span>{pkg.testCount} Parameters</span>
                      <span>
                        {pkg.fastingRequired
                          ? `${t.fastingRequired} (${pkg.fastingHours || 10}h)`
                          : t.noFasting}{' '}
                        · {pkg.reportDeliveryHours}
                        {t.hours}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                      {language === 'hi' && pkg.nameHi ? pkg.nameHi : pkg.name}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                      {language === 'hi' && pkg.descriptionHi ? pkg.descriptionHi : pkg.description}
                    </p>
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      Includes: {pkg.includedTests.join(' · ')}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          ₹{pkg.discountedPrice}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-slate-400 line-through">
                          ₹{pkg.price}
                        </span>
                      </div>
                      {pkg.isDemoPrice && (
                        <p className="text-[11px] text-slate-400">{t.demoPriceTag}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onTogglePackage(pkg)}
                        className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                          inCart
                            ? 'bg-teal-700 text-white'
                            : 'bg-indigo-900 hover:bg-indigo-800 text-white'
                        }`}
                      >
                        {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{inCart ? t.added : t.addToCart}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Individual Blood Tests Section */}
      {viewMode !== 'packages' && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {language === 'en' ? 'Individual Blood Tests' : 'व्यक्तिगत ब्लड टेस्ट'} ({filteredTests.length})
          </h2>

          {filteredTests.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No diagnostic tests match your filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setSelectedCategory('All');
                }}
                className="mt-3 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTests.map((test) => {
                const inCart = cartIds.has(test.id);
                const isPrepOpen = expandedPrepId === test.id;

                return (
                  <div
                    key={test.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-medium text-teal-700 dark:text-teal-400">{test.category}</span>
                        <span className="inline-flex items-center gap-1">
                          <Droplet className="w-3 h-3" />
                          {test.sampleType || 'Blood Sample'}
                        </span>
                      </div>

                      <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white">
                        {language === 'hi' && test.nameHi ? test.nameHi : test.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {language === 'hi' && test.shortDescriptionHi
                          ? test.shortDescriptionHi
                          : test.shortDescription}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {test.fastingRequired
                            ? `${t.fastingRequired} (${test.fastingHours || 8}h)`
                            : t.noFasting}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t.reportIn} {test.reportDeliveryHours} {t.hours}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedPrepId(isPrepOpen ? null : test.id)}
                        className="mt-2.5 text-xs font-medium text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 hover:underline"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>{isPrepOpen ? 'Hide preparation notes' : 'Preparation instructions'}</span>
                      </button>

                      {isPrepOpen && (
                        <p className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-950 p-3 text-xs text-slate-600 dark:text-slate-300">
                          {language === 'hi' && test.preparationHi ? test.preparationHi : test.preparation}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            ₹{test.discountedPrice}
                          </span>
                          {test.price > test.discountedPrice && (
                            <span className="text-xs font-mono tabular-nums text-slate-400 line-through">
                              ₹{test.price}
                            </span>
                          )}
                        </div>
                        {test.isDemoPrice && (
                          <p className="text-[11px] text-slate-400">{t.demoPriceTag}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleTest(test)}
                          className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            inCart
                              ? 'bg-teal-700 text-white'
                              : 'border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950'
                          }`}
                        >
                          {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>{inCart ? t.added : t.addToCart}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!inCart) onToggleTest(test);
                            onOpenBookingWizard();
                          }}
                          className="min-h-[42px] px-4 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          {t.bookNow}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Floating Cart Action Bar */}
      {cart.length > 0 && (
        <div className="sticky bottom-20 md:bottom-4 z-30">
          <div className="rounded-2xl bg-indigo-950 text-white px-5 py-3.5 shadow-lg flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <ShoppingBag className="w-5 h-5 text-teal-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">
                  {cart.length} {cart.length === 1 ? 'item' : 'items'} ·{' '}
                  <span className="font-mono tabular-nums">₹{cartTotal}</span>
                </p>
                <p className="text-[11px] text-indigo-200 truncate">
                  {cart.some((c) => c.fastingRequired)
                    ? 'Fasting required for selected panel'
                    : 'No fasting required'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenBookingWizard}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <span>{t.proceedToBooking}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
