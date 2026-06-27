import { db, defaultAvatar } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applySavedTheme } from "./theme.js";
import { escapeHTML, avatarHTML } from "./utils.js";
import { musicPlayerHTML } from "./music.js";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applySavedTheme();

const ownerBox = document.querySelector("#playlistOwner");
const playlistsBox = document.querySelector("#publicPlaylists");

function getUidFromURL() {
  return new URLSearchParams(window.location.search).get("uid");
}

async function loadPublicPlaylists() {
  const uid = getUidFromURL();

  if (!uid) {
    ownerBox.innerHTML = "<p>Usuário não encontrado.</p>";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", uid));

  if (!userSnap.exists()) {
    ownerBox.innerHTML = "<p>Esse usuário não existe.</p>";
    return;
  }

  const user = userSnap.data();

  if (user.theme) document.body.dataset.theme = user.theme;

  ownerBox.innerHTML = `
    <div class="public-playlist-owner">
      ${avatarHTML(user.photo || defaultAvatar, user.photoZoom || 1, user.photoX || 0, user.photoY || 0, "medium")}
      <div>
        <h2>@${escapeHTML(user.username || "usuaria")}</h2>
        <p>${escapeHTML(user.customStatus || user.bio || "Playlists do Music Diary")}</p>
      </div>
    </div>
  `;

  const playlistsSnap = await getDocs(query(
    collection(db, "users", uid, "playlists"),
    orderBy("createdAt", "desc")
  ));

  if (playlistsSnap.empty) {
    playlistsBox.innerHTML = `<div class="empty-card">Esse perfil ainda não criou playlists.</div>`;
    return;
  }

  playlistsBox.innerHTML = "";

  for (const playlistDoc of playlistsSnap.docs) {
    const playlist = playlistDoc.data();

    const songsSnap = await getDocs(query(
      collection(db, "users", uid, "playlists", playlistDoc.id, "songs"),
      orderBy("createdAt", "asc")
    ));

    const songsHTML = songsSnap.empty
      ? `<p class="muted">Nenhuma música ainda.</p>`
      : songsSnap.docs.map((songDoc) => musicPlayerHTML(songDoc.data())).join("");

    const card = document.createElement("article");
    card.className = "playlist-card";

    card.innerHTML = `
      ${playlist.cover ? `<img loading="lazy" class="playlist-cover" src="${playlist.cover}" alt="Capa da playlist">` : `<div class="playlist-cover placeholder">💿</div>`}
      <div class="playlist-body">
        <h2>${escapeHTML(playlist.title)}</h2>
        <p>${escapeHTML(playlist.description || "Sem descrição.")}</p>
        <button class="copy-link-btn" data-url="${location.href}">Copiar link</button>
        <div class="songs-box">${songsHTML}</div>
      </div>
    `;

    playlistsBox.appendChild(card);
  }

  document.querySelectorAll(".copy-link-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.url);
      button.textContent = "Link copiado!";
      setTimeout(() => button.textContent = "Copiar link", 1500);
    });
  });
}

loadPublicPlaylists();
