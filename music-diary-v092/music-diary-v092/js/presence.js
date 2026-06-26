import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

let presenceStarted = false;
let heartbeatInterval = null;
let currentUid = null;

async function updatePresence(isOnline) {
  if (!currentUid) return;

  await setDoc(doc(db, "users", currentUid), {
    online: isOnline,
    lastSeen: serverTimestamp()
  }, { merge: true });
}

async function markOnline() {
  await updatePresence(true);
}

async function markOffline() {
  try {
    await updatePresence(false);
  } catch (error) {
    // Ao fechar aba/celular, o navegador pode bloquear a escrita.
    // O lastSeen continua sendo usado para detectar offline.
  }
}

export function startPresence() {
  if (presenceStarted) return;
  presenceStarted = true;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    currentUid = user.uid;
    await markOnline();

    clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(markOnline, 20000);

    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) {
        await markOffline();
      } else {
        await markOnline();
      }
    });

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);
  });
}

startPresence();
