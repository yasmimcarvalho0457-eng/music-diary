import { auth, db, defaultAvatar } from "./firebase.js";
import { showToast, escapeHTML, avatarHTML, firebaseErrorMessage } from "./utils.js";
import { protectPage } from "./auth.js";
import { applyTheme, applySavedTheme } from "./theme.js";
import { musicPlayerHTML } from "./music.js";
import { normalizeBannerProfile, renderProfileBanner } from "./banner.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applySavedTheme();

const publicProfile = document.querySelector("#publicProfile");
const userPosts = document.querySelector("#userPosts");

let currentUser = null;
let viewedUserId = null;
let viewedProfile = null;

function safeProfile(data = {}) {
  return {
    ...data,
    username: data.username || "usuaria",
    email: data.email || "",
    bio: data.bio || "Sem bio ainda.",
    photo: data.photo || defaultAvatar,
    photoZoom: Number(data.photoZoom || 1),
    photoX: Number(data.photoX || 0),
    photoY: Number(data.photoY || 0),
    ...normalizeBannerProfile(data),
    theme: data.theme || "sakura",
    musicTitle: data.musicTitle || "",
    musicArtist: data.musicArtist || "",
    musicUrl: data.musicUrl || "",
    customStatus: data.customStatus || "\u2728 online no Music Diary"
  };
}

function getUserIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
}

async function isFollowing(targetUid) {
  const ref = doc(db, "users", currentUser.uid, "following", targetUid);
  const snap = await getDoc(ref);
  return snap.exists();
}

async function getFollowersCount(targetUid) {
  const snap = await getDocs(collection(db, "users", targetUid, "followers"));
  return snap.size;
}

async function getFollowingCount(targetUid) {
  const snap = await getDocs(collection(db, "users", targetUid, "following"));
  return snap.size;
}

async function renderPublicProfile() {
  if (!viewedUserId) {
    publicProfile.innerHTML = "<p>Usuario nao encontrado.</p>";
    return;
  }

  const snap = await getDoc(doc(db, "users", viewedUserId));

  if (!snap.exists()) {
    publicProfile.innerHTML = "<p>Esse perfil nao existe.</p>";
    return;
  }

  viewedProfile = safeProfile(snap.data());
  applyTheme(viewedProfile.theme || "sakura");

  const following = currentUser.uid === viewedUserId ? false : await isFollowing(viewedUserId);
  const followersCount = await getFollowersCount(viewedUserId);
  const followingCount = await getFollowingCount(viewedUserId);
  const actionHTML = currentUser.uid === viewedUserId
    ? "<a class=\"main-btn\" href=\"profile.html\">Editar meu perfil</a>"
    : "<button id=\"followBtn\">" + (following ? "Deixar de seguir" : "Seguir") + "</button>";

  publicProfile.innerHTML = [
    renderProfileBanner(viewedProfile),
    "<div class=\"profile-main\">",
    avatarHTML(viewedProfile.photo || defaultAvatar, viewedProfile.photoZoom || 1, viewedProfile.photoX || 0, viewedProfile.photoY || 0, "large"),
    "<h2>@" + escapeHTML(viewedProfile.username) + "</h2>",
    "<p class=\"status-box\">" + escapeHTML(viewedProfile.customStatus || "\u2728 online no Music Diary") + "</p>",
    "<p class=\"bio-box\">" + escapeHTML(viewedProfile.bio || "Sem bio ainda.") + "</p>",
    "<div class=\"stats-row\"><span>\uD83D\uDC96 " + followersCount + " seguidores</span><span>\uD83D\uDC65 " + followingCount + " seguindo</span></div>",
    actionHTML,
    "<div class=\"profile-widgets\">",
    "<div class=\"mini-window\"><strong>\uD83C\uDFB5 M\u00FAsica do perfil</strong>" + musicPlayerHTML(viewedProfile) + "</div>",
    "<div class=\"mini-window\"><strong>\uD83D\uDCBF Playlists</strong><p><a class=\"soft-link\" href=\"public-playlists.html?uid=" + encodeURIComponent(viewedUserId) + "\">Ver playlists p\u00FAblicas</a></p></div>",
    "</div>",
    "</div>"
  ].join("\n");

  const followBtn = document.querySelector("#followBtn");
  if (followBtn) followBtn.addEventListener("click", toggleFollow);
}

async function createFollowNotification() {
  if (currentUser.uid === viewedUserId) return;

  await addDoc(collection(db, "users", viewedUserId, "notifications"), {
    type: "follow",
    title: "Novo seguidor",
    message: "@" + currentUser.email.split("@")[0] + " comecou a seguir voce.",
    fromUid: currentUser.uid,
    fromUsername: currentUser.email.split("@")[0],
    fromPhoto: defaultAvatar,
    read: false,
    createdAt: serverTimestamp()
  });
}

async function toggleFollow() {
  try {
    const followingRef = doc(db, "users", currentUser.uid, "following", viewedUserId);
    const followerRef = doc(db, "users", viewedUserId, "followers", currentUser.uid);
    const snap = await getDoc(followingRef);

    if (snap.exists()) {
      await deleteDoc(followingRef);
      await deleteDoc(followerRef);
      showToast("Voce deixou de seguir esse perfil.");
    } else {
      const data = {
        createdAt: serverTimestamp(),
        username: viewedProfile.username || "",
        photo: viewedProfile.photo || defaultAvatar
      };

      await setDoc(followingRef, {
        ...data,
        targetUid: viewedUserId
      });

      await setDoc(followerRef, {
        createdAt: serverTimestamp(),
        followerUid: currentUser.uid
      });

      await createFollowNotification();
      showToast("Agora voce segue esse perfil.");
    }

    await renderPublicProfile();
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
}

async function loadUserPosts() {
  userPosts.innerHTML = "<div class=\"loading-card\">Carregando posts...</div>";

  const q = query(
    collection(db, "posts"),
    where("userId", "==", viewedUserId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    userPosts.innerHTML = "<div class=\"empty-card\">Esse perfil ainda nao tem posts.</div>";
    return;
  }

  userPosts.innerHTML = "";

  snap.forEach((docSnap) => {
    const post = docSnap.data();
    const date = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString("pt-BR") : "agora";
    const card = document.createElement("article");
    card.className = "post-card";
    card.innerHTML = [
      "<div class=\"post-header\">",
      avatarHTML(post.userPhoto || defaultAvatar, post.userPhotoZoom || 1, post.userPhotoX || 0, post.userPhotoY || 0, "small"),
      "<div><strong>@" + escapeHTML(post.username || "usuaria") + "</strong><span>" + date + "</span></div>",
      "</div>",
      post.text ? "<p class=\"post-text\">" + escapeHTML(post.text) + "</p>" : "",
      post.image ? "<img loading=\"lazy\" class=\"post-image\" src=\"" + escapeHTML(post.image) + "\" alt=\"Imagem do post\">" : "",
      post.music ? "<a class=\"music-pill\" href=\"" + escapeHTML(post.music) + "\" target=\"_blank\">Abrir musica</a>" : "",
      "<div class=\"post-actions\"><span>" + (post.likes || 0) + " curtidas</span></div>"
    ].join("\n");

    userPosts.appendChild(card);
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;
  viewedUserId = getUserIdFromURL();

  await renderPublicProfile();
  if (viewedUserId) await loadUserPosts();
});
