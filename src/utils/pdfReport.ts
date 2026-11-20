import { jsPDF } from 'jspdf';
import { Booking, DiagnosticReport } from '../types';

export function downloadDiagnosticReportPdf(report: DiagnosticReport): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(49, 46, 129); // Deep Indigo
  doc.rect(0, 0, pageWidth, 88, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Testo Home', 40, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Home Blood Sample Collection & Diagnostic Report Portal', 40, 62);

  // Report Meta
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(report.reportTitle, 40, 128);

  doc.setDrawColor(226, 232, 240);
  doc.line(40, 142, pageWidth - 40, 142);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Patient Name: ${report.patientName}`, 40, 168);
  doc.text(`Booking Reference: ${report.bookingCode}`, 40, 188);
  doc.text(`Document File: ${report.fileName}`, 40, 208);

  const issuedDate =
    report.issuedAt && typeof (report.issuedAt as { toDate?: () => Date }).toDate === 'function'
      ? (report.issuedAt as { toDate: () => Date }).toDate().toLocaleString()
      : new Date().toLocaleString();
  doc.text(`Issued On: ${issuedDate}`, 320, 168);

  // Summary box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(40, 234, pageWidth - 80, 140, 8, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Diagnostic Panel Summary', 56, 260);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const summaryLines = doc.splitTextToSize(
    report.testSummary || 'Complete diagnostic blood panel processed per booking instructions.',
    pageWidth - 112
  );
  doc.text(summaryLines, 56, 282);

  doc.setFont('helvetica', 'bold');
  doc.text('Laboratory Remarks', 56, 330);
  doc.setFont('helvetica', 'normal');
  const remarkLines = doc.splitTextToSize(
    report.remarks || 'Released to authorized patient account. Please share this PDF with your consulting physician.',
    pageWidth - 112
  );
  doc.text(remarkLines, 56, 348);

  // Healthcare disclaimer
  doc.setFillColor(240, 253, 250);
  doc.roundedRect(40, 400, pageWidth - 80, 74, 8, 8, 'F');
  doc.setTextColor(15, 118, 110);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Medical Review Notice', 56, 422);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const disclaimer = doc.splitTextToSize(
    'Testo Home does not provide medical diagnoses. Laboratory values must be correlated clinically by a qualified healthcare professional.',
    pageWidth - 112
  );
  doc.text(disclaimer, 56, 440);

  doc.save(report.fileName.endsWith('.pdf') ? report.fileName : `${report.fileName}.pdf`);
}

export function downloadBookingReceiptPdf(booking: Booking): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(49, 46, 129);
  doc.rect(0, 0, pageWidth, 82, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Testo Home — Booking Summary', 40, 48);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Booking ID: ${booking.bookingCode}`, 40, 120);
  doc.text(`Status: ${booking.status}`, 340, 120);
  doc.text(`Patient: ${booking.patientName} (${booking.patientAge} yrs, ${booking.patientGender})`, 40, 142);
  doc.text(`Mobile: ${booking.patientMobile}`, 40, 162);
  doc.text(`Collection Address: ${booking.addressLine}, ${booking.pincode}`, 40, 182);
  doc.text(`Scheduled Slot: ${booking.collectionDate} · ${booking.timeSlot}`, 40, 202);
  doc.text(`Payment Method: ${booking.paymentMethod} (${booking.paymentStatus})`, 40, 222);

  let y = 262;
  doc.setFont('helvetica', 'bold');
  doc.text('Booked Tests & Packages', 40, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  booking.items.forEach((item, idx) => {
    doc.text(`${idx + 1}. ${item.name}`, 48, y);
    doc.text(`INR ${item.price}`, pageWidth - 100, y);
    y += 18;
  });

  y += 12;
  doc.setDrawColor(226, 232, 240);
  doc.line(40, y, pageWidth - 40, y);
  y += 22;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Payable: INR ${booking.finalAmount}`, 40, y);

  doc.save(`${booking.bookingCode}-receipt.pdf`);
}
