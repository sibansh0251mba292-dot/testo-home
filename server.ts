import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase projectId from firebase-applet-config.json for verifyIdToken (no IAM required)
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || '';
const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (raw.projectId && raw.projectId !== 'remixed-project-id') {
      firebaseProjectId = raw.projectId;
    }
  } catch {
    // Ignore malformed config read
  }
}

if (firebaseProjectId) {
  const adminApp = getApps().length ? getApp() : initializeApp({ projectId: firebaseProjectId });
  void adminApp;
}

interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
}

async function requireFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!firebaseProjectId) {
    res.status(503).json({ error: 'Firebase project is not configured.' });
    return;
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.email_verified) {
      res.status(403).json({ error: 'Verified email is required.' });
      return;
    }
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '1mb' }));

  // Health & Gateway configuration status
  app.get('/api/health', (_req: Request, res: Response) => {
    const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
    res.json({
      status: 'ok',
      service: 'testo-home',
      paymentGatewayConfigured: razorpayConfigured,
    });
  });

  // Server-side booking data validation & unique booking code generation
  app.post('/api/bookings/validate', requireFirebaseAuth, (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as {
      items?: Array<{ id?: string; name?: string; price?: number; type?: string }>;
      patientName?: string;
      patientAge?: number;
      patientGender?: string;
      patientMobile?: string;
      addressLine?: string;
      pincode?: string;
      collectionDate?: string;
      timeSlot?: string;
      paymentMethod?: string;
      consentAccepted?: boolean;
      discountPercent?: number;
      maxDiscount?: number;
    };

    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
      res.status(400).json({ error: 'Please select between 1 and 20 tests or packages.' });
      return;
    }
    if (!body.patientName || body.patientName.trim().length < 2 || body.patientName.length > 120) {
      res.status(400).json({ error: 'Valid patient name is required.' });
      return;
    }
    if (typeof body.patientAge !== 'number' || body.patientAge < 0 || body.patientAge > 120) {
      res.status(400).json({ error: 'Valid patient age (0-120) is required.' });
      return;
    }
    if (!['Male', 'Female', 'Other'].includes(body.patientGender || '')) {
      res.status(400).json({ error: 'Valid patient gender is required.' });
      return;
    }
    if (!body.patientMobile || !/^[0-9+\-\s]{10,15}$/.test(body.patientMobile.trim())) {
      res.status(400).json({ error: 'Valid 10-15 digit mobile number is required.' });
      return;
    }
    if (!body.addressLine || body.addressLine.trim().length < 5 || body.addressLine.length > 240) {
      res.status(400).json({ error: 'Complete collection address is required.' });
      return;
    }
    if (!body.pincode || !/^[0-9]{6}$/.test(body.pincode.trim())) {
      res.status(400).json({ error: 'Valid 6-digit pincode is required.' });
      return;
    }
    if (!body.collectionDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(body.collectionDate)) {
      res.status(400).json({ error: 'Valid collection date is required.' });
      return;
    }
    if (!body.timeSlot || body.timeSlot.trim().length < 3) {
      res.status(400).json({ error: 'Please select a collection time slot.' });
      return;
    }
    if (!['UPI', 'Cash on Collection', 'Online Payment'].includes(body.paymentMethod || '')) {
      res.status(400).json({ error: 'Invalid payment method.' });
      return;
    }
    if (body.consentAccepted !== true) {
      res.status(400).json({ error: 'Patient privacy and sample collection consent is required.' });
      return;
    }

    const totalAmount = body.items.reduce((sum, item) => {
      const p = typeof item.price === 'number' && item.price >= 0 ? item.price : 0;
      return sum + p;
    }, 0);

    const discountPct = typeof body.discountPercent === 'number' && body.discountPercent > 0 && body.discountPercent <= 90 ? body.discountPercent : 0;
    const maxDisc = typeof body.maxDiscount === 'number' && body.maxDiscount >= 0 ? body.maxDiscount : totalAmount;
    const rawDiscount = Math.round((totalAmount * discountPct) / 100);
    const discountAmount = Math.min(rawDiscount, maxDisc, totalAmount);
    const finalAmount = Math.max(0, totalAmount - discountAmount);

    const year = new Date().getFullYear();
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingCode = `TH-${year}-${randomSuffix}`;

    res.json({
      valid: true,
      bookingCode,
      totalAmount,
      discountAmount,
      finalAmount,
      uid: req.user?.uid,
    });
  });

  // Server-side Razorpay Order creation
  app.post('/api/payments/create-order', requireFirebaseAuth, async (req: AuthenticatedRequest, res: Response) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      res.status(200).json({
        configured: false,
        message: 'Razorpay merchant keys are not configured yet. Use Cash on Collection or UPI reference submission until payment keys are added.',
      });
      return;
    }

    const { amount, bookingCode } = req.body as { amount?: number; bookingCode?: string };
    if (typeof amount !== 'number' || amount <= 0 || !bookingCode) {
      res.status(400).json({ error: 'Valid positive amount and bookingCode are required.' });
      return;
    }

    try {
      const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: bookingCode,
          notes: {
            uid: req.user?.uid || '',
            bookingCode,
          },
        }),
      });

      if (!rzpResponse.ok) {
        const errBody = await rzpResponse.text();
        res.status(502).json({ error: 'Failed to create Razorpay order.', details: errBody });
        return;
      }

      const order = await rzpResponse.json();
      res.json({ configured: true, order, keyId });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Payment order error' });
    }
  });

  // Server-side Razorpay HMAC-SHA256 signature verification
  app.post('/api/payments/verify', requireFirebaseAuth, (req: AuthenticatedRequest, res: Response) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      res.status(503).json({
        verified: false,
        error: 'Payment verification secret is not configured on the server.',
      });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ verified: false, error: 'Missing Razorpay payment verification fields.' });
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(razorpay_signature, 'utf8');

    const isMatch = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);
    if (!isMatch) {
      res.status(400).json({ verified: false, error: 'Payment signature mismatch. Verification rejected.' });
      return;
    }

    res.json({
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      verifiedAt: new Date().toISOString(),
    });
  });

  // Vite dev middleware or static dist serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Testo Home server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Testo Home server:', err);
  process.exit(1);
});
