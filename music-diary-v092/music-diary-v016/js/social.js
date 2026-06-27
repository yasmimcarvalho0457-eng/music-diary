import { auth, db, defaultAvatar } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { escapeHTML, avatarHTML } from "./utils.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const followersList = document.querySelector("#followersList");
const followingList = document.querySelector("#followingList");

async function userCard(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return "";

  const user = snap.data();

  return `
    <a class="user-result-card" href="user.html?uid=${uid}">
      ${avatarHTML(user.photo || defaultAvatar, user.photoZoom || 1, user.photoX || 0, user.photoY || 0, "small")}
      <div>
        <strong>@${escapeHTML(user.username || "usuaria")}</strong>
        <p>${escapeHTML(user.bio || "Sem bio ainda.")}</p>
      </div>
    </a>
  `;
}

async function loadSocial(user) {
  followersList.innerHTML = `<div class="loading-card">Carregando...</div>`;
  followingList.innerHTML = `<div class="loading-card">Carregando...</div>`;

  const followersSnap = await getDocs(collection(db, "users", user.uid, "followers"));
  const followingSnap = await getDocs(collection(db, "users", user.uid, "following"));

  if (followersSnap.empty) {
    followersList.innerHTML = `<div class="empty-card">Ninguém segue você ainda.</div>`;
  } else {
    followersList.innerHTML = "";
    for (const item of followersSnap.docs) {
      const data = item.data();
      followersList.innerHTML += await userCard(data.followerUid || item.id);
    }
  }

  if (followingSnap.empty) {
    followingList.innerHTML = `<div class="empty-card">Você ainda não segue ninguém.</div>`;
  } else {
    followingList.innerHTML = "";
    for (const item of followingSnap.docs) {
      const data = item.data();
      followingList.innerHTML += await userCard(data.targetUid || item.id);
    }
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  await loadSocial(user);
});
