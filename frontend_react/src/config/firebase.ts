import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Tu configuración de Firebase, usando variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Realtime Database y obtener una referencia al servicio
export const database = getDatabase(app);
