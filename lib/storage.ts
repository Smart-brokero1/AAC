import fs from "fs/promises";
import path from "path";
import admin from "firebase-admin";

const SHIPMENTS_FILE = path.join(process.cwd(), "shipments.json");
const FIRESTORE_COLLECTION = "fdx";
const FIRESTORE_DOC = "shipments";
const DEFAULT_FIREBASE_PROJECT_ID = "fdxx-13207";

const defaultShipments = [
  {
    id: "TRK-1001",
    customerName: "Hajnalka Göblyös",
    packageName: "Frost Blue Model 3 Performance With 10,000$ cash",
    origin: { lat: 34.0522, lng: -118.2437, name: "San Francisco Office" },
    destination: {
      lat: 46.66036032272335,
      lng: 20.595707096270267,
      name: "5932 Gádoros, Darányi utca 39,Magyarország",
    },
    progress: 45,
    status: "In Transit",
    timeline: [
      { status: "Order Processed", time: "2024-05-14 08:00 AM" },
      { status: "Shipped from Origin", time: "2024-05-14 10:30 AM" },
      { status: "In Transit", time: "2024-05-15 11:00 AM" },
    ],
  },
];

let memoryShipments = [...defaultShipments];
let firestore: FirebaseFirestore.Firestore | null = null;

function parseJsonEnvValue(envValue?: string) {
  if (!envValue) return null;
  const trimmed = envValue.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  try {
    const decoded = Buffer.from(trimmed, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getFirebaseCredentials() {
  const preferredProjectId = process.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
  const serviceAccount = parseJsonEnvValue(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccount) {
    return {
      ...serviceAccount,
      project_id: serviceAccount.project_id || preferredProjectId,
      projectId: serviceAccount.projectId || preferredProjectId,
    };
  }

  if (
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: preferredProjectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  return null;
}

function getFirestore() {
  if (firestore) {
    return firestore;
  }

  const credentials = getFirebaseCredentials();
  if (!credentials) {
    return null;
  }

  try {
    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert(credentials as admin.ServiceAccount),
        });
    firestore = admin.firestore(app);
    return firestore;
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return null;
  }
}

async function readLocalShipments() {
  try {
    const file = await fs.readFile(SHIPMENTS_FILE, "utf-8");
    const data = JSON.parse(file);
    if (Array.isArray(data)) {
      memoryShipments = data;
      return data;
    }
  } catch (error) {
    if ((error as any).code !== "ENOENT") {
      console.error("Local shipment file read error:", error);
    }
  }
  return null;
}

async function writeLocalShipments(shipments: any[]) {
  try {
    await fs.writeFile(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2), "utf-8");
  } catch (error) {
    console.error("Local shipment file write error:", error);
  }
}

async function readFirebaseShipments() {
  const db = getFirestore();
  if (!db) {
    return null;
  }

  try {
    const doc = await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    if (data && Array.isArray((data as any).shipments)) {
      const shipments = (data as any).shipments as any[];
      memoryShipments = shipments;
      return shipments;
    }
  } catch (error) {
    console.error("Firebase read error:", error);
  }
  return null;
}

async function writeFirebaseShipments(shipments: any[]) {
  const db = getFirestore();
  if (!db) {
    return;
  }

  try {
    await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).set({
      shipments,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Firebase write error:", error);
  }
}

export async function getShipments() {
  const firebaseShipments = await readFirebaseShipments();
  if (firebaseShipments) {
    return firebaseShipments;
  }

  const localShipments = await readLocalShipments();
  if (localShipments) {
    await writeFirebaseShipments(localShipments);
    return localShipments;
  }

  return memoryShipments;
}

export async function saveShipments(shipments: any[]) {
  memoryShipments = shipments;
  await writeLocalShipments(shipments);
  await writeFirebaseShipments(shipments);
}

export async function checkFirebaseConnection() {
  const db = getFirestore();
  if (!db) {
    return false;
  }

  try {
    await db.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC).get();
    return true;
  } catch (error) {
    console.error("Firebase health check error:", error);
    return false;
  }
}
