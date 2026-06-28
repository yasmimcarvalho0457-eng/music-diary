import { db, defaultAvatar } from "./firebase.js";
import { escapeHTML, avatarHTML } from "./utils.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const searchInput = document.querySelector("#searchInput");
const results = document.querySelector("#results");

let allUsers = [];

async function loadUsers() {
  results.innerHTML = `<div class="loading-card">Carregando usuários...</div>`;

  const q = query(collection(db, "users"), orderBy("username"), limit(80));
  const snap = await getDocs(q);

  allUsers = snap.docs.map((docSnap) => ({
    uid: docSnap.id,
    ...docSnap.data()
  }));

  renderUsers(allUsers);
}

function renderUsers(users) {
  if (!users.length) {
    results.innerHTML = `<div class="empty-card">Nenhum usuário encontrado.</div>`;
    return;
  }

  results.innerHTML = "";

  users.forEach((user) => {
    const card = document.createElement("a");
    card.className = "user-result-card";
    card.href = `user.html?uid=${user.uid}`;

    card.innerHTML = `
      ${avatarHTML(user.photo || defaultAvatar, user.photoZoom || 1, user.photoX || 0, user.photoY || 0, "small")}
      <div>
        <strong>@${escapeHTML(user.username || "usuaria")}</strong>
        <p>${escapeHTML(user.bio || "Sem bio ainda.")}</p>
      </div>
    `;

    results.appendChild(card);
  });
}

searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase().replace("@", "");

  if (!term) {
    renderUsers(allUsers);
    return;
  }

  const filtered = allUsers.filter((user) =>
    String(user.username || "").toLowerCase().includes(term)
  );

  renderUsers(filtered);
});

loadUsers();
