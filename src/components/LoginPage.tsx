import React, { useState } from 'react';
import { Moon, ShieldCheck, Sun, Globe, CheckCircle2, Home, FileCheck2 } from 'lucide-react';
import { HomeCollectionIllustration, TestoHomeLogo } from './BrandAssets';
import { Language } from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { PWAInstallButton } from './PWAControls';

interface LoginPageProps {
  onGoogleSignIn: () => Promise<void>;
  isSigningIn: boolean;
  authError: string | null;
  language: Language;
  onToggleLanguage: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onGoogleSignIn,
  isSigningIn,
  authError,
  language,
  onToggleLanguage,
  darkMode,
  onToggleDarkMode,
}) => {
  const t = TRANSLATIONS[language];
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Clean 3-zone Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <TestoHomeLogo size="md" />
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>{language === 'en' ? 'हिंदी' : 'English'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-800" />}
          </button>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left: Login Card */}
        <div className="lg:col-span-6 order-2 lg:order-1">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-400">
              {t.tagline}
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white text-balance">
              {language === 'en'
                ? 'Diagnostic blood tests, collected safely at your doorstep.'
                : 'घर बैठे सुरक्षित और सुविधाजनक ब्लड टेस्ट सैंपल कलेक्शन।'}
            </h1>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {t.loginSubtitle}
            </p>

            {authError && (
              <div
                role="alert"
                className="mt-5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
              >
                {authError}
              </div>
            )}

            <div className="mt-7 space-y-3">
              <button
                type="button"
                onClick={() => void onGoogleSignIn()}
                disabled={isSigningIn}
                className="w-full min-h-[52px] rounded-2xl bg-indigo-900 hover:bg-indigo-800 disabled:opacity-60 text-white font-semibold text-base px-6 py-3.5 flex items-center justify-center gap-3 shadow-sm transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#FFFFFF"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"
                  />
                </svg>
                <span>{isSigningIn ? 'Signing in...' : t.signInWithGoogle}</span>
              </button>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  {t.loginSecurityNote}
                </span>
                <PWAInstallButton compact />
              </div>
            </div>

            {/* Trust Assurances */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-start gap-2.5">
                <Home className="w-4 h-4 text-indigo-700 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Home Collection</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trained personnel</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <FileCheck2 className="w-4 h-4 text-teal-700 dark:text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Private PDF Reports</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Account-locked access</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">Family Friendly</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Seniors &amp; kids supported</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Editorial Medical Visual */}
        <div className="lg:col-span-6 order-1 lg:order-2 space-y-5">
          <HomeCollectionIllustration className="shadow-sm" />
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Transparent Preparation &amp; Patient Safeguards
            </h2>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.healthcareDisclaimer}
            </p>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="mt-3 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
            >
              {t.privacyTerms}
            </button>
          </div>
        </div>
      </main>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Privacy Policy &amp; Service Terms</h3>
            <div className="mt-3 space-y-2.5 text-sm text-slate-600 dark:text-slate-300 max-h-80 overflow-y-auto pr-1">
              <p>
                <strong>Authentication &amp; Data Protection:</strong> Testo Home uses Google Sign-In via Firebase
                Authentication. We never collect or store passwords. Your personal profile, saved addresses, bookings,
                and test reports are strictly isolated to your authenticated user UID.
              </p>
              <p>
                <strong>Sample Collection Safety:</strong> Blood sample collection is conducted exclusively by trained
                phlebotomy personnel using single-use sterile equipment.
              </p>
              <p>
                <strong>No Medical Diagnosis:</strong> Testo Home facilitates diagnostic test scheduling and digital
                report delivery. We do not provide medical diagnoses, prescriptions, or clinical interpretations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="mt-5 w-full rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white py-2.5 text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
