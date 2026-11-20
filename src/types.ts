export type Language = 'en' | 'hi';

export type CustomerScreen = 'home' | 'catalogue' | 'bookings' | 'profile';

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Phlebotomist Assigned'
  | 'Sample Collected'
  | 'Processing'
  | 'Report Ready'
  | 'Cancelled';

export type PaymentMethod = 'UPI' | 'Cash on Collection' | 'Online Payment';
export type PaymentStatus = 'pending' | 'awaiting_verification' | 'paid' | 'failed';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phone?: string;
  preferredLanguage?: Language;
  createdAt?: unknown;
  lastLoginAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  landmark?: string;
  pincode: string;
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PatientProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  relation: string;
  mobile: string;
  bloodGroup?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DiagnosticTest {
  id: string;
  name: string;
  nameHi?: string;
  category: string;
  shortDescription: string;
  shortDescriptionHi?: string;
  price: number;
  discountedPrice: number;
  isDemoPrice: boolean;
  preparation: string;
  preparationHi?: string;
  fastingRequired: boolean;
  fastingHours?: number;
  reportDeliveryHours: number;
  sampleType?: string;
  isPopular?: boolean;
  active: boolean;
  updatedAt?: unknown;
}

export interface HealthPackage {
  id: string;
  name: string;
  nameHi?: string;
  tagline?: string;
  description: string;
  descriptionHi?: string;
  includedTests: string[];
  testCount: number;
  price: number;
  discountedPrice: number;
  isDemoPrice: boolean;
  fastingRequired: boolean;
  fastingHours?: number;
  reportDeliveryHours: number;
  isRecommended?: boolean;
  active: boolean;
  updatedAt?: unknown;
}

export interface CartItem {
  id: string;
  type: 'test' | 'package';
  name: string;
  price: number;
  originalPrice: number;
  fastingRequired: boolean;
  fastingHours?: number;
  reportDeliveryHours: number;
}

export interface BookingItem {
  id: string;
  type: 'test' | 'package';
  name: string;
  price: number;
}

export interface Booking {
  id: string;
  bookingCode: string;
  userId: string;
  items: BookingItem[];
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  offerCode?: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientMobile: string;
  addressLine: string;
  landmark?: string;
  pincode: string;
  collectionDate: string;
  timeSlot: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: BookingStatus;
  assignedAgentId?: string;
  assignedAgentName?: string;
  assignedAgentPhone?: string;
  rescheduleRequestedDate?: string;
  rescheduleRequestedSlot?: string;
  cancellationReason?: string;
  consentAccepted: boolean;
  isDemoBooking?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DiagnosticReport {
  id: string;
  userId: string;
  bookingId: string;
  bookingCode: string;
  patientName: string;
  reportTitle: string;
  testSummary?: string;
  storagePath?: string;
  downloadUrl?: string;
  fileName: string;
  remarks?: string;
  notified?: boolean;
  issuedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Phlebotomist {
  id: string;
  name: string;
  phone: string;
  certificationCode: string;
  zonePincodes: string[];
  active: boolean;
  updatedAt?: unknown;
}

export interface ServiceablePincode {
  pincode: string;
  city: string;
  area: string;
  serviceFee: number;
  active: boolean;
  updatedAt?: unknown;
}

export interface CollectionSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  maxBookings: number;
  active: boolean;
  updatedAt?: unknown;
}

export interface Offer {
  id: string;
  title: string;
  titleHi?: string;
  code: string;
  discountPercent: number;
  maxDiscount: number;
  description: string;
  active: boolean;
  updatedAt?: unknown;
}

export interface OperationalConfig {
  liveBookingsEnabled: boolean;
  labConfigured: boolean;
  staffConfigured: boolean;
  pricingConfigured: boolean;
  locationsConfigured: boolean;
  supportPhone?: string;
  supportWhatsApp?: string;
  supportEmail?: string;
  updatedAt?: unknown;
}
