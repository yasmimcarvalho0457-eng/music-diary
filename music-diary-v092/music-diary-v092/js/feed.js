import { auth, db, defaultAvatar } from "./firebase.js";
import { showToast, firebaseErrorMessage, escapeHTML, avatarHTML } from "./utils.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const postForm = document.querySelector("#postForm");
const feed = document.querySelector("#feed");
const miniProfile = document.querySelector("#miniProfile");

let currentUser = null;
let currentProfile = null;

async function loadCurrentProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  currentProfile = snap.exists() ? snap.data() : {
    username: user.email.split("@")[0],
    email: user.email,
    photo: defaultAvatar,
    photoZoom: 1,
    photoX: 0,
    photoY: 0
  };

  miniProfile.innerHTML = `
    ${avatarHTML(currentProfile.photo || defaultAvatar, currentProfile.photoZoom || 1, currentProfile.photoX || 0, currentProfile.photoY || 0, "medium")}
    <h3>@${escapeHTML(currentProfile.username)}</h3>
    <p>${escapeHTML(currentProfile.bio || "Sem bio ainda.")}</p>
    <div class="status-pill">🟢 online</div>
    <a class="soft-link" href="profile.html">Editar perfil</a>
  `;
}

async function createNotification(targetUid, data) {
  if (!targetUid || targetUid === currentUser.uid) return;

  await addDoc(collection(db, "users", targetUid, "notifications"), {
    ...data,
    fromUid: currentUser.uid,
    fromUsername: currentProfile.username || "usuaria",
    fromPhoto: currentProfile.photo || defaultAvatar,
    read: false,
    createdAt: serverTimestamp()
  });
}

if (postForm) {
  postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const text = postForm.text.value.trim();
    const music = postForm.music.value.trim();
    const image = postForm.image.value.trim();

    if (!text && !music && !image) {
      showToast("Escreva algo ou coloque uma música/imagem.", "error");
      return;
    }

    try {
      await addDoc(collection(db, "posts"), {
        userId: currentUser.uid,
        email: currentUser.email,
        username: currentProfile.username,
        userPhoto: currentProfile.photo || defaultAvatar,
        userPhotoZoom: currentProfile.photoZoom || 1,
        userPhotoX: currentProfile.photoX || 0,
        userPhotoY: currentProfile.photoY || 0,
        text,
        music,
        image,
        likes: 0,
        commentsCount: 0,
        createdAt: serverTimestamp()
      });

      postForm.reset();
      showToast("Post publicado ✨");
      await loadFeed();
    } catch (error) {
      showToast(firebaseErrorMessage(error), "error");
    }
  });
}

async function userLikedPost(postId) {
  const likeRef = doc(db, "posts", postId, "likesBy", currentUser.uid);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

async function toggleLike(postId, postOwnerUid) {
  const likeRef = doc(db, "posts", postId, "likesBy", currentUser.uid);
  const postRef = doc(db, "posts", postId);
  const snap = await getDoc(likeRef);

  if (snap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, { likes: increment(-1) });
  } else {
    await setDoc(likeRef, {
      userId: currentUser.uid,
      username: currentProfile.username,
      createdAt: serverTimestamp()
    });
    await updateDoc(postRef, { likes: increment(1) });

    await createNotification(postOwnerUid, {
      type: "like",
      message: `@${currentProfile.username} curtiu seu post.`,
      postId
    });
  }

  await loadFeed();
}

async function addComment(postId, postOwnerUid, input) {
  const text = input.value.trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "posts", postId, "comments"), {
      userId: currentUser.uid,
      username: currentProfile.username,
      userPhoto: currentProfile.photo || defaultAvatar,
      userPhotoZoom: currentProfile.photoZoom || 1,
      userPhotoX: currentProfile.photoX || 0,
      userPhotoY: currentProfile.photoY || 0,
      text,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });

    await createNotification(postOwnerUid, {
      type: "comment",
      message: `@${currentProfile.username} comentou no seu post.`,
      postId
    });

    input.value = "";
    showToast("Comentário enviado 💬");
    await loadFeed();
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
}

