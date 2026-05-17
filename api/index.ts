import express from "express";
import fs from "fs/promises";
import path from "path";
import { put, list } from "@vercel/blob";

const SHIPMENTS_FILE = path.join(process.cwd(), 'shipments.json');

const sanitizeString = (value: any) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[<>]/g, '');
};

const isValidCoordinate = (value: any) => {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    (typeof value.name === 'string' || typeof value.name === 'undefined')
  );
};

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org ws: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
  );
  next();
});

app.use(express.json());

// Simple auth middleware
const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const password = req.headers['x-admin-password'];
  if (password === (process.env.ADMIN_PASSWORD || "admin123")) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized access detected." });
  }
};

// Auth endpoint
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === (process.env.ADMIN_PASSWORD || "admin123")) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Default data
const defaultShipments = [
  {
      id: "TRK-1001",
      customerName: "Hajnalka Göblyös",
      packageName: "Frost Blue Model 3 Performance With 10,000$ cash",
      origin: { lat: 34.0522, lng: -118.2437, name:  "San Francisco Office" }, // LA
      destination: { lat: 46.66036032272335, lng: 20.595707996270267, name: "5932 Gádoros, Darányi utca 39,Magyarország" }, // SF
      progress: 45,
      status: "In Transit",  
      timeline: [
        { status: "Order Processed", time: "2024-05-14 08:00 AM" },
        { status: "Shipped from Origin", time: "2024-05-14 10:30 AM" },
        { status: "In Transit", time: "2024-05-15 11:00 AM" },
      ],
    }
];

// In-memory fallback
let memoryShipments = [...defaultShipments];

// Helper to get shipments (from Blob if available, else memory)
async function getShipments() {
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { blobs } = await list({ prefix: 'shipments.json' });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url);
        const data = await response.json();
        if (Array.isArray(data)) {
          return data as any[];
        }
      }
    }
  } catch (error) {
    console.error("Blob get error:", error);
  }

  try {
    const file = await fs.readFile(SHIPMENTS_FILE, 'utf-8');
    const data = JSON.parse(file);
    if (Array.isArray(data)) {
      memoryShipments = data;
      return data;
    }
  } catch (error) {
    if ((error as any).code !== 'ENOENT') {
      console.error("Local shipment file read error:", error);
    }
  }

  return memoryShipments;
}

// Helper to save shipments
async function saveShipments(shipments: any[]) {
  memoryShipments = shipments;
  try {
    await fs.writeFile(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2), 'utf-8');
  } catch (error) {
    console.error("Local shipment file write error:", error);
  }

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await put('shipments.json', JSON.stringify(shipments), {
        access: 'public',
        addRandomSuffix: false
      });
    }
  } catch (error) {
    console.error("Blob set error:", error);
  }
}

// API Routes
app.get("/api/shipments", adminAuth, async (req, res) => {
  const shipments = await getShipments();
  res.json(shipments);
});

app.get("/api/track/:id", async (req, res) => {
  const shipments = await getShipments();
  const shipment = shipments.find((s: any) => s.id === req.params.id);
  if (shipment) {
    res.json(shipment);
  } else {
    res.status(404).json({ error: "Shipment not found" });
  }
});

app.post("/api/shipments", adminAuth, async (req, res) => {
  const { customerName, packageName, origin, destination } = req.body;

  if (
    !customerName ||
    !packageName ||
    !isValidCoordinate(origin) ||
    !isValidCoordinate(destination)
  ) {
    return res.status(400).json({ error: "Invalid shipment payload." });
  }

  const shipments = await getShipments();
  const newShipment = {
    id: `TRK-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: sanitizeString(customerName),
    packageName: sanitizeString(packageName),
    origin: {
      lat: origin.lat,
      lng: origin.lng,
      name: sanitizeString(origin.name),
    },
    destination: {
      lat: destination.lat,
      lng: destination.lng,
      name: sanitizeString(destination.name),
    },
    progress: 0,
    status: "Order Processed",
    timeline: [{ status: "Order Processed", time: new Date().toLocaleString() }],
  };
  shipments.push(newShipment);
  await saveShipments(shipments);
  res.json(newShipment);
});

app.patch("/api/track/:id", adminAuth, async (req, res) => {
  const shipments = await getShipments();
  const { progress, status } = req.body;
  const index = shipments.findIndex((s: any) => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Shipment not found" });
  }

  const cleanProgress = typeof progress === 'number'
    ? Math.min(100, Math.max(0, progress))
    : shipments[index].progress;

  const cleanStatus = typeof status === 'string' ? sanitizeString(status) : shipments[index].status;

  shipments[index] = { ...shipments[index], progress: cleanProgress, status: cleanStatus };
  if (typeof status === 'string') {
    shipments[index].timeline.push({ status: cleanStatus, time: new Date().toLocaleString() });
  }
  await saveShipments(shipments);
  // Note: Vercel Serverless Functions don't support Socket.io, so this won't broadcast.
  res.json(shipments[index]);
});

app.delete("/api/shipments/:id", adminAuth, async (req, res) => {
  const shipments = await getShipments();
  const filtered = shipments.filter((s: any) => s.id !== req.params.id);
  if (filtered.length === shipments.length) {
    return res.status(404).json({ error: "Shipment not found" });
  }
  await saveShipments(filtered);
  res.json({ success: true, id: req.params.id });
});

export default app;