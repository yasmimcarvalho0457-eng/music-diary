import { auth, db, defaultAvatar } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { escapeHTML, avatarHTML, showToast, firebaseErrorMessage } from "./utils.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection, getDoc, doc, setDoc, addDoc, query, orderBy,
  onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const usersList = document.querySelector("#usersList");
const chatTitle = document.querySelector("#chatTitle");
const messagesBox = document.querySelector("#messagesBox");
const messageForm = document.querySelector("#messageForm");
const messageInput = document.querySelector("#messageInput");
const imageInput = document.querySelector("#imageInput");
const emojiButtons = document.querySelectorAll(".emoji-btn");
const typingStatus = document.querySelector("#typingStatus");

let currentUser = null;
let currentProfile = null;
let allUsers = [];
let selectedUser = null;
let unsubscribeMessages = null;
let unsubscribeTyping = null;
let unsubscribeUsers = null;
let typingTimer = null;
let renderInterval = null;
let lastChatHeaderState = "";
let renderUsersToken = 0;

function chatIdFor(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

async function loadCurrentProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  currentProfile = snap.exists() ? snap.data() : {
    username: currentUser.email.split("@")[0],
    photo: defaultAvatar,
    photoZoom: 1,
    photoX: 0,
    photoY: 0
  };
}


function startUsersListener() {
  if (unsubscribeUsers) unsubscribeUsers();

  const q = query(collection(db, "users"), orderBy("username"));

  unsubscribeUsers = onSnapshot(q, async (snapshot) => {
    const usersMap = new Map();

    snapshot.forEach((docSnap) => {
      if (docSnap.id === currentUser.uid) return;

      usersMap.set(docSnap.id, {
        uid: docSnap.id,
        ...docSnap.data()
      });
    });

    allUsers = Array.from(usersMap.values());

    await renderUsers();
    updateSelectedUserFromList();
  });

  clearInterval(renderInterval);
  renderInterval = setInterval(() => {
    updateOnlineStatusOnly();
    updateSelectedUserFromList();
  }, 5000);
}

function updateSelectedUserFromList() {
  if (!selectedUser) return;

  const refreshed = allUsers.find((u) => u.uid === selectedUser.uid);
  if (refreshed) {
    selectedUser = refreshed;
    renderChatTitle();
  }
}

function updateOnlineStatusOnly() {
  document.querySelectorAll(".chat-user-card").forEach((card) => {
    const uid = card.dataset.uid;
    const user = allUsers.find((u) => u.uid === uid);
    if (!user) return;

    const onlineNow = isReallyOnline(user);
    const dot = card.querySelector(".online-dot");
    const statusText = card.querySelector(".status-text");

    if (dot) dot.classList.toggle("is-online", onlineNow);
    if (statusText) statusText.textContent = onlineNow ? "🟢 online" : "⚫ offline";
  });
}

async function renderUsers() {
  const token = ++renderUsersToken;
  const uniqueUsers = Array.from(new Map(allUsers.map((user) => [user.uid, user])).values());

  if (!uniqueUsers.length) {
    usersList.innerHTML = `<div class="empty-card">Ainda não tem outros usuários.</div>`;
    return;
  }

  const rows = [];

  for (const user of uniqueUsers) {
    const lastMessage = await getLastMessage(user.uid);
    const lastTime = await getLastTime(user.uid);
    const onlineNow = isReallyOnline(user);

    rows.push(`
      <button class="chat-user-card ${selectedUser?.uid === user.uid ? "active" : ""}" data-uid="${user.uid}" type="button">
        <div class="chat-avatar-wrap">
          ${avatarHTML(user.photo || defaultAvatar, user.photoZoom || 1, user.photoX || 0, user.photoY || 0, "small")}
          <span class="online-dot ${onlineNow ? "is-online" : ""}"></span>
        </div>
        <div>
          <strong>@${escapeHTML(user.username || "usuaria")}</strong>
          <span class="status-text">${onlineNow ? "🟢 online" : "⚫ offline"}</span>
          <small>${escapeHTML(lastMessage || "clique para conversar")}</small>
        </div>
        ${lastTime ? `<em>${lastTime}</em>` : ""}
      </button>
    `);
  }

  if (token !== renderUsersToken) return;

  usersList.innerHTML = rows.join("");

  document.querySelectorAll(".chat-user-card").forEach((item) => {
    item.addEventListener("click", () => {
      const uid = item.dataset.uid;
      const user = allUsers.find((u) => u.uid === uid);
      if (!user) return;

      selectedUser = user;
      selectUser(user);
      updateActiveUserCard();
    });
  });
}

function updateActiveUserCard() {
  document.querySelectorAll(".chat-user-card").forEach((card) => {
    card.classList.toggle("active", card.dataset.uid === selectedUser?.uid);
  });
}

function isReallyOnline(user) {
  if (!user.online || !user.lastSeen?.toDate) return false;
  const seconds = (Date.now() - user.lastSeen.toDate().getTime()) / 1000;
  return seconds < 65;
}

async function getLastMessage(otherUid) {
  const id = chatIdFor(currentUser.uid, otherUid);
  const snap = await getDoc(doc(db, "chats", id));
  if (!snap.exists()) return "";
  const last = snap.data().lastMessage || "";
  return last.length > 28 ? last.slice(0, 28) + "..." : last;
}

