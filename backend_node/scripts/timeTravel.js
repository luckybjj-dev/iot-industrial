const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database');
const dotenv = require('dotenv');

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDummyKey",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://fungi-industrial-default-rtdb.firebaseio.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "fungi-industrial",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "fungi-industrial.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
    appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const DEVICE_ID = process.argv[2] || 'node_1';
const DAYS_TO_SUBTRACT = parseFloat(process.argv[3]) || 13.9;

async function runTimeTravel() {
    console.log(`[TIME TRAVEL] Iniciando viaje en el tiempo para: ${DEVICE_ID}`);
    console.log(`[TIME TRAVEL] Restando ${DAYS_TO_SUBTRACT} días a la fecha de inicio del plan...`);

    const planRef = ref(db, `devices/${DEVICE_ID}/plan_state`);
    const snapshot = await get(planRef);

    if (!snapshot.exists()) {
        console.error('❌ No hay un plan activo en la base de datos para este dispositivo.');
        process.exit(1);
    }

    const plan = snapshot.val();
    
    if (!plan.phaseStartTime) {
        console.error('❌ El plan activo no tiene phaseStartTime.');
        process.exit(1);
    }

    const currentStart = plan.phaseStartTime;
    const msToSubtract = DAYS_TO_SUBTRACT * 24 * 60 * 60 * 1000;
    const newStart = currentStart - msToSubtract;

    await update(planRef, {
        phaseStartTime: newStart
    });

    console.log(`✅ Viaje exitoso. phaseStartTime cambiado.`);
    console.log(`   - Anterior: ${new Date(currentStart).toLocaleString()}`);
    console.log(`   - Nuevo:    ${new Date(newStart).toLocaleString()}`);
    console.log(`   - Si abres el dashboard, verás que el tiempo restante ha disminuido drásticamente.`);
    process.exit(0);
}

runTimeTravel().catch(e => {
    console.error(e);
    process.exit(1);
});
