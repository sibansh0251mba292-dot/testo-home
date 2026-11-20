import React, { useState } from 'react';
import {
  MapPin,
  Users,
  Plus,
  Trash2,
  LogOut,
  Shield,
  MessageCircle,
  Moon,
  Sun,
  Globe,
  FileText,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Language,
  OperationalConfig,
  PatientProfile,
  SavedAddress,
  UserProfile,
} from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { PWAInstallButton } from './PWAControls';

interface ProfilePageProps {
  user: UserProfile;
  isAdmin: boolean;
  language: Language;
  onToggleLanguage: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  addresses: SavedAddress[];
  patients: PatientProfile[];
  operationalConfig: OperationalConfig;
  onNavigateBookings: (tab?: 'upcoming' | 'history' | 'reports') => void;
  onOpenAdmin: () => void;
  onLogout: () => Promise<void>;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  isAdmin,
  language,
  onToggleLanguage,
  darkMode,
  onToggleDarkMode,
  addresses,
  patients,
  operationalConfig,
  onNavigateBookings,
  onOpenAdmin,
  onLogout,
}) => {
  const t = TRANSLATIONS[language];
  const [phoneInput, setPhoneInput] = useState(user.phone || '');
  const [phoneSaved, setPhoneSaved] = useState(false);

  // Add Address Form
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrLine, setAddrLine] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');
  const [addrPincode, setAddrPincode] = useState('');

  // Add Family Member Form
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patName, setPatName] = useState('');
  const [patAge, setPatAge] = useState('');
  const [patGender, setPatGender] = useState<'Male' | 'Female' | 'Other'>('Female');
  const [patRelation, setPatRelation] = useState('Parent');
  const [patMobile, setPatMobile] = useState(user.phone || '');

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        phone: phoneInput.trim(),
        updatedAt: serverTimestamp(),
      });
      setPhoneSaved(true);
      setTimeout(() => setPhoneSaved(false), 2500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(addrPincode.trim()) || addrLine.trim().length < 5) return;
    const addrId = `addr-${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'addresses', addrId), {
        userId: user.uid,
        label: addrLabel.trim() || 'Home',
        addressLine: addrLine.trim(),
        ...(addrLandmark.trim() ? { landmark: addrLandmark.trim() } : {}),
        pincode: addrPincode.trim(),
        isDefault: addresses.length === 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAddrLine('');
      setAddrLandmark('');
      setAddrPincode('');
      setShowAddrForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/addresses/${addrId}`);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/addresses/${id}`);
    }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const ageNum = Number(patAge);
    if (!patName.trim() || !Number.isFinite(ageNum) || !/^[0-9+\-\s]{10,15}$/.test(patMobile.trim())) {
      return;
    }
    const patId = `pat-${Date.now()}`;
    try {
      await setDoc(doc(db, 'patients', patId), {
        userId: user.uid,
        name: patName.trim(),
        age: ageNum,
        gender: patGender,
        relation: patRelation.trim() || 'Family',
        mobile: patMobile.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPatName('');
      setPatAge('');
      setShowPatientForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `patients/${patId}`);
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'patients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${id}`);
    }
  };

  const whatsappNumber = (operationalConfig.supportWhatsApp || '919800000000').replace(/[^0-9]/g, '');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.profileTitle}</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="min-h-[42px] px-4 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Shield className="w-4 h-4 text-teal-300" />
            <span>{t.adminPortal}</span>
          </button>
        )}
      </div>

      {/* Account Card */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-900 text-white flex items-center justify-center text-lg font-bold">
                {user.name?.[0] || 'U'}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>

          <form onSubmit={(e) => void handleSavePhone(e)} className="flex items-center gap-2">
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="Mobile number"
              className="min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono w-44"
            />
            <button
              type="submit"
              className="min-h-[40px] px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            >
              {phoneSaved ? 'Saved' : 'Save'}
            </button>
          </form>
        </div>

        {/* Quick Shortcuts */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigateBookings('upcoming')}
            className="min-h-[48px] px-4 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            <span className="inline-flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              {t.myBookingsTitle}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => onNavigateBookings('reports')}
            className="min-h-[48px] px-4 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-100"
          >
            <span className="inline-flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              {t.myReportsTitle}
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </section>

      {/* Saved Addresses & Family Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saved Addresses */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              {t.savedAddresses}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddrForm(!showAddrForm)}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {showAddrForm && (
            <form onSubmit={(e) => void handleAddAddress(e)} className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={addrLabel}
                  onChange={(e) => setAddrLabel(e.target.value)}
                  placeholder="Label (Home / Parents)"
                  className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={addrPincode}
                  onChange={(e) => setAddrPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit Pincode"
                  className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                />
              </div>
              <input
                type="text"
                required
                value={addrLine}
                onChange={(e) => setAddrLine(e.target.value)}
                placeholder="Complete street / flat address"
                className="w-full min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              />
              <input
                type="text"
                value={addrLandmark}
                onChange={(e) => setAddrLandmark(e.target.value)}
                placeholder="Landmark (optional)"
                className="w-full min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              />
              <button
                type="submit"
                className="w-full min-h-[38px] rounded-lg bg-indigo-900 text-white text-xs font-semibold"
              >
                Save Address
              </button>
            </form>
          )}

          {addresses.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">No saved addresses yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {addresses.map((addr) => (
                <div key={addr.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {addr.label} · <span className="font-mono text-xs">{addr.pincode}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{addr.addressLine}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteAddress(addr.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    aria-label="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Family Member Profiles */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              {t.familyMembers}
            </h2>
            <button
              type="button"
              onClick={() => setShowPatientForm(!showPatientForm)}
              className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {showPatientForm && (
            <form onSubmit={(e) => void handleAddPatient(e)} className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={patName}
                  onChange={(e) => setPatName(e.target.value)}
                  placeholder="Full Name"
                  className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  required
                  value={patRelation}
                  onChange={(e) => setPatRelation(e.target.value)}
                  placeholder="Relation (Mother, Spouse)"
                  className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  required
                  min={0}
                  max={120}
                  value={patAge}
                  onChange={(e) => setPatAge(e.target.value)}
                  placeholder="Age"
                  className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                />
                <select
                  value={patGender}
                  onChange={(e) => setPatGender(e.target.value as 'Male' | 'Female' | 'Other')}
                  className="min-h-[38px] px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  type="tel"
                  required
                  value={patMobile}
                  onChange={(e) => setPatMobile(e.target.value)}
                  placeholder="Mobile"
                  className="min-h-[38px] px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[38px] rounded-lg bg-indigo-900 text-white text-xs font-semibold"
              >
                Save Family Profile
              </button>
            </form>
          )}

          {patients.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add parents, spouse, or children for 1-tap booking selection.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {patients.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {m.name} · <span className="text-xs text-teal-700 dark:text-teal-400">{m.relation}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {m.age} yrs · {m.gender} · <span className="font-mono">{m.mobile}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeletePatient(m.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600"
                    aria-label="Delete family member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Preferences, Support & Logout */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Preferences &amp; Support</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleLanguage}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Globe className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>Language: {language === 'en' ? 'English (Switch to हिंदी)' : 'हिंदी (Switch to English)'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-800" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <PWAInstallButton compact />
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hello Testo Home Support')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[42px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.whatsappSupport}</span>
          </a>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="min-h-[42px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t.privacyTerms}
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800">
          {t.healthcareDisclaimer}
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="min-h-[44px] px-5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.logout}</span>
          </button>
        </div>
      </section>

      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.privacyTerms}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your medical reports, patient profiles, and booking addresses are accessible strictly to your signed-in
              Google account and authorized Testo Home administrators processing your sample collection. Sample
              collection is performed by trained personnel. Testo Home does not claim laboratory accreditations unless
              explicitly verified and configured, and does not provide medical diagnoses.
            </p>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(false)}
              className="w-full min-h-[42px] rounded-xl bg-indigo-900 text-white text-sm font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
