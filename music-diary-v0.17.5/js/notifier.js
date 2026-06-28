import { auth, db, defaultAvatar } from "./firebase.js";
import { avatarHTML, escapeHTML } from "./utils.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

let started = false;
let currentUser = null;
let firstLoad = true;
let seenIds = new Set();

function ensureContainer() {
  let container = document.querySelector("#popupNotifications");

  if (!container) {
    container = document.createElement("div");
    container.id = "popupNotifications";
    container.className = "popup-notifications";
    document.body.appendChild(container);
  }

  return container;
}

function notificationIcon(type) {
  if (type === "message") return "💬";
  if (type === "follow") return "👤";
  if (type === "like") return "💖";
  if (type === "comment") return "💬";
  if (type === "post") return "📝";
  if (type === "playlist") return "🎵";
  return "✨";
}

function notificationLink(data) {
  if (data.type === "message") return "chat.html";
  if (data.type === "follow" && data.fromUid) return `user.html?uid=${data.fromUid}`;
  if (data.type === "post") return "feed.html";
  if (data.type === "like" || data.type === "comment") return "notifications.html";
  return "notifications.html";
}

function playSoftPop() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(740, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, audioContext.currentTime + 0.08);

    gain.gain.setValueAtTime(0.001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.025, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.16);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);
  } catch (error) {}
}

async function markRead(notificationId) {
  if (!currentUser) return;

  try {
    await updateDoc(doc(db, "users", currentUser.uid, "notifications", notificationId), {
      read: true
    });
  } catch (error) {}
}

function showPopup(notificationId, data) {
  const container = ensureContainer();

  const card = document.createElement("article");
  card.className = "popup-card";

  const icon = notificationIcon(data.type);
  const link = notificationLink(data);

  card.innerHTML = `
    <button class="popup-close" type="button">×</button>
    <div class="popup-left">
      ${data.fromPhoto ? avatarHTML(data.fromPhoto || defaultAvatar, 1, 0, 0, "small") : `<div class="popup-icon">${icon}</div>`}
    </div>
    <div class="popup-body">
      <strong>${icon} ${escapeHTML(data.title || "Nova notificação")}</strong>
      <p>${escapeHTML(data.message || "Você tem uma novidade no Music Diary.")}</p>
      <a href="${link}">Abrir</a>
    </div>
  `;

  container.appendChild(card);
  playSoftPop();

  card.querySelector(".popup-close").addEventListener("click", () => {
    card.remove();
  });

  card.querySelector("a").addEventListener("click", () => {
    markRead(notificationId);
  });

  setTimeout(() => {
    card.classList.add("leaving");
    setTimeout(() => card.remove(), 350);
  }, 7000);
}

export function startNotifier() {
  if (started) return;
  started = true;

  onAuthStateChanged(auth, (user) => {
    if (!user) return;

    currentUser = user;
    ensureContainer();

    const q = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const notificationId = change.doc.id;
        const data = change.doc.data();

        if (change.type !== "added") return;

        if (firstLoad) {
          seenIds.add(notificationId);
          return;
        }

        if (seenIds.has(notificationId)) return;
        seenIds.add(notificationId);

        if (data.read) return;

        showPopup(notificationId, data);
      });

      firstLoad = false;
    });
  });
}

startNotifier();
