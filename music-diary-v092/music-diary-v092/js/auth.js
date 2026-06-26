import { auth, db, defaultAvatar, defaultBanner } from "./firebase.js";
import { showToast, firebaseErrorMessage } from "./utils.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const loginForm = document.querySelector("#loginForm");
const signupForm = document.querySelector("#signupForm");
const logoutBtn = document.querySelector("#logoutBtn");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, loginForm.email.value.trim(), loginForm.password.value);
      showToast("Bem-vinda de volta ✨");
      setTimeout(() => window.location.href = "feed.html", 500);
    } catch (error) {
      showToast(firebaseErrorMessage(error), "error");
    }
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = signupForm.email.value.trim();
    const password = signupForm.password.value;
    const username = signupForm.username.value.trim().replaceAll(" ", "").toLowerCase();

    if (!username) {
      showToast("Escolha um nome de usuário.", "error");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        username,
        displayName: username,
        bio: "Nova no Music Diary ✨",
        photo: defaultAvatar,
        banner: defaultBanner,
        photoZoom: 1,
        photoX: 0,
        photoY: 0,
        theme: "sakura",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      showToast("Conta criada 💖");
      setTimeout(() => window.location.href = "feed.html", 600);
    } catch (error) {
      showToast(firebaseErrorMessage(error), "error");
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

export function protectPage() {
  onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
  });
}

export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = "feed.html";
  });
}
