import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  Home,
  TestTube2,
  User,
  Sun,
  Moon,
  Globe,
  CalendarPlus,
  Shield,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import {
  Booking,
  CartItem,
  CollectionSlot,
  CustomerScreen,
  DiagnosticReport,
  DiagnosticTest,
  HealthPackage,
  Language,
  Offer,
  OperationalConfig,
  PatientProfile,
  SavedAddress,
  ServiceablePincode,
  UserProfile,
} from './types';
import {
  DEFAULT_OFFERS,
  DEFAULT_OPERATIONAL_CONFIG,
  DEFAULT_PACKAGES,
  DEFAULT_PINCODES,
  DEFAULT_SLOTS,
  DEFAULT_TESTS,
  seedInitialCatalogIfAdmin,
} from './data/seedCatalog';
import { TRANSLATIONS } from './i18n/translations';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TestoHomeLogo } from './components/BrandAssets';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { LoginPage } from './components/LoginPage';
import { HomeDashboard } from './components/HomeDashboard';
import { TestsCatalogue } from './components/TestsCatalogue';
import { MyBookingsPage } from './components/MyBookingsPage';
import { ProfilePage } from './components/ProfilePage';
import { BookingWizardModal } from './components/BookingWizardModal';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const BOOTSTRAP_ADMIN_EMAIL = 'sibansh.0251mba292@dgu.ac.in';