async function deleteComment(postId, commentId) {
  try {
    await deleteDoc(doc(db, "posts", postId, "comments", commentId));
    await updateDoc(doc(db, "posts", postId), { commentsCount: increment(-1) });
    showToast("Comentário excluído.");
    await loadFeed();
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
}

async function commentsHTML(postId) {
  const commentsRef = collection(db, "posts", postId, "comments");
  const q = query(commentsRef, orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return "";

  let html = `<div class="comments-list">`;
  snapshot.forEach((c) => {
    const comment = c.data();
    const date = comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString("pt-BR") : "agora";
    const canDelete = comment.userId === currentUser.uid;

    html += `
      <div class="comment">
        ${avatarHTML(comment.userPhoto || defaultAvatar, comment.userPhotoZoom || 1, comment.userPhotoX || 0, comment.userPhotoY || 0, "tiny")}
        <div class="comment-content">
          <div>
            <strong>@${escapeHTML(comment.username || "usuaria")}</strong>
            <small>${date}</small>
          </div>
          <span>${escapeHTML(comment.text)}</span>
        </div>
        ${canDelete ? `<button class="delete-comment-btn" data-post="${postId}" data-comment="${c.id}">Excluir</button>` : ""}
      </div>
    `;
  });
  html += `</div>`;
  return html;
}

async function loadFeed() {
  feed.innerHTML = `<div class="loading-card">Carregando posts...</div>`;

  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      feed.innerHTML = `<div class="empty-card">Ainda não tem posts. Faça o primeiro ✨</div>`;
      return;
    }

    feed.innerHTML = "";

    for (const docSnap of snapshot.docs) {
      const post = docSnap.data();
      const liked = await userLikedPost(docSnap.id);
      const date = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString("pt-BR") : "agora";
      const comments = await commentsHTML(docSnap.id);

      const card = document.createElement("article");
      card.className = "post-card";

      card.innerHTML = `
        <div class="post-header">
          <a href="user.html?uid=${post.userId}">
            ${avatarHTML(post.userPhoto || defaultAvatar, post.userPhotoZoom || 1, post.userPhotoX || 0, post.userPhotoY || 0, "small")}
          </a>
          <div>
            <a class="post-user-link" href="user.html?uid=${post.userId}"><strong>@${escapeHTML(post.username || "usuaria")}</strong></a>
            <span>${date}</span>
          </div>
        </div>

        ${post.text ? `<p class="post-text">${escapeHTML(post.text)}</p>` : ""}
        ${post.image ? `<img class="post-image" src="${post.image}" alt="Imagem do post">` : ""}
        ${post.music ? `<a class="music-pill" href="${post.music}" target="_blank">🎵 Abrir música</a>` : ""}

        <div class="post-actions">
          <button class="like-btn ${liked ? "liked" : ""}" data-id="${docSnap.id}" data-owner="${post.userId}">${liked ? "💔 Descurtir" : "💖 Curtir"}</button>
          <span>${post.likes || 0} curtidas</span>
          <span>💬 ${post.commentsCount || 0}</span>
        </div>

        ${comments}

        <div class="comment-form">
          <input class="comment-input" placeholder="Escreva um comentário...">
          <button class="comment-btn" data-id="${docSnap.id}" data-owner="${post.userId}">Enviar</button>
        </div>
      `;

      feed.appendChild(card);
    }

    document.querySelectorAll(".like-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        await toggleLike(button.dataset.id, button.dataset.owner);
      });
    });

    document.querySelectorAll(".comment-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const input = button.parentElement.querySelector(".comment-input");
        await addComment(button.dataset.id, button.dataset.owner, input);
      });
    });

    document.querySelectorAll(".delete-comment-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        await deleteComment(button.dataset.post, button.dataset.comment);
      });
    });
  } catch (error) {
    feed.innerHTML = `<div class="empty-card">Não consegui carregar o feed. Confira as regras do Firestore.</div>`;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadCurrentProfile(user);
  await loadFeed();
});
