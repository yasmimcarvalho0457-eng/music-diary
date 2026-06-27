import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDcx7sVpytVtSRErmrRMnTWGPO2_yroWwk",
  authDomain: "music-dairy-60ab1.firebaseapp.com",
  projectId: "music-dairy-60ab1",
  storageBucket: "music-dairy-60ab1.firebasestorage.app",
  messagingSenderId: "542855008498",
  appId: "1:542855008498:web:bf0ddb30524d6e1485006b",
  measurementId: "G-84JDW81F6J"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const defaultAvatar = "https://i.pinimg.com/736x/66/b6/e9/66b6e9bb02e7b3e0c807d7cceeea698e.jpg";
export const defaultBanner = "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=1400&auto=format&fit=crop";
