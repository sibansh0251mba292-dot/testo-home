import React, { useState } from 'react';
import {
  Search,
  CalendarPlus,
  MapPin,
  FileText,
  Clock,
  ChevronRight,
  Percent,
  MessageCircle,
  AlertCircle,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import {
  Booking,
  DiagnosticReport,
  DiagnosticTest,
  HealthPackage,
  Language,
  Offer,
  OperationalConfig,
  ServiceablePincode,
  UserProfile,
} from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { HomeCollectionIllustration } from './BrandAssets';

interface HomeDashboardProps {
  user: UserProfile;
  language: Language;
  tests: DiagnosticTest[];
  packages: HealthPackage[];
  offers: Offer[];
  bookings: Booking[];
  reports: DiagnosticReport[];
  pincodes: ServiceablePincode[];
  operationalConfig: OperationalConfig;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateCatalogue: () => void;
  onNavigateBookings: (tab?: 'upcoming' | 'history' | 'reports') => void;
  onOpenBookingWizard: () => void;
  onAddTestToCart: (test: DiagnosticTest) => void;
  onAddPackageToCart: (pkg: HealthPackage) => void;
  cartIds: Set<string>;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  language,
  tests,
  packages,
  offers,
  bookings,
  reports,
  pincodes,
  operationalConfig,
  searchQuery,
  onSearchChange,
  onNavigateCatalogue,
  onNavigateBookings,
  onOpenBookingWizard,
  onAddTestToCart,
  onAddPackageToCart,
  cartIds,
}) => {
  const t = TRANSLATIONS[language];
  const [pincodeInput, setPincodeInput] = useState('');
  const [pincodeResult, setPincodeResult] = useState<{ found: boolean; label: string } | null>(null);

  const popularTests = tests.filter((item) => item.active && item.isPopular).slice(0, 4);
  const recommendedPackages = packages.filter((pkg) => pkg.active && pkg.isRecommended).slice(0, 3);
  const upcomingBookings = bookings.filter(
    (b) => b.status !== 'Cancelled' && b.status !== 'Report Ready'
  );
  const firstName = user.name?.split(' ')[0] || 'Customer';

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pincodeInput.trim();
    if (!/^[0-9]{6}$/.test(cleaned)) {
      setPincodeResult({ found: false, label: t.pincodeUnavailable });
      return;
    }
    const match = pincodes.find((p) => p.pincode === cleaned && p.active);
    if (match) {
      setPincodeResult({
        found: true,
        label: `${t.pincodeAvailable} ${match.area}, ${match.city} (${match.pincode})`,
      });
    } else {
      setPincodeResult({ found: false, label: t.pincodeUnavailable });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigateCatalogue();
  };

  const whatsappNumber = (operationalConfig.supportWhatsApp || '919800000000').replace(/[^0-9]/g, '');

  return (
    <div className="space-y-8">
      {/* Operational Readiness / Demo Pricing Notice */}
      {!operationalConfig.liveBookingsEnabled && (
        <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-800 dark:text-indigo-300 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-100 leading-relaxed">
            <span className="font-semibold">{t.demoNoticeTitle}: </span>
            {t.demoNoticeBody}
          </div>
        </div>
      )}

      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
              {t.welcomeBack}, {firstName}
            </p>
            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              {language === 'en'
                ? 'Schedule a home blood test in under 2 minutes.'
                : '2 मिनट से कम समय में घर पर ब्लड टेस्ट शेड्यूल करें।'}
            </h1>
            <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 max-w-xl">
              {language === 'en'
                ? 'Browse individual tests or preventive packages, pick your morning fasting slot, and track your trained collection technician.'
                : 'व्यक्तिगत टेस्ट या हेल्थ पैकेज चुनें, सुबह का स्लॉट बुक करें और अपने कलेक्शन तकनीशियन को ट्रैक करें।'}
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="mt-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full min-h-[48px] pl-11 pr-24 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-700"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors"
              >
                {language === 'en' ? 'Search' : 'खोजें'}
              </button>
            </form>
          </div>

          {/* Primary Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenBookingWizard}
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{t.bookHomeCollection}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateBookings('reports')}
              className="min-h-[48px] px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span>
                {t.quickReports} ({reports.length})
              </span>
            </button>
          </div>
        </div>

        {/* Right Hero Column: Visual + Pincode Checker */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <HomeCollectionIllustration className="flex-1 flex items-center" />
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              {t.pincodeCheckerTitle}
            </p>
            <form onSubmit={handlePincodeCheck} className="mt-2.5 flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={pincodeInput}
                onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                placeholder={t.pincodePlaceholder}
                className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono tabular-nums text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
              <button
                type="submit"
                className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {t.checkPincode}
              </button>
            </form>
            {pincodeResult && (
              <p
                className={`mt-2 text-xs flex items-center gap-1.5 ${
                  pincodeResult.found
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{pincodeResult.label}</span>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Bookings & Quick Reports Strip */}
      {(upcomingBookings.length > 0 || reports.length > 0) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.upcomingBookings}</h2>
              <button
                type="button"
                onClick={() => onNavigateBookings('upcoming')}
                className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 hover:underline"
              >
                {t.viewAll} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {upcomingBookings.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t.noBookingsDesc}</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {upcomingBookings.slice(0, 2).map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {b.patientName} · <span className="font-mono text-xs">{b.bookingCode}</span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {b.collectionDate} · {b.timeSlot}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.quickReports}</h2>
              <button
                type="button"
                onClick={() => onNavigateBookings('reports')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 inline-flex items-center gap-1 hover:underline"
              >
                {t.viewAll} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {reports.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t.noReportsDesc}</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
                {reports.slice(0, 2).map((r) => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {r.reportTitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {r.patientName} · {r.bookingCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigateBookings('reports')}
                      className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline whitespace-nowrap"
                    >
                      Open PDF
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Popular Blood Tests */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.popularTests}</h2>
          <button
            type="button"
            onClick={onNavigateCatalogue}
            className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 hover:underline"
          >
            {t.viewAll} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularTests.map((test) => {
            const inCart = cartIds.has(test.id);
            return (
              <div
                key={test.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">{test.category}</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                    {language === 'hi' && test.nameHi ? test.nameHi : test.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                    {language === 'hi' && test.shortDescriptionHi
                      ? test.shortDescriptionHi
                      : test.shortDescription}
                  </p>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {test.fastingRequired ? `${t.fastingRequired} (${test.fastingHours}h)` : t.noFasting} ·{' '}
                      {test.reportDeliveryHours}
                      {t.hours}
                    </span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
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
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">{t.demoPriceTag}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddTestToCart(test)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      inCart
                        ? 'bg-teal-700 text-white'
                        : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{inCart ? t.added : t.addToCart}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recommended Health Packages */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.recommendedPackages}</h2>
          <button
            type="button"
            onClick={onNavigateCatalogue}
            className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 hover:underline"
          >
            {t.viewAll} <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recommendedPackages.map((pkg) => {
            const inCart = cartIds.has(pkg.id);
            return (
              <div
                key={pkg.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                    {pkg.testCount} Parameters · {pkg.fastingRequired ? t.fastingRequired : t.noFasting}
                  </p>
                  <h3 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                    {language === 'hi' && pkg.nameHi ? pkg.nameHi : pkg.name}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {language === 'hi' && pkg.descriptionHi ? pkg.descriptionHi : pkg.description}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {pkg.includedTests.slice(0, 4).map((item) => (
                      <li key={item}>· {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                  <button
                    type="button"
                    onClick={() => {
                      onAddPackageToCart(pkg);
                      onOpenBookingWizard();
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {inCart ? t.proceedToBooking : t.bookNow}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Special Offers & Support Strip */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 rounded-2xl bg-gradient-to-r from-indigo-950 to-teal-900 p-6 text-white">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Percent className="w-5 h-5 text-teal-300" />
            {t.specialOffers}
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {offers
              .filter((o) => o.active)
              .slice(0, 2)
              .map((offer) => (
                <div key={offer.id} className="rounded-xl bg-white/10 p-4">
                  <p className="text-sm font-bold">
                    {language === 'hi' && offer.titleHi ? offer.titleHi : offer.title}
                  </p>
                  <p className="mt-1 text-xs text-indigo-100">{offer.description}</p>
                  <p className="mt-2.5 text-xs font-mono tracking-wider text-teal-200">
                    CODE: {offer.code} · {offer.discountPercent}% OFF
                  </p>
                </div>
              ))}
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t.supportSection}</h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Need help choosing a panel or coordinating a senior citizen home visit?
            </p>
          </div>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hello Testo Home team, I need assistance with a home blood test booking.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 min-h-[44px] w-full rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.whatsappSupport}</span>
          </a>
        </div>
      </section>
    </div>
  );
};
