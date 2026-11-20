import React, { useMemo, useState } from 'react';
import {
  X,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Download,
} from 'lucide-react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  Booking,
  CartItem,
  CollectionSlot,
  DiagnosticTest,
  HealthPackage,
  Language,
  Offer,
  OperationalConfig,
  PatientProfile,
  PaymentMethod,
  SavedAddress,
  ServiceablePincode,
  UserProfile,
} from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { downloadBookingReceiptPdf } from '../utils/pdfReport';

interface BookingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  language: Language;
  cart: CartItem[];
  tests: DiagnosticTest[];
  packages: HealthPackage[];
  offers: Offer[];
  patients: PatientProfile[];
  addresses: SavedAddress[];
  pincodes: ServiceablePincode[];
  slots: CollectionSlot[];
  operationalConfig: OperationalConfig;
  onUpdateCart: (next: CartItem[]) => void;
  onBookingCreated: (bookingCode: string) => void;
}

export const BookingWizardModal: React.FC<BookingWizardModalProps> = ({
  isOpen,
  onClose,
  user,
  language,
  cart,
  tests,
  packages,
  offers,
  patients,
  addresses,
  pincodes,
  slots,
  operationalConfig,
  onUpdateCart,
  onBookingCreated,
}) => {
  const t = TRANSLATIONS[language];
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 2: Patient & Address
  const [patientName, setPatientName] = useState(user.name || '');
  const [patientAge, setPatientAge] = useState('32');
  const [patientGender, setPatientGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [patientMobile, setPatientMobile] = useState(user.phone || '');
  const [addressLine, setAddressLine] = useState(addresses[0]?.addressLine || '');
  const [landmark, setLandmark] = useState(addresses[0]?.landmark || '');
  const [pincode, setPincode] = useState(addresses[0]?.pincode || '110001');

  // Step 3: Schedule
  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const [collectionDate, setCollectionDate] = useState(tomorrowIso);
  const [timeSlot, setTimeSlot] = useState(slots[0]?.label || '06:00 AM – 08:00 AM (Early Fasting)');

  // Step 4: Payment & Offer
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash on Collection');
  const [upiReference, setUpiReference] = useState('');
  const [offerCodeInput, setOfferCodeInput] = useState('');
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);

  // Step 5: Consent & Submission
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);
  const discountAmount = useMemo(() => {
    if (!appliedOffer) return 0;
    const raw = Math.round((subtotal * appliedOffer.discountPercent) / 100);
    return Math.min(raw, appliedOffer.maxDiscount, subtotal);
  }, [subtotal, appliedOffer]);
  const finalAmount = Math.max(0, subtotal - discountAmount);

  const matchedPincode = useMemo(
    () => pincodes.find((p) => p.pincode === pincode.trim() && p.active),
    [pincodes, pincode]
  );

  if (!isOpen) return null;

  const handleApplyOffer = () => {
    const code = offerCodeInput.trim().toUpperCase();
    const found = offers.find((o) => o.active && o.code.toUpperCase() === code);
    if (!found) {
      setErrorMsg('Invalid or expired offer code. Try HOME20 or FAMILY15.');
      setAppliedOffer(null);
      return;
    }
    setErrorMsg(null);
    setAppliedOffer(found);
  };

  const handleSelectFamilyMember = (member: PatientProfile) => {
    setPatientName(member.name);
    setPatientAge(String(member.age));
    setPatientGender(member.gender);
    setPatientMobile(member.mobile);
  };

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setAddressLine(addr.addressLine);
    setLandmark(addr.landmark || '');
    setPincode(addr.pincode);
  };

  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (cart.length === 0) {
        setErrorMsg('Please select at least one blood test or health package.');
        return false;
      }
      return true;
    }
    if (step === 2) {
      const ageNum = Number(patientAge);
      if (patientName.trim().length < 2) {
        setErrorMsg('Please enter the patient full name.');
        return false;
      }
      if (!Number.isFinite(ageNum) || ageNum < 0 || ageNum > 120) {
        setErrorMsg('Please enter a valid patient age (0–120).');
        return false;
      }
      if (!/^[0-9+\-\s]{10,15}$/.test(patientMobile.trim())) {
        setErrorMsg('Please enter a valid 10–15 digit mobile number.');
        return false;
      }
      if (addressLine.trim().length < 5) {
        setErrorMsg('Please enter a complete collection address.');
        return false;
      }
      if (!/^[0-9]{6}$/.test(pincode.trim())) {
        setErrorMsg('Please enter a valid 6-digit pincode.');
        return false;
      }
      if (!matchedPincode) {
        setErrorMsg('This pincode is not in our serviceable list yet (try 110001, 400001, or 560001).');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (!collectionDate || !timeSlot) {
        setErrorMsg('Please pick both a collection date and time slot.');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setStep((prev) => (prev < 5 ? ((prev + 1) as 1 | 2 | 3 | 4 | 5) : prev));
  };

  const handleConfirmBooking = async () => {
    setErrorMsg(null);
    if (!consentAccepted) {
      setErrorMsg('Please accept the sample collection and privacy consent checkbox.');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setErrorMsg('Please sign in again to complete your booking.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await currentUser.getIdToken();
      const validateRes = await fetch('/api/bookings/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items: cart.map((c) => ({ id: c.id, type: c.type, name: c.name, price: c.price })),
          patientName: patientName.trim(),
          patientAge: Number(patientAge),
          patientGender,
          patientMobile: patientMobile.trim(),
          addressLine: addressLine.trim(),
          pincode: pincode.trim(),
          collectionDate,
          timeSlot,
          paymentMethod,
          consentAccepted: true,
          discountPercent: appliedOffer?.discountPercent || 0,
          maxDiscount: appliedOffer?.maxDiscount || 0,
        }),
      });

      const validated = await validateRes.json();
      if (!validateRes.ok || !validated.valid) {
        setErrorMsg(validated.error || 'Server validation failed for this booking.');
        setIsSubmitting(false);
        return;
      }

      // If Online Payment (Razorpay) is chosen, check server gateway readiness
      let razorpayOrderId: string | undefined;
      if (paymentMethod === 'Online Payment') {
        const orderRes = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            amount: validated.finalAmount,
            bookingCode: validated.bookingCode,
          }),
        });
        const orderData = await orderRes.json();
        if (!orderData.configured) {
          setErrorMsg(
            orderData.message ||
              'Razorpay online checkout keys are not configured yet. Please select Cash on Collection or UPI reference.'
          );
          setIsSubmitting(false);
          return;
        }
        razorpayOrderId = orderData.order?.id;
      }

      const bookingId = validated.bookingCode;
      const newBookingPayload: Record<string, unknown> = {
        bookingCode: validated.bookingCode,
        userId: currentUser.uid,
        items: cart.map((c) => ({ id: c.id, type: c.type, name: c.name, price: c.price })),
        totalAmount: validated.totalAmount,
        discountAmount: validated.discountAmount,
        finalAmount: validated.finalAmount,
        ...(appliedOffer ? { offerCode: appliedOffer.code } : {}),
        patientName: patientName.trim(),
        patientAge: Number(patientAge),
        patientGender,
        patientMobile: patientMobile.trim(),
        addressLine: addressLine.trim(),
        ...(landmark.trim() ? { landmark: landmark.trim() } : {}),
        pincode: pincode.trim(),
        collectionDate,
        timeSlot,
        paymentMethod,
        paymentStatus: 'pending',
        ...(razorpayOrderId ? { razorpayOrderId } : {}),
        status: 'Pending',
        consentAccepted: true,
        isDemoBooking: !operationalConfig.liveBookingsEnabled,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'bookings', bookingId), newBookingPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
      }

      // If customer provided a UPI transaction reference, submit it as awaiting_verification
      if (paymentMethod === 'UPI' && upiReference.trim().length >= 4) {
        try {
          await setDoc(
            doc(db, 'bookings', bookingId),
            {
              ...newBookingPayload,
              paymentStatus: 'awaiting_verification',
              paymentReference: upiReference.trim(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {
          // Non-fatal if user cancels proof update
        }
      }

      const createdRecord: Booking = {
        id: bookingId,
        bookingCode: validated.bookingCode,
        userId: currentUser.uid,
        items: cart.map((c) => ({ id: c.id, type: c.type, name: c.name, price: c.price })),
        totalAmount: validated.totalAmount,
        discountAmount: validated.discountAmount,
        finalAmount: validated.finalAmount,
        offerCode: appliedOffer?.code,
        patientName: patientName.trim(),
        patientAge: Number(patientAge),
        patientGender,
        patientMobile: patientMobile.trim(),
        addressLine: addressLine.trim(),
        landmark: landmark.trim(),
        pincode: pincode.trim(),
        collectionDate,
        timeSlot,
        paymentMethod,
        paymentStatus: paymentMethod === 'UPI' && upiReference.trim() ? 'awaiting_verification' : 'pending',
        status: 'Pending',
        consentAccepted: true,
        isDemoBooking: !operationalConfig.liveBookingsEnabled,
      };

      setConfirmedBooking(createdRecord);
      onUpdateCart([]);
      onBookingCreated(validated.bookingCode);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unable to submit booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {confirmedBooking ? t.bookingConfirmed : t.bookHomeCollection}
            </h2>
            {!confirmedBooking && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {step} of 5 ·{' '}
                {step === 1
                  ? t.step1Title
                  : step === 2
                    ? t.step2Title
                    : step === 3
                      ? t.step3Title
                      : step === 4
                        ? t.step4Title
                        : t.step5Title}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedBooking(null);
              setStep(1);
              onClose();
            }}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close booking wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Strip */}
        {!confirmedBooking && (
          <div className="px-6 pt-3 pb-1 grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-1.5 rounded-full transition-colors ${
                  n <= step ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3.5 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {confirmedBooking ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  {confirmedBooking.isDemoBooking
                    ? 'Pre-Launch Demo Reservation Saved'
                    : 'Home Collection Request Confirmed'}
                </p>
                <h3 className="mt-1 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                  {confirmedBooking.bookingCode}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Scheduled for <strong>{confirmedBooking.collectionDate}</strong> ({confirmedBooking.timeSlot}) for{' '}
                  <strong>{confirmedBooking.patientName}</strong>.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-left text-xs space-y-1.5 text-slate-600 dark:text-slate-300">
                <p>
                  <strong>Address:</strong> {confirmedBooking.addressLine}, {confirmedBooking.pincode}
                </p>
                <p>
                  <strong>Payment:</strong> {confirmedBooking.paymentMethod} ·{' '}
                  <span className="font-mono font-semibold">₹{confirmedBooking.finalAmount}</span>
                </p>
                <p>
                  <strong>Status:</strong> {confirmedBooking.status} (You will be notified once a phlebotomist is assigned.)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => downloadBookingReceiptPdf(confirmedBooking)}
                  className="flex-1 min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Summary PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmedBooking(null);
                    setStep(1);
                    onClose();
                  }}
                  className="flex-1 min-h-[46px] rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 text-center space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Your test list is empty. Quick-add a popular test or package below:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {tests.slice(0, 3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          onUpdateCart([
                            ...cart,
                            {
                              id: item.id,
                              type: 'test',
                              name: item.name,
                              price: item.discountedPrice,
                              originalPrice: item.price,
                              fastingRequired: item.fastingRequired,
                              fastingHours: item.fastingHours,
                              reportDeliveryHours: item.reportDeliveryHours,
                            },
                          ])
                        }
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-indigo-500"
                      >
                        + {item.name} (₹{item.discountedPrice})
                      </button>
                    ))}
                    {packages.slice(0, 1).map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() =>
                          onUpdateCart([
                            ...cart,
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
                          ])
                        }
                        className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:border-teal-500"
                      >
                        + {pkg.name} (₹{pkg.discountedPrice})
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {cart.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.fastingRequired ? `Fasting (${item.fastingHours || 8}h)` : 'No fasting'} · Report in{' '}
                          {item.reportDeliveryHours}h
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                          ₹{item.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateCart(cart.filter((c) => c.id !== item.id))}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Offer Code */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={offerCodeInput}
                  onChange={(e) => setOfferCodeInput(e.target.value.toUpperCase())}
                  placeholder="Promo code (e.g. HOME20)"
                  className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyOffer}
                  className="min-h-[42px] px-4 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold"
                >
                  Apply
                </button>
              </div>
              {appliedOffer && (
                <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                  Applied {appliedOffer.code}: -₹{discountAmount} discount
                </p>
              )}
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              {patients.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Quick-fill from saved family profiles:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {patients.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectFamilyMember(m)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-indigo-600"
                      >
                        {m.name} ({m.relation})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.patientName}
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.age}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.gender}
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.mobile}
                  </label>
                  <input
                    type="tel"
                    value={patientMobile}
                    onChange={(e) => setPatientMobile(e.target.value)}
                    placeholder="+91 98XXXXXXXX"
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
                  />
                </div>
              </div>

              {addresses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Saved addresses:</p>
                  <div className="flex flex-wrap gap-2">
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(a)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium hover:border-teal-600"
                      >
                        {a.label} · {a.pincode}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.address}
                  </label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => setAddressLine(e.target.value)}
                    placeholder="Flat 402, Green Park Residency"
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.landmark}
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near Metro Gate 2"
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t.pincode}
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    inputMode="numeric"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
                  />
                  {matchedPincode ? (
                    <p className="mt-1 text-[11px] text-teal-700 dark:text-teal-400">
                      Serviceable: {matchedPincode.area}, {matchedPincode.city}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      Demo serviceable pincodes: 110001, 400001, 560001, 122001
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : step === 3 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                  <span>{t.collectionDate}</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.timeSlot}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {slots
                    .filter((s) => s.active)
                    .map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setTimeSlot(slot.label)}
                        className={`min-h-[48px] px-4 py-3 rounded-xl border text-left text-xs font-semibold transition-colors cursor-pointer ${
                          timeSlot === slot.label
                            ? 'border-indigo-900 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          ) : step === 4 ? (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                <span>{t.paymentMethod}</span>
              </p>

              <div className="space-y-2.5">
                {(
                  [
                    {
                      value: 'Cash on Collection' as PaymentMethod,
                      label: t.cashOption,
                      desc: 'Pay the trained phlebotomist at your doorstep after sample collection.',
                    },
                    {
                      value: 'UPI' as PaymentMethod,
                      label: t.upiOption,
                      desc: 'Submit your UPI transaction reference for server & admin verification.',
                    },
                    {
                      value: 'Online Payment' as PaymentMethod,
                      label: t.onlineOption,
                      desc: 'Razorpay secure gateway (requires configured merchant API keys).',
                    },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethod(opt.value)}
                    className={`w-full p-4 rounded-2xl border text-left transition-colors cursor-pointer ${
                      paymentMethod === opt.value
                        ? 'border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/50'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{opt.label}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {paymentMethod === 'UPI' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    UPI Transaction Reference (Optional now, verified by admin)
                  </label>
                  <input
                    type="text"
                    value={upiReference}
                    onChange={(e) => setUpiReference(e.target.value)}
                    placeholder="e.g. UTR40291839201"
                    className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!operationalConfig.liveBookingsEnabled && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Operational Configuration Pending:</strong> Laboratory, collection staff, pricing, and live
                  service availability are in pre-launch mode. Confirming creates a non-clinical demo booking preview.
                </div>
              )}

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <p>
                  <strong>Patient:</strong> {patientName} ({patientAge} yrs · {patientGender}) · {patientMobile}
                </p>
                <p>
                  <strong>Address:</strong> {addressLine}
                  {landmark ? `, ${landmark}` : ''} · {pincode}
                </p>
                <p>
                  <strong>Schedule:</strong> {collectionDate} · {timeSlot}
                </p>
                <p>
                  <strong>Payment:</strong> {paymentMethod}
                </p>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total Payable ({cart.length} items)</span>
                  <span className="font-mono tabular-nums">₹{finalAmount}</span>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentAccepted}
                  onChange={(e) => setConsentAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-indigo-900"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.consentLabel}</span>
              </label>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
                <span>Validated server-side and isolated strictly to your authenticated account.</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        {!confirmedBooking && (
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div className="text-xs font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                Total: ₹{finalAmount}
              </div>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="min-h-[44px] px-6 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleConfirmBooking()}
                disabled={isSubmitting}
                className="min-h-[44px] px-6 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : t.confirmBooking}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
