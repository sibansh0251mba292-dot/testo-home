import React, { useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  PhoneCall,
  UserCheck,
  XCircle,
  Bell,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Booking,
  BookingStatus,
  CollectionSlot,
  DiagnosticReport,
  Language,
} from '../types';
import { TRANSLATIONS } from '../i18n/translations';
import { downloadBookingReceiptPdf, downloadDiagnosticReportPdf } from '../utils/pdfReport';

interface MyBookingsPageProps {
  language: Language;
  bookings: Booking[];
  reports: DiagnosticReport[];
  slots: CollectionSlot[];
  initialTab?: 'upcoming' | 'history' | 'reports';
  onBookNew: () => void;
}

const PROGRESS_STAGES: BookingStatus[] = [
  'Pending',
  'Confirmed',
  'Phlebotomist Assigned',
  'Sample Collected',
  'Processing',
  'Report Ready',
];

export const MyBookingsPage: React.FC<MyBookingsPageProps> = ({
  language,
  bookings,
  reports,
  slots,
  initialTab = 'upcoming',
  onBookNew,
}) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history' | 'reports'>(initialTab);
  const [rescheduleTarget, setRescheduleTarget] = useState<Booking | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const upcomingBookings = useMemo(
    () => bookings.filter((b) => b.status !== 'Cancelled' && b.status !== 'Report Ready'),
    [bookings]
  );

  const historyBookings = useMemo(
    () => bookings.filter((b) => b.status === 'Cancelled' || b.status === 'Report Ready'),
    [bookings]
  );

  const readyReportNotifications = useMemo(
    () => reports.filter((r) => r.notified !== false),
    [reports]
  );

  const handleRequestReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !newDate || !newSlot) return;
    setBusyId(rescheduleTarget.id);
    try {
      await updateDoc(doc(db, 'bookings', rescheduleTarget.id), {
        rescheduleRequestedDate: newDate,
        rescheduleRequestedSlot: newSlot,
        updatedAt: serverTimestamp(),
      });
      setActionMsg(`Reschedule requested for ${rescheduleTarget.bookingCode}.`);
      setRescheduleTarget(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${rescheduleTarget.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      await updateDoc(doc(db, 'bookings', cancelTarget.id), {
        status: 'Cancelled',
        cancellationReason: cancelReason.trim() || 'Requested by customer',
        updatedAt: serverTimestamp(),
      });
      setActionMsg(`Booking ${cancelTarget.bookingCode} has been cancelled.`);
      setCancelTarget(null);
      setCancelReason('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${cancelTarget.id}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDownloadReport = (report: DiagnosticReport) => {
    if (report.downloadUrl && report.downloadUrl.startsWith('https://')) {
      const link = document.createElement('a');
      link.href = report.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = report.fileName;
      link.click();
    } else {
      downloadDiagnosticReportPdf(report);
    }
  };

  const renderBookingCard = (booking: Booking) => {
    const stageIdx = PROGRESS_STAGES.indexOf(booking.status);
    const canModify =
      booking.status === 'Pending' ||
      booking.status === 'Confirmed' ||
      booking.status === 'Phlebotomist Assigned';
    const canCancel = booking.status === 'Pending' || booking.status === 'Confirmed';

    return (
      <div
        key={booking.id}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {booking.bookingCode}
              {booking.isDemoBooking ? ' · Demo Preview' : ''}
            </p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">
              {booking.patientName} ({booking.patientAge} yrs · {booking.patientGender})
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              {booking.items.map((i) => i.name).join(', ')}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                booking.status === 'Cancelled'
                  ? 'text-rose-600 dark:text-rose-400'
                  : booking.status === 'Report Ready'
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-indigo-800 dark:text-indigo-300'
              }`}
            >
              {booking.status === 'Cancelled' ? (
                <XCircle className="w-4 h-4" />
              ) : booking.status === 'Report Ready' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              <span>{booking.status}</span>
            </span>
            <p className="mt-1 text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              ₹{booking.finalAmount}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {booking.paymentMethod} · {booking.paymentStatus}
            </p>
          </div>
        </div>

        {/* 7-Stage Status Progress */}
        {booking.status !== 'Cancelled' && (
          <div className="space-y-1.5">
            <div className="grid grid-cols-6 gap-1.5">
              {PROGRESS_STAGES.map((stage, idx) => (
                <div
                  key={stage}
                  className={`h-1.5 rounded-full ${
                    idx <= stageIdx ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                  title={stage}
                />
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Collection: {booking.collectionDate} · {booking.timeSlot} · Pincode {booking.pincode}
            </p>
          </div>
        )}

        {/* Reschedule Request Notice */}
        {booking.rescheduleRequestedDate && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
            Reschedule requested: {booking.rescheduleRequestedDate} ({booking.rescheduleRequestedSlot})
          </p>
        )}

        {/* Assigned Collection Agent */}
        {booking.assignedAgentName && (
          <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {t.assignedAgent}: {booking.assignedAgentName}
                </p>
                {booking.assignedAgentPhone && (
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300">
                    {booking.assignedAgentPhone}
                  </p>
                )}
              </div>
            </div>
            {booking.assignedAgentPhone && (
              <a
                href={`tel:${booking.assignedAgentPhone}`}
                className="min-h-[36px] px-3 rounded-lg bg-teal-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadBookingReceiptPdf(booking)}
            className="min-h-[38px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Receipt PDF</span>
          </button>

          {canModify && (
            <button
              type="button"
              onClick={() => {
                setRescheduleTarget(booking);
                setNewDate(booking.collectionDate);
                setNewSlot(booking.timeSlot);
              }}
              className="min-h-[38px] px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs font-medium text-indigo-800 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 inline-flex items-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>{t.reschedule}</span>
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelTarget(booking)}
              className="min-h-[38px] px-3 rounded-xl border border-rose-200 dark:border-rose-900 text-xs font-medium text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{t.cancelBooking}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {activeTab === 'reports' ? t.myReportsTitle : t.myBookingsTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Track home sample collections, reschedule appointments, and download authorized PDF reports.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 self-start">
          {(
            [
              { id: 'upcoming', label: `${t.upcomingTab} (${upcomingBookings.length})` },
              { id: 'history', label: `${t.historyTab} (${historyBookings.length})` },
              { id: 'reports', label: `${t.reportsTab} (${reports.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications Banner */}
      {actionMsg && (
        <div className="rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-900 px-4 py-3 text-xs font-medium text-teal-900 dark:text-teal-200 flex items-center justify-between">
          <span>{actionMsg}</span>
          <button type="button" onClick={() => setActionMsg(null)} className="underline ml-3">
            Dismiss
          </button>
        </div>
      )}

      {readyReportNotifications.length > 0 && activeTab !== 'reports' && (
        <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-indigo-800 dark:text-indigo-300 shrink-0" />
            <p className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-100 font-medium">
              {readyReportNotifications.length} diagnostic report(s) ready for secure PDF download.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="px-3 py-1.5 rounded-lg bg-indigo-900 text-white text-xs font-semibold whitespace-nowrap"
          >
            View Reports
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingBookings.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
              <p className="text-base font-bold text-slate-900 dark:text-white">{t.noBookingsTitle}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.noBookingsDesc}</p>
              <button
                type="button"
                onClick={onBookNew}
                className="min-h-[42px] px-5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold"
              >
                {t.bookHomeCollection}
              </button>
            </div>
          ) : (
            upcomingBookings.map(renderBookingCard)
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {historyBookings.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">No completed or cancelled bookings yet.</p>
            </div>
          ) : (
            historyBookings.map(renderBookingCard)
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{t.healthcareDisclaimer}</p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-base font-bold text-slate-900 dark:text-white">{t.noReportsTitle}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.noReportsDesc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-mono text-teal-700 dark:text-teal-400">
                      {report.bookingCode} · Authorized Account Access
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-white">
                      {report.reportTitle}
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      Patient: <strong>{report.patientName}</strong>
                    </p>
                    {report.testSummary && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{report.testSummary}</p>
                    )}
                    {report.remarks && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl">
                        {report.remarks}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadReport(report)}
                    className="w-full min-h-[44px] rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{t.downloadPdf}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => void handleRequestReschedule(e)}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Request Reschedule · {rescheduleTarget.bookingCode}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Collection Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Time Slot
              </label>
              <select
                value={newSlot}
                onChange={(e) => setNewSlot(e.target.value)}
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
              >
                {slots
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyId === rescheduleTarget.id}
                className="flex-1 min-h-[42px] rounded-xl bg-indigo-900 text-white text-xs font-semibold"
              >
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => void handleCancelBooking(e)}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Cancel Booking · {cancelTarget.bookingCode}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Let us know why you need to cancel this appointment.
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason (optional)"
              className="w-full min-h-[42px] px-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="flex-1 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Keep Booking
              </button>
              <button
                type="submit"
                disabled={busyId === cancelTarget.id}
                className="flex-1 min-h-[42px] rounded-xl bg-rose-600 text-white text-xs font-semibold"
              >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
