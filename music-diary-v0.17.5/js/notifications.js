import { auth, db, defaultAvatar } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { escapeHTML, avatarHTML, showToast } from "./utils.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const notificationsList = document.querySelector("#notificationsList");

async function loadNotifications(user) {
  notificationsList.innerHTML = `<div class="loading-card">Carregando notificações...</div>`;

  const q = query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const socialNotifications = snap.docs.filter((docSnap) => docSnap.data().type !== "message");

  if (!socialNotifications.length) {
    notificationsList.innerHTML = `<div class="empty-card">Você ainda não tem notificações.</div>`;
    return;
  }

  notificationsList.innerHTML = "";

  for (const docSnap of socialNotifications) {
    const notification = docSnap.data();
    const date = notification.createdAt?.toDate ? notification.createdAt.toDate().toLocaleString("pt-BR") : "agora";

    const item = document.createElement("div");
    item.className = `notification-card ${notification.read ? "" : "unread"}`;

    item.innerHTML = `
      ${avatarHTML(notification.fromPhoto || defaultAvatar, 1, 0, 0, "small")}
      <div>
        <strong>${notificationIcon(notification.type)} ${escapeHTML(notification.message || "Nova notificação")}</strong>
        <p>${date}</p>
        ${notification.postId ? `<a class="soft-link" href="feed.html">Ver no feed</a>` : ""}
      </div>
    `;

    notificationsList.appendChild(item);

    if (!notification.read) {
      await updateDoc(doc(db, "users", user.uid, "notifications", docSnap.id), { read: true });
    }
  }
}

function notificationIcon(type) {
  if (type === "like") return "💖";
  if (type === "comment") return "💬";
  if (type === "follow") return "👤";
  if (type === "post") return "📝";
  if (type === "playlist") return "🎵";
  return "✨";
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  await loadNotifications(user);
});
