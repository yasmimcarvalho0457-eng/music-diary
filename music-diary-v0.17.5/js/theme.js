import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

let themeListenerStarted = false;

export function applyTheme(theme = "sakura") {
  const finalTheme = theme || "sakura";
  if (document.body.dataset.theme === finalTheme) return;

  document.body.dataset.theme = finalTheme;
  localStorage.setItem("musicDiaryTheme", finalTheme);
}

export function applySavedTheme() {
  const savedTheme = localStorage.getItem("musicDiaryTheme") || "sakura";
  applyTheme(savedTheme);
}

export function applyUserTheme() {
  applySavedTheme();

  if (themeListenerStarted) return;
  themeListenerStarted = true;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const profile = snap.data();
      applyTheme(profile.theme || "sakura");
    }
  });
}