function AppShell() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [screen, setScreen] = useState<CustomerScreen>('home');
  const [bookingsInitialTab, setBookingsInitialTab] = useState<'upcoming' | 'history' | 'reports'>('upcoming');
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('testo_lang');
    return saved === 'hi' ? 'hi' : 'en';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('testo_theme') === 'dark';
  });

  // Public Catalogue & Config (with realistic defaults until Firestore is seeded)
  const [tests, setTests] = useState<DiagnosticTest[]>(DEFAULT_TESTS);
  const [packages, setPackages] = useState<HealthPackage[]>(DEFAULT_PACKAGES);
  const [offers, setOffers] = useState<Offer[]>(DEFAULT_OFFERS);
  const [pincodes, setPincodes] = useState<ServiceablePincode[]>(DEFAULT_PINCODES);
  const [slots, setSlots] = useState<CollectionSlot[]>(DEFAULT_SLOTS);
  const [operationalConfig, setOperationalConfig] = useState<OperationalConfig>(DEFAULT_OPERATIONAL_CONFIG);

  // Private Customer State
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reports, setReports] = useState<DiagnosticReport[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);

  // Cart & Booking Wizard
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const t = TRANSLATIONS[language];

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('testo_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('testo_theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('testo_lang', language);
  }, [language]);

  // Listen to Firebase Auth State
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserProfile(null);
        setIsAdmin(false);
        setAdminMode(false);
        setBookings([]);
        setReports([]);
        setPatients([]);
        setAddresses([]);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', fbUser.uid);
        const existingSnap = await getDoc(userRef);

        if (!existingSnap.exists()) {
          await setDoc(userRef, {
            uid: fbUser.uid,
            name: fbUser.displayName || 'Testo Home Patient',
            email: fbUser.email || '',
            photoURL: fbUser.photoURL || '',
            preferredLanguage: language,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(
            userRef,
            {
              uid: fbUser.uid,
              name: fbUser.displayName || existingSnap.data().name || 'Testo Home Patient',
              email: fbUser.email || existingSnap.data().email || '',
              photoURL: fbUser.photoURL || existingSnap.data().photoURL || '',
              lastLoginAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        const refreshedSnap = await getDoc(userRef);
        if (refreshedSnap.exists()) {
          setUserProfile(refreshedSnap.data() as UserProfile);
        } else {
          setUserProfile({
            uid: fbUser.uid,
            name: fbUser.displayName || 'Customer',
            email: fbUser.email || '',
            photoURL: fbUser.photoURL || '',
          });
        }

        // Verify Admin status strictly against admins collection or verified bootstrapped email
        let adminFlag =
          fbUser.emailVerified && fbUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
        if (!adminFlag) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', fbUser.uid));
            if (adminDoc.exists()) {
              adminFlag = true;
            }
          } catch {
            adminFlag = false;
          }
        }
        setIsAdmin(adminFlag);
        if (adminFlag) {
          void seedInitialCatalogIfAdmin();
        }
      } catch (err) {
        console.error('Profile sync error:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Public Catalogue Listeners (Tests, Packages, Offers, Pincodes, Slots, Settings)
  useEffect(() => {
    const unsubTests = onSnapshot(
      collection(db, 'tests'),
      (snap) => {
        if (!snap.empty) {
          setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiagnosticTest)));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'tests')
    );

    const unsubPkgs = onSnapshot(
      collection(db, 'packages'),
      (snap) => {
        if (!snap.empty) {
          setPackages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HealthPackage)));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'packages')
    );

    const unsubOffers = onSnapshot(
      collection(db, 'offers'),
      (snap) => {
        if (!snap.empty) {
          setOffers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Offer)));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'offers')
    );

    const unsubPins = onSnapshot(
      collection(db, 'serviceable_pincodes'),
      (snap) => {
        if (!snap.empty) {
          setPincodes(snap.docs.map((d) => d.data() as ServiceablePincode));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'serviceable_pincodes')
    );

    const unsubSlots = onSnapshot(
      collection(db, 'time_slots'),
      (snap) => {
        if (!snap.empty) {
          setSlots(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CollectionSlot)));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'time_slots')
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'operations'),
      (snap) => {
        if (snap.exists()) {
          setOperationalConfig(snap.data() as OperationalConfig);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, 'settings/operations')
    );

    return () => {
      unsubTests();
      unsubPkgs();
      unsubOffers();
      unsubPins();
      unsubSlots();
      unsubSettings();
    };
  }, []);

  // Private Customer Listeners (Only attached when authenticated!)
  useEffect(() => {
    if (!authReady || !firebaseUser) return;

    const uid = firebaseUser.uid;

    const unsubBookings = onSnapshot(
      query(collection(db, 'bookings'), where('userId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
        list.sort((a, b) => (b.bookingCode > a.bookingCode ? 1 : -1));
        setBookings(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubReports = onSnapshot(
      query(collection(db, 'reports'), where('userId', '==', uid)),
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiagnosticReport)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );

    const unsubPatients = onSnapshot(
      query(collection(db, 'patients'), where('userId', '==', uid)),
      (snap) => {
        setPatients(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PatientProfile)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
    );

    const unsubAddresses = onSnapshot(
      collection(db, 'users', uid, 'addresses'),
      (snap) => {
        setAddresses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedAddress)));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/addresses`)
    );

    return () => {
      unsubBookings();
      unsubReports();
      unsubPatients();
      unsubAddresses();
    };
  }, [authReady, firebaseUser]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      setAuthError(msg);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setScreen('home');
    setAdminMode(false);
    setCart([]);
  };

  const toggleTestInCart = (test: DiagnosticTest) => {
    setCart((prev) => {
      const exists = prev.some((c) => c.id === test.id);
      if (exists) return prev.filter((c) => c.id !== test.id);
      return [
        ...prev,
        {
          id: test.id,
          type: 'test',
          name: test.name,
          price: test.discountedPrice,
          originalPrice: test.price,
          fastingRequired: test.fastingRequired,
          fastingHours: test.fastingHours,
          reportDeliveryHours: test.reportDeliveryHours,
        },
      ];
    });
  };

  const togglePackageInCart = (pkg: HealthPackage) => {
    setCart((prev) => {
      const exists = prev.some((c) => c.id === pkg.id);
      if (exists) return prev.filter((c) => c.id !== pkg.id);
      return [
        ...prev,
        {
          id: pkg.id,
          type: 'package',
          name: pkg.name,
          price: pkg.discountedPrice,
          originalPrice: pkg.price,
          fastingRequired: pkg.fastingRequired,
          fastingHours: pkg.fastingHours,
          reportDeliveryHours: pkg.reportDeliveryHours,
        },
      ];
    });
  };

  const cartIds = useMemo(() => new Set(cart.map((c) => c.id)), [cart]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <div className="h-10 w-44 rounded-xl bg-slate-200 dark:bg-slate-800 mx-auto" />
          <div className="h-48 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
        </div>
      </div>
    );
  }

  // Screen 1: Login
  if (!firebaseUser || !userProfile) {
    return (
      <>
        <LoginPage
          onGoogleSignIn={handleGoogleSignIn}
          isSigningIn={isSigningIn}
          authError={authError}
          language={language}
          onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
        />
        <OfflineIndicator />
      </>
    );
  }

  // Role-Protected Admin Console
  if (adminMode && isAdmin) {
    return (
      <>
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
              <div className="max-w-6xl mx-auto h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
            </div>
          }
        >
          <AdminDashboard
            adminUser={userProfile}
            tests={tests}
            packages={packages}
            offers={offers}
            pincodes={pincodes}
            slots={slots}
            operationalConfig={operationalConfig}
            onExitAdmin={() => setAdminMode(false)}
          />
        </Suspense>
        <OfflineIndicator />
      </>
    );
  }

  const navItems: Array<{ id: CustomerScreen; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: t.navHome, icon: Home },
    { id: 'catalogue', label: t.navTests, icon: TestTube2 },
    { id: 'bookings', label: t.navBookings, icon: CalendarCheck },
    { id: 'profile', label: t.navProfile, icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <TestoHomeLogo size="md" />
        </div>

        <nav className="flex-1 px-4 py-5 space-y-1.5" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'bookings') setBookingsInitialTab('upcoming');
                  setScreen(item.id);
                }}
                className={`w-full min-h-[44px] px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-indigo-900 text-white'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4">
            <button
              type="button"
              onClick={() => setIsBookingOpen(true)}
              className="w-full min-h-[46px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{t.bookHomeCollection}</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setAdminMode(true)}
              className="w-full min-h-[40px] px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{t.adminPortal}</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
              className="flex-1 min-h-[38px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Globe className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>{language === 'en' ? 'हिंदी' : 'EN'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle theme"
              className="min-h-[38px] min-w-[38px] rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-800" />}
            </button>
          </div>
          <PWAInstallButton compact />
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Compact Mobile Top Bar (52px height) */}
        <header className="md:hidden sticky top-0 z-30 h-13 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-2">
          <TestoHomeLogo size="sm" />
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
              className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold"
            >
              {language === 'en' ? 'हिं' : 'EN'}
            </button>
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Toggle theme"
              className="min-h-[36px] min-w-[36px] rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-800" />}
            </button>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
          {toastMsg && (
            <div className="mb-5 rounded-xl bg-teal-700 text-white px-4 py-3 text-xs font-semibold flex items-center justify-between shadow-sm">
              <span>{toastMsg}</span>
              <button type="button" onClick={() => setToastMsg(null)} className="underline ml-3">
                Dismiss
              </button>
            </div>
          )}

          {screen === 'home' && (
            <HomeDashboard
              user={userProfile}
              language={language}
              tests={tests}
              packages={packages}
              offers={offers}
              bookings={bookings}
              reports={reports}
              pincodes={pincodes}
              operationalConfig={operationalConfig}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onNavigateCatalogue={() => setScreen('catalogue')}
              onNavigateBookings={(tab) => {
                setBookingsInitialTab(tab || 'upcoming');
                setScreen('bookings');
              }}
              onOpenBookingWizard={() => setIsBookingOpen(true)}
              onAddTestToCart={toggleTestInCart}
              onAddPackageToCart={togglePackageInCart}
              cartIds={cartIds}
            />
          )}

          {screen === 'catalogue' && (
            <TestsCatalogue
              language={language}
              tests={tests}
              packages={packages}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              cart={cart}
              onToggleTest={toggleTestInCart}
              onTogglePackage={togglePackageInCart}
              onOpenBookingWizard={() => setIsBookingOpen(true)}
            />
          )}

          {screen === 'bookings' && (
            <MyBookingsPage
              language={language}
              bookings={bookings}
              reports={reports}
              slots={slots}
              initialTab={bookingsInitialTab}
              onBookNew={() => setIsBookingOpen(true)}
            />
          )}

          {screen === 'profile' && (
            <ProfilePage
              user={userProfile}
              isAdmin={isAdmin}
              language={language}
              onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'hi' : 'en'))}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
              addresses={addresses}
              patients={patients}
              operationalConfig={operationalConfig}
              onNavigateBookings={(tab) => {
                setBookingsInitialTab(tab || 'upcoming');
                setScreen('bookings');
              }}
              onOpenAdmin={() => setAdminMode(true)}
              onLogout={handleLogout}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation (64px height, 4 tabs) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'bookings') setBookingsInitialTab('upcoming');
                  setScreen(item.id);
                }}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? 'text-indigo-900 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] leading-none whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 5-Step Home Sample Collection Booking Wizard */}
      <BookingWizardModal
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        user={userProfile}
        language={language}
        cart={cart}
        tests={tests}
        packages={packages}
        offers={offers}
        patients={patients}
        addresses={addresses}
        pincodes={pincodes}
        slots={slots}
        operationalConfig={operationalConfig}
        onUpdateCart={setCart}
        onBookingCreated={(code) => {
          setToastMsg(`Booking ${code} submitted! View status in My Bookings.`);
        }}
      />

      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
