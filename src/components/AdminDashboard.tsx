import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  DollarSign,
  FileUp,
  MapPin,
  Plus,
  ShieldCheck,
  TestTube2,
  Users,
} from 'lucide-react';
import { collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../firebase';
import {
  Booking,
  BookingStatus,
  CollectionSlot,
  DiagnosticReport,
  DiagnosticTest,
  HealthPackage,
  Offer,
  OperationalConfig,
  Phlebotomist,
  ServiceablePincode,
  UserProfile,
} from '../types';
import { seedInitialCatalogIfAdmin, TEST_CATEGORIES } from '../data/seedCatalog';

interface AdminDashboardProps {
  adminUser: UserProfile;
  tests: DiagnosticTest[];
  packages: HealthPackage[];
  offers: Offer[];
  pincodes: ServiceablePincode[];
  slots: CollectionSlot[];
  operationalConfig: OperationalConfig;
  onExitAdmin: () => void;
}

const BOOKING_STATUSES: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'Phlebotomist Assigned',
  'Sample Collected',
  'Processing',
  'Report Ready',
  'Cancelled',
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  tests,
  packages,
  offers,
  pincodes,
  slots,
  operationalConfig,
  onExitAdmin,
}) => {
  const [tab, setTab] = useState<'overview' | 'bookings' | 'catalogue' | 'reports' | 'operations'>('overview');
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [phlebotomists, setPhlebotomists] = useState<Phlebotomist[]>([]);
  const [allReports, setAllReports] = useState<DiagnosticReport[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [adminToast, setAdminToast] = useState<string | null>(null);

  // Live Admin Listeners
  React.useEffect(() => {
    const unsubBookings = onSnapshot(
      collection(db, 'bookings'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));
        list.sort((a, b) => (b.bookingCode > a.bookingCode ? 1 : -1));
        setAllBookings(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setAllCustomers(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubPhlebs = onSnapshot(
      collection(db, 'phlebotomists'),
      (snap) => setPhlebotomists(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Phlebotomist))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'phlebotomists')
    );

    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      (snap) => setAllReports(snap.docs.map((d) => ({ id: d.id, ...d.data() } as DiagnosticReport))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );

    return () => {
      unsubBookings();
      unsubUsers();
      unsubPhlebs();
      unsubReports();
    };
  }, []);

  // Form states for Catalogue & Operations
  const [newTestName, setNewTestName] = useState('');
  const [newTestCat, setNewTestCat] = useState<string>(TEST_CATEGORIES[0]);
  const [newTestPrice, setNewTestPrice] = useState('500');
  const [newTestDiscount, setNewTestDiscount] = useState('349');

  const [newPin, setNewPin] = useState('');
  const [newPinCity, setNewPinCity] = useState('');
  const [newPinArea, setNewPinArea] = useState('');

  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotStart, setNewSlotStart] = useState('07:00');
  const [newSlotEnd, setNewSlotEnd] = useState('09:00');

  const [newOfferTitle, setNewOfferTitle] = useState('');
  const [newOfferCode, setNewOfferCode] = useState('');
  const [newOfferPct, setNewOfferPct] = useState('15');

  // Report Upload form
  const [selectedBookingIdForReport, setSelectedBookingIdForReport] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportSummary, setReportSummary] = useState('');
  const [reportRemarks, setReportRemarks] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [isUploadingReport, setIsUploadingReport] = useState(false);

  const todayIso = new Date().toISOString().split('T')[0];

  const metrics = useMemo(() => {
    const dailyCount = allBookings.filter((b) => b.collectionDate === todayIso && b.status !== 'Cancelled').length;
    const paidRevenue = allBookings
      .filter((b) => b.paymentStatus === 'paid' && b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.finalAmount || 0), 0);
    const pendingRevenue = allBookings
      .filter((b) => b.paymentStatus !== 'paid' && b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.finalAmount || 0), 0);
    return {
      totalBookings: allBookings.length,
      dailyAppointments: dailyCount,
      totalCustomers: allCustomers.length,
      paidRevenue,
      pendingRevenue,
    };
  }, [allBookings, allCustomers, todayIso]);

  const notify = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3500);
  };

  const handleSeedDatabase = async () => {
    await seedInitialCatalogIfAdmin();
    notify('Sample diagnostic catalogue, pincodes, slots, and operational settings verified/seeded.');
  };

  const handleToggleOperationalFlag = async (field: keyof OperationalConfig, value: boolean) => {
    try {
      await setDoc(
        doc(db, 'settings', 'operations'),
        {
          ...operationalConfig,
          [field]: value,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      notify(`Updated ${field} to ${value ? 'Configured' : 'Pending'}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/operations');
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        updatedAt: serverTimestamp(),
      });
      notify(`Updated booking ${bookingId} status to ${status}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleAssignPhlebotomist = async (bookingId: string, phlebId: string) => {
    const agent = phlebotomists.find((p) => p.id === phlebId);
    if (!agent) return;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        assignedAgentId: agent.id,
        assignedAgentName: agent.name,
        assignedAgentPhone: agent.phone,
        status: 'Phlebotomist Assigned',
        updatedAt: serverTimestamp(),
      });
      notify(`Assigned ${agent.name} to ${bookingId}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleMarkPaymentPaid = async (bookingId: string) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        paymentStatus: 'paid',
        updatedAt: serverTimestamp(),
      });
      notify(`Marked payment as paid for ${bookingId}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  const handleUpdateTestPrice = async (test: DiagnosticTest, nextDiscountPrice: number, isDemo: boolean) => {
    try {
      await updateDoc(doc(db, 'tests', test.id), {
        discountedPrice: Math.min(Math.max(0, nextDiscountPrice), test.price),
        isDemoPrice: isDemo,
        updatedAt: serverTimestamp(),
      });
      notify(`Updated pricing for ${test.name}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tests/${test.id}`);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `test-${Date.now()}`;
    const priceNum = Number(newTestPrice) || 500;
    const discNum = Math.min(Number(newTestDiscount) || priceNum, priceNum);
    try {
      await setDoc(doc(db, 'tests', id), {
        name: newTestName.trim(),
        category: newTestCat,
        shortDescription: `${newTestName.trim()} diagnostic laboratory blood panel.`,
        price: priceNum,
        discountedPrice: discNum,
        isDemoPrice: !operationalConfig.pricingConfigured,
        preparation: 'Follow standard morning collection guidance.',
        fastingRequired: false,
        fastingHours: 0,
        reportDeliveryHours: 24,
        sampleType: 'Serum / Blood',
        isPopular: false,
        active: true,
        updatedAt: serverTimestamp(),
      });
      setNewTestName('');
      notify('Added new blood test to catalogue.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tests/${id}`);
    }
  };

  const handleAddPincode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[0-9]{6}$/.test(newPin.trim())) return;
    try {
      await setDoc(doc(db, 'serviceable_pincodes', newPin.trim()), {
        pincode: newPin.trim(),
        city: newPinCity.trim(),
        area: newPinArea.trim(),
        serviceFee: 0,
        active: true,
        updatedAt: serverTimestamp(),
      });
      setNewPin('');
      setNewPinCity('');
      setNewPinArea('');
      notify('Added serviceable pincode.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `serviceable_pincodes/${newPin}`);
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `slot-${Date.now()}`;
    try {
      await setDoc(doc(db, 'time_slots', id), {
        label: newSlotLabel.trim(),
        startTime: newSlotStart,
        endTime: newSlotEnd,
        maxBookings: 20,
        active: true,
        updatedAt: serverTimestamp(),
      });
      setNewSlotLabel('');
      notify('Added collection time slot.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `time_slots/${id}`);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `offer-${Date.now()}`;
    const code = newOfferCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!code) return;
    try {
      await setDoc(doc(db, 'offers', id), {
        title: newOfferTitle.trim(),
        code,
        discountPercent: Math.min(90, Math.max(1, Number(newOfferPct) || 10)),
        maxDiscount: 500,
        description: `${newOfferPct}% off with code ${code}`,
        active: true,
        updatedAt: serverTimestamp(),
      });
      setNewOfferTitle('');
      setNewOfferCode('');
      notify(`Created offer ${code}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `offers/${id}`);
    }
  };

  const handleIssueReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBooking = allBookings.find((b) => b.id === selectedBookingIdForReport);
    if (!targetBooking || !reportTitle.trim()) return;

    setIsUploadingReport(true);
    try {
      const reportId = `rep-${Date.now()}`;
      let storagePath = '';
      let downloadUrl = '';
      let fileName = `${targetBooking.bookingCode}-report.pdf`;

      if (reportFile) {
        fileName = reportFile.name;
        storagePath = `reports/${targetBooking.userId}/${reportId}-${reportFile.name}`;
        try {
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, reportFile);
          downloadUrl = await getDownloadURL(storageRef);
        } catch {
          // Fallback to authorized on-demand PDF rendering if Storage bucket CORS/rules are not yet enabled
          storagePath = '';
          downloadUrl = '';
        }
      }

      await setDoc(doc(db, 'reports', reportId), {
        userId: targetBooking.userId,
        bookingId: targetBooking.id,
        bookingCode: targetBooking.bookingCode,
        patientName: targetBooking.patientName,
        reportTitle: reportTitle.trim(),
        testSummary: reportSummary.trim() || targetBooking.items.map((i) => i.name).join(', '),
        ...(storagePath ? { storagePath } : {}),
        ...(downloadUrl ? { downloadUrl } : {}),
        fileName,
        remarks: reportRemarks.trim() || 'Released by administrator. Consult your physician.',
        notified: true,
        issuedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'bookings', targetBooking.id), {
        status: 'Report Ready',
        updatedAt: serverTimestamp(),
      });

      setReportTitle('');
      setReportSummary('');
      setReportRemarks('');
      setReportFile(null);
      notify(`Issued report for ${targetBooking.bookingCode} and marked status Report Ready.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    } finally {
      setIsUploadingReport(false);
    }
  };

  const filteredBookings = useMemo(
    () => allBookings.filter((b) => statusFilter === 'All' || b.status === statusFilter),
    [allBookings, statusFilter]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-6 h-6 text-indigo-800 dark:text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Testo Home · Admin Console</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Authorized: {adminUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onExitAdmin}
            className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customer App</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {adminToast && (
          <div className="rounded-xl bg-teal-700 text-white px-4 py-3 text-xs font-semibold shadow-sm">
            {adminToast}
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(
            [
              { id: 'overview', label: 'Overview & Readiness', icon: ClipboardList },
              { id: 'bookings', label: 'Bookings & Dispatch', icon: Calendar },
              { id: 'reports', label: 'Upload PDF Reports', icon: FileUp },
              { id: 'catalogue', label: 'Tests, Prices & Offers', icon: TestTube2 },
              { id: 'operations', label: 'Pincodes, Slots & Customers', icon: MapPin },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`min-h-[42px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  tab === item.id
                    ? 'bg-indigo-900 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Bookings</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums">{metrics.totalBookings}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Today&apos;s Appointments</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums">{metrics.dailyAppointments}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Customers</p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums">{metrics.totalCustomers}</p>
              </div>
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" /> Verified Paid Revenue
                </p>
                <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
                  ₹{metrics.paidRevenue}
                </p>
                <p className="text-[11px] font-mono tabular-nums text-slate-400">
                  Pending collection: ₹{metrics.pendingRevenue}
                </p>
              </div>
            </div>

            {/* Operational Launch Gate Checklist */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold">Operational Launch Readiness Gate</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Real diagnostic bookings stay in Pre-Launch Demo mode until laboratory, staff, pricing, and
                    locations are verified and enabled below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleSeedDatabase()}
                  className="min-h-[40px] px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold inline-flex items-center gap-2"
                >
                  <Database className="w-4 h-4" />
                  <span>Initialize / Seed Firestore Catalogue</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {(
                  [
                    { key: 'labConfigured', label: 'Laboratory Partner' },
                    { key: 'staffConfigured', label: 'Collection Staff' },
                    { key: 'pricingConfigured', label: 'Verified Pricing' },
                    { key: 'locationsConfigured', label: 'Service Locations' },
                    { key: 'liveBookingsEnabled', label: 'Accept Live Bookings' },
                  ] as const
                ).map((item) => {
                  const checked = Boolean(operationalConfig[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => void handleToggleOperationalFlag(item.key, !checked)}
                      className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                        checked
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <p className="text-xs font-semibold">{item.label}</p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        {checked ? 'Configured / Active' : 'Pending Setup'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bookings & Dispatch */}
        {tab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto">
              {['All', ...BOOKING_STATUSES].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-indigo-900 text-white'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filteredBookings.length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                  No bookings match this filter.
                </div>
              ) : (
                filteredBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono font-bold text-indigo-800 dark:text-indigo-300">
                          {b.bookingCode} · {b.collectionDate} ({b.timeSlot})
                        </p>
                        <p className="text-sm font-bold mt-0.5">
                          {b.patientName} ({b.patientAge}y, {b.patientGender}) · {b.patientMobile}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {b.addressLine}, {b.pincode} · Items: {b.items.map((i) => i.name).join(', ')}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-base font-bold font-mono tabular-nums">₹{b.finalAmount}</p>
                        <p className="text-xs text-slate-500">
                          {b.paymentMethod} · <strong>{b.paymentStatus}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
                      <select
                        value={b.status}
                        onChange={(e) => void handleUpdateBookingStatus(b.id, e.target.value as BookingStatus)}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                      >
                        {BOOKING_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            Status: {st}
                          </option>
                        ))}
                      </select>

                      <select
                        value={b.assignedAgentId || ''}
                        onChange={(e) => void handleAssignPhlebotomist(b.id, e.target.value)}
                        className="min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold"
                      >
                        <option value="">Assign Phlebotomist...</option>
                        {phlebotomists.map((phleb) => (
                          <option key={phleb.id} value={phleb.id}>
                            {phleb.name} ({phleb.certificationCode})
                          </option>
                        ))}
                      </select>

                      {b.paymentStatus !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => void handleMarkPaymentPaid(b.id)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                        >
                          Verify &amp; Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Upload PDF Reports */}
        {tab === 'reports' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form
              onSubmit={(e) => void handleIssueReport(e)}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <h2 className="text-base font-bold">Issue / Upload Patient PDF Report</h2>
              <div>
                <label className="block text-xs font-semibold mb-1">Select Customer Booking</label>
                <select
                  required
                  value={selectedBookingIdForReport}
                  onChange={(e) => setSelectedBookingIdForReport(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  <option value="">Choose a booking...</option>
                  {allBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingCode} · {b.patientName} ({b.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Report Title</label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Complete Blood Count & Thyroid Report"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Test Summary</label>
                <input
                  type="text"
                  value={reportSummary}
                  onChange={(e) => setReportSummary(e.target.value)}
                  placeholder="Parameters covered in this release"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Attach PDF File (Optional)</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setReportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 dark:text-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Non-Diagnostic Laboratory Remarks</label>
                <input
                  type="text"
                  value={reportRemarks}
                  onChange={(e) => setReportRemarks(e.target.value)}
                  placeholder="Please review values with your physician."
                  className="w-full min-h-[42px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isUploadingReport}
                className="w-full min-h-[44px] rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold"
              >
                {isUploadingReport ? 'Issuing Report...' : 'Publish Report & Notify Customer'}
              </button>
            </form>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <h2 className="text-base font-bold">Published Reports ({allReports.length})</h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                {allReports.map((r) => (
                  <div key={r.id} className="py-3">
                    <p className="text-sm font-semibold">{r.reportTitle}</p>
                    <p className="text-xs text-slate-500">
                      {r.patientName} · <span className="font-mono">{r.bookingCode}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Catalogue, Prices & Offers */}
        {tab === 'catalogue' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h2 className="text-base font-bold">Manage Blood Tests &amp; Prices ({tests.length})</h2>
              <form onSubmit={(e) => void handleAddTest(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  required
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="New test name"
                  className="sm:col-span-2 min-h-[40px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <select
                  value={newTestCat}
                  onChange={(e) => setNewTestCat(e.target.value)}
                  className="min-h-[40px] px-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                >
                  {TEST_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={newTestDiscount}
                    onChange={(e) => setNewTestDiscount(e.target.value)}
                    placeholder="Price"
                    className="w-20 min-h-[40px] px-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="flex-1 min-h-[40px] px-3 rounded-xl bg-indigo-900 text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                {tests.map((test) => (
                  <div key={test.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{test.name}</p>
                      <p className="text-xs text-slate-500">
                        {test.category} · {test.isDemoPrice ? 'Demo Price' : 'Verified Price'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold">₹{test.discountedPrice}</span>
                      <button
                        type="button"
                        onClick={() => void handleUpdateTestPrice(test, test.discountedPrice + 50, !test.isDemoPrice)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold"
                      >
                        Toggle Demo Flag
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h2 className="text-base font-bold">Manage Promo Offers ({offers.length})</h2>
                <form onSubmit={(e) => void handleAddOffer(e)} className="space-y-2">
                  <input
                    type="text"
                    required
                    value={newOfferTitle}
                    onChange={(e) => setNewOfferTitle(e.target.value)}
                    placeholder="Offer title"
                    className="w-full min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newOfferCode}
                      onChange={(e) => setNewOfferCode(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      className="flex-1 min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    />
                    <input
                      type="number"
                      min={1}
                      max={90}
                      value={newOfferPct}
                      onChange={(e) => setNewOfferPct(e.target.value)}
                      placeholder="%"
                      className="w-20 min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="px-4 rounded-xl bg-teal-700 text-white text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </form>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {offers.map((o) => (
                    <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">{o.title}</span>
                      <span className="font-mono text-teal-700 dark:text-teal-400">
                        {o.code} ({o.discountPercent}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-2">
                <h2 className="text-base font-bold">Active Health Packages ({packages.length})</h2>
                {packages.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1.5">
                    <span>{p.name}</span>
                    <span className="font-mono font-bold">₹{p.discountedPrice}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Operations & Customers */}
        {tab === 'operations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pincodes */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h2 className="text-base font-bold">Serviceable Pincodes</h2>
              <form onSubmit={(e) => void handleAddPincode(e)} className="space-y-2">
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit Pincode"
                  className="w-full min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                />
                <input
                  type="text"
                  required
                  value={newPinCity}
                  onChange={(e) => setNewPinCity(e.target.value)}
                  placeholder="City"
                  className="w-full min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <input
                  type="text"
                  required
                  value={newPinArea}
                  onChange={(e) => setNewPinArea(e.target.value)}
                  placeholder="Area / Zone"
                  className="w-full min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <button type="submit" className="w-full min-h-[38px] rounded-xl bg-indigo-900 text-white text-xs font-semibold">
                  Add Pincode
                </button>
              </form>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pincodes.map((p) => (
                  <div key={p.pincode} className="py-2 text-xs flex justify-between">
                    <span className="font-mono font-bold">{p.pincode}</span>
                    <span className="text-slate-500">
                      {p.area}, {p.city}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h2 className="text-base font-bold">Collection Time Slots</h2>
              <form onSubmit={(e) => void handleAddSlot(e)} className="space-y-2">
                <input
                  type="text"
                  required
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  placeholder="e.g. 07:00 AM – 09:00 AM"
                  className="w-full min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    className="min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                  <input
                    type="text"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    className="min-h-[38px] px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono"
                  />
                </div>
                <button type="submit" className="w-full min-h-[38px] rounded-xl bg-teal-700 text-white text-xs font-semibold">
                  Add Time Slot
                </button>
              </form>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {slots.map((s) => (
                  <div key={s.id} className="py-2 text-xs flex items-center justify-between">
                    <span>{s.label}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                ))}
              </div>
            </div>

            {/* Customers */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                Registered Customers ({allCustomers.length})
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {allCustomers.map((c) => (
                  <div key={c.uid} className="py-2.5">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
