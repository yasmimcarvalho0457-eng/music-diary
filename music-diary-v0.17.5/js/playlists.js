import { auth, db, defaultAvatar } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { showToast, firebaseErrorMessage, escapeHTML } from "./utils.js";
import { isLikelyImageUrl, imageUrlErrorMessage } from "./image-utils.js";
import { uploadImageFile, bindDropZone } from "./upload.js";
import { musicPlayerHTML } from "./music.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const playlistForm = document.querySelector("#playlistForm");
const songForm = document.querySelector("#songForm");
const playlistsList = document.querySelector("#playlistsList");
const playlistSelect = document.querySelector("#playlistSelect");
const playlistCoverFileInput = document.querySelector("#playlistCoverFileInput");
const uploadPlaylistCoverBtn = document.querySelector("#uploadPlaylistCoverBtn");
const playlistCoverUploadBox = document.querySelector(".playlist-cover-upload-box");

let currentUser = null;
let playlists = [];


async function createPlaylistFollowersNotifications(playlistTitle) {
  const followersSnap = await getDocs(collection(db, "users", currentUser.uid, "followers"));
  const username = currentUser.email.split("@")[0];

  for (const followerDoc of followersSnap.docs) {
    const follower = followerDoc.data();
    const targetUid = follower.followerUid || followerDoc.id;

    await addDoc(collection(db, "users", targetUid, "notifications"), {
      type: "playlist",
      title: "Nova playlist",
      message: `@${username} criou a playlist "${playlistTitle}".`,
      fromUid: currentUser.uid,
      fromUsername: username,
      fromPhoto: defaultAvatar,
      read: false,
      createdAt: serverTimestamp()
    });
  }
}



bindDropZone(playlistCoverUploadBox, playlistCoverFileInput, () => {
  showToast("Capa selecionada. Clique em enviar capa do computador.");
});

uploadPlaylistCoverBtn?.addEventListener("click", async () => {
  try {
    const file = playlistCoverFileInput?.files?.[0];

    if (!file) {
      showToast("Escolha uma capa primeiro.", "error");
      return;
    }

    uploadPlaylistCoverBtn.disabled = true;
    uploadPlaylistCoverBtn.textContent = "Enviando...";

    const url = await uploadImageFile(file, "playlist-covers");
    playlistForm.cover.value = url;

    showToast("Capa enviada ✨");
  } catch (error) {
    showToast(error.message || "Erro ao enviar capa.", "error");
  } finally {
    uploadPlaylistCoverBtn.disabled = false;
    uploadPlaylistCoverBtn.textContent = "Enviar capa do computador";
  }
});


playlistForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = playlistForm.title.value.trim();
  const description = playlistForm.description.value.trim();
  const cover = playlistForm.cover.value.trim();

  if (cover && !isLikelyImageUrl(cover)) {
    showToast(imageUrlErrorMessage(), "error");
    return;
  }

  if (!title) {
    showToast("Dê um nome para a playlist.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "users", currentUser.uid, "playlists"), {
      title,
      description,
      cover,
      createdAt: serverTimestamp()
    });

    await createPlaylistFollowersNotifications(title);

    playlistForm.reset();
    showToast("Playlist criada 💿");
    await loadPlaylists();
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
});

songForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const playlistId = songForm.playlist.value;
  const title = songForm.musicTitle.value.trim();
  const artist = songForm.musicArtist.value.trim();
  const url = songForm.musicUrl.value.trim();

  if (!playlistId || !title || !url) {
    showToast("Escolha a playlist e preencha título/link.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "users", currentUser.uid, "playlists", playlistId, "songs"), {
      musicTitle: title,
      musicArtist: artist,
      musicUrl: url,
      createdAt: serverTimestamp()
    });

    songForm.reset();
    showToast("Música adicionada 🎵");
    await loadPlaylists();
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
});

async function loadPlaylists() {
  playlistsList.innerHTML = `<div class="loading-card">Carregando playlists...</div>`;
  playlistSelect.innerHTML = `<option value="">Escolha uma playlist</option>`;

  const q = query(collection(db, "users", currentUser.uid, "playlists"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  playlists = snap.docs.map((item) => ({
    id: item.id,
    ...item.data()
  }));

  if (!playlists.length) {
    playlistsList.innerHTML = `<div class="empty-card">Você ainda não criou playlists.</div>`;
    return;
  }

  playlistsList.innerHTML = "";

  for (const playlist of playlists) {
    const option = document.createElement("option");
    option.value = playlist.id;
    option.textContent = playlist.title;
    playlistSelect.appendChild(option);

    const songsSnap = await getDocs(query(
      collection(db, "users", currentUser.uid, "playlists", playlist.id, "songs"),
      orderBy("createdAt", "asc")
    ));

    const songsHTML = songsSnap.empty
      ? `<p class="muted">Nenhuma música ainda.</p>`
      : Array.from(songsSnap.docs).map((songDoc) => {
          const song = songDoc.data();
          return `
            <div class="playlist-song">
              ${musicPlayerHTML(song)}
              <button class="delete-song-btn" data-playlist="${playlist.id}" data-song="${songDoc.id}">Excluir música</button>
            </div>
          `;
        }).join("");

    const card = document.createElement("article");
    card.className = "playlist-card";

    card.innerHTML = `
      ${playlist.cover ? `<img loading="lazy" class="playlist-cover" src="${playlist.cover}" alt="Capa da playlist">` : `<div class="playlist-cover placeholder">💿</div>`}
      <div class="playlist-body">
        <h2>${escapeHTML(playlist.title)}</h2>
        <p>${escapeHTML(playlist.description || "Sem descrição.")}</p>
        <div class="playlist-actions">
          <button class="delete-playlist-btn" data-id="${playlist.id}">Excluir playlist</button>
        </div>
        <div class="songs-box">${songsHTML}</div>
      </div>
    `;

    playlistsList.appendChild(card);
  }

  document.querySelectorAll(".delete-playlist-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", currentUser.uid, "playlists", button.dataset.id));
      showToast("Playlist excluída.");
      await loadPlaylists();
    });
  });

  document.querySelectorAll(".delete-song-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteDoc(doc(db, "users", currentUser.uid, "playlists", button.dataset.playlist, "songs", button.dataset.song));
      showToast("Música excluída.");
      await loadPlaylists();
    });
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadPlaylists();
});