async function getLastTime(otherUid) {
  const id = chatIdFor(currentUser.uid, otherUid);
  const snap = await getDoc(doc(db, "chats", id));
  if (!snap.exists() || !snap.data().updatedAt?.toDate) return "";
  return snap.data().updatedAt.toDate().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function renderChatTitle() {
  if (!selectedUser) return;

  const onlineNow = isReallyOnline(selectedUser);
  const state = `${selectedUser.uid}-${onlineNow}-${selectedUser.username}`;

  if (lastChatHeaderState === state) return;
  lastChatHeaderState = state;

  chatTitle.innerHTML = `
    <div class="chat-avatar-wrap">
      ${avatarHTML(selectedUser.photo || defaultAvatar, selectedUser.photoZoom || 1, selectedUser.photoX || 0, selectedUser.photoY || 0, "small")}
      <span class="online-dot ${onlineNow ? "is-online" : ""}"></span>
    </div>
    <div>
      <strong>@${escapeHTML(selectedUser.username || "usuaria")}</strong>
      <span>${onlineNow ? "🟢 online agora" : "⚫ offline"}</span>
    </div>
  `;
}

async function selectUser(user) {
  selectedUser = user;
  updateActiveUserCard();
  renderChatTitle();

  messageForm.classList.remove("hidden");
  messagesBox.innerHTML = `<div class="loading-card">Abrindo conversa...</div>`;

  const id = chatIdFor(currentUser.uid, selectedUser.uid);
  const chatRef = doc(db, "chats", id);

  await setDoc(chatRef, {
    members: [currentUser.uid, selectedUser.uid],
    memberNames: {
      [currentUser.uid]: currentProfile.username || currentUser.email,
      [selectedUser.uid]: selectedUser.username || selectedUser.email
    },
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeTyping) unsubscribeTyping();

  const messagesRef = collection(db, "chats", id, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesBox.innerHTML = "";

    if (snapshot.empty) {
      messagesBox.innerHTML = `<div class="empty-chat">Comece a conversa ✨</div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const mine = msg.senderId === currentUser.uid;
      const time = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"}) : "";

      const bubble = document.createElement("div");
      bubble.className = `message-row ${mine ? "mine" : "theirs"}`;

      bubble.innerHTML = `
        <div class="message-bubble">
          ${msg.text ? `<p>${escapeHTML(msg.text)}</p>` : ""}
          ${msg.imageUrl ? `<img class="message-image" src="${msg.imageUrl}" alt="Imagem enviada">` : ""}
          <small>${time}</small>
        </div>
      `;

      messagesBox.appendChild(bubble);
    });

    messagesBox.scrollTop = messagesBox.scrollHeight;
  });

  unsubscribeTyping = onSnapshot(chatRef, (snap) => {
    if (!snap.exists()) return;

    const typing = snap.data().typing?.[selectedUser.uid];

    if (typing?.active && typing?.updatedAt?.toDate) {
      const seconds = (Date.now() - typing.updatedAt.toDate().getTime()) / 1000;

      if (seconds < 4) {
        typingStatus.textContent = `@${selectedUser.username || "usuaria"} está digitando...`;
        typingStatus.classList.remove("hidden");
        return;
      }
    }

    typingStatus.textContent = "";
    typingStatus.classList.add("hidden");
  });
}

async function setTyping(value) {
  if (!selectedUser) return;

  const id = chatIdFor(currentUser.uid, selectedUser.uid);

  await setDoc(doc(db, "chats", id), {
    typing: {
      [currentUser.uid]: {
        active: value,
        updatedAt: serverTimestamp()
      }
    }
  }, { merge: true });
}

messageInput.addEventListener("input", async () => {
  if (!selectedUser) return;

  await setTyping(true);

  clearTimeout(typingTimer);
  typingTimer = setTimeout(async () => {
    await setTyping(false);
  }, 1400);
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!selectedUser) {
    showToast("Escolha uma pessoa para conversar.", "error");
    return;
  }

  const text = messageInput.value.trim();
  const imageUrl = imageInput.value.trim();

  if (!text && !imageUrl) return;

  try {
    const id = chatIdFor(currentUser.uid, selectedUser.uid);

    await addDoc(collection(db, "chats", id, "messages"), {
      text,
      imageUrl,
      senderId: currentUser.uid,
      senderUsername: currentProfile.username || "usuaria",
      receiverId: selectedUser.uid,
      createdAt: serverTimestamp()
    });

    const lastMessage = imageUrl && !text ? "📷 imagem" : text;

    await setDoc(doc(db, "chats", id), {
      updatedAt: serverTimestamp(),
      lastMessage,
      lastSenderId: currentUser.uid
    }, { merge: true });

    await setTyping(false);
    messageInput.value = "";
    imageInput.value = "";
    await renderUsers();
  } catch (error) {
    showToast(firebaseErrorMessage(error), "error");
  }
});

emojiButtons.forEach((button) => {
  button.addEventListener("click", () => {
    messageInput.value += button.textContent;
    messageInput.dispatchEvent(new Event("input"));
    messageInput.focus();
  });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;
  await loadCurrentProfile();
  startUsersListener();
});
