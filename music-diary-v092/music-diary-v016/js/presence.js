import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

let presenceStarted = false;
let heartbeatInterval = null;
let currentUid = null;

async function updatePresence(isOnline) {
  if (!currentUid) return;

  await setDoc(doc(db, "presence", currentUid), {
    uid: currentUid,
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
    // Alguns navegadores bloqueiam escrita ao fechar aba.
    // O lastSeen separa quem está inativo.
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
    heartbeatInterval = setInterval(markOnline, 45000);

    document.addEventListener("visibilitychange", async () => {
      if (document.hidden) await markOffline();
      else await markOnline();
    });

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);
  });
}

startPresence();
