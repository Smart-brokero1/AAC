import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { getShipments, saveShipments, checkFirebaseConnection } from "./lib/storage";

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

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    const isDev = process.env.NODE_ENV !== "production";
    res.setHeader(
      'Content-Security-Policy',
      isDev
        ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org ws: wss: localhost:*; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://nominatim.openstreetmap.org; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
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

  app.get("/api/health", async (req, res) => {
    const firebaseActive = await checkFirebaseConnection();
    res.json({
      status: "ok",
      firebase: firebaseActive,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || "fdxx-13207",
    });
  });

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
    // Broadcast update via Socket.io
    io.emit(`shipment_update:${req.params.id}`, shipments[index]);
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
