import { auth, db, defaultAvatar } from "./firebase.js";
import { avatarHTML, escapeHTML } from "./utils.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const MESSAGE_TYPE = "message";
const PANEL_LABELS = {
  messages: {
    title: "Mensagens",
    empty: "Nenhuma mensagem por aqui ainda.",
    action: "Abrir mensagens",
    href: "chat.html"
  },
  notifications: {
    title: "Notificações",
    empty: "Nenhuma notificação social por aqui ainda.",
    action: "Ver notificações",
    href: "notifications.html"
  }
};

let currentUser = null;
let recentNotifications = [];

function closeDropdownMenus(exceptId = "") {
  const toggles = document.querySelectorAll("[data-nav-toggle]");
  const menus = document.querySelectorAll("[data-nav-menu]");

  menus.forEach((menu) => {
    if (menu.id === exceptId) return;
    menu.hidden = true;
  });

  toggles.forEach((toggle) => {
    if (toggle.dataset.navToggle === exceptId) return;
    toggle.setAttribute("aria-expanded", "false");
  });
}

function closeNavWindows(exceptType = "") {
  document.querySelectorAll("[data-nav-window]").forEach((panel) => {
    if (panel.dataset.navWindow === exceptType) return;
    panel.hidden = true;
  });

  document.querySelectorAll("[data-alert-type]").forEach((button) => {
    if (button.dataset.alertType === exceptType) return;
    button.setAttribute("aria-expanded", "false");
  });
}

function setupMenus() {
  const toggles = document.querySelectorAll("[data-nav-toggle]");

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const menu = document.getElementById(toggle.dataset.navToggle);
      if (!menu) return;

      const willOpen = menu.hidden;
      closeNavWindows();
      closeDropdownMenus(toggle.dataset.navToggle);

      menu.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-menu-wrap")) closeDropdownMenus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDropdownMenus();
  });
}

function setBadge(type, count) {
  const countBadge = document.querySelector(`[data-count-for="${type}"]`);
  const alertDot = document.querySelector(`[data-alert-type="${type}"] .nav-alert`);
  const button = document.querySelector(`[data-alert-type="${type}"]`);
  const hasUnread = count > 0;

  if (countBadge) {
    countBadge.textContent = count > 99 ? "99+" : String(count);
    countBadge.hidden = !hasUnread;
  }

  if (alertDot) alertDot.hidden = !hasUnread;
  if (button) button.classList.toggle("has-unread", hasUnread);
}

function isMessageNotification(data) {
  return data?.type === MESSAGE_TYPE;
}

function unreadNotificationsQuery(uid) {
  return query(
    collection(db, "users", uid, "notifications"),
    where("read", "==", false)
  );
}

function recentNotificationsQuery(uid) {
  return query(
    collection(db, "users", uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(30)
  );
}

function startUnreadBadges(user) {
  onSnapshot(unreadNotificationsQuery(user.uid), (snapshot) => {
    let unreadMessages = 0;
    let unreadSocial = 0;

    snapshot.forEach((item) => {
      const data = item.data();
      if (isMessageNotification(data)) {
        unreadMessages += 1;
      } else {
        unreadSocial += 1;
      }
    });

    setBadge("messages", unreadMessages);
    setBadge("notifications", unreadSocial);
  });
}

function startNavWindowFeed(user) {
  onSnapshot(recentNotificationsQuery(user.uid), (snapshot) => {
    recentNotifications = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    document.querySelectorAll("[data-nav-window]:not([hidden])").forEach((panel) => {
      renderNavWindow(panel.dataset.navWindow);
    });
  });
}

async function markCategoryRead(uid, category) {
  const snapshot = await getDocs(unreadNotificationsQuery(uid));
  const updates = [];

  snapshot.forEach((item) => {
    const isMessage = isMessageNotification(item.data());
    const shouldMark =
      (category === "messages" && isMessage) ||
      (category === "notifications" && !isMessage);

    if (shouldMark) {
      updates.push(updateDoc(doc(db, "users", uid, "notifications", item.id), {
        read: true
      }));
    }
  });

  await Promise.all(updates);
}

function notificationLink(data) {
  if (isMessageNotification(data)) return "chat.html";
  if (data?.type === "follow" && data.fromUid) return `user.html?uid=${encodeURIComponent(data.fromUid)}`;
  if (data?.type === "post") return "feed.html";
  return "notifications.html";
}

function formatNotificationTime(data) {
  if (!data?.createdAt?.toDate) return "agora";

  return data.createdAt.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function itemsForPanel(type) {
  return recentNotifications
    .filter((item) => type === "messages" ? isMessageNotification(item) : !isMessageNotification(item))
    .slice(0, 8);
}

function renderNavWindowItem(item) {
  const link = notificationLink(item);
  const title = item.title || (isMessageNotification(item) ? "Nova mensagem" : "Nova notificação");
  const message = item.message || "Você tem uma novidade no Music Diary.";
  const unreadClass = item.read ? "" : " unread";

  return `
    <a class="nav-window-item${unreadClass}" href="${link}">
      <div class="nav-window-avatar">
        ${avatarHTML(item.fromPhoto || defaultAvatar, 1, 0, 0, "small")}
      </div>
      <div class="nav-window-copy">
        <strong>${escapeHTML(title)}</strong>
        <p>${escapeHTML(message)}</p>
      </div>
      <time>${escapeHTML(formatNotificationTime(item))}</time>
    </a>
  `;
}

function ensureNavWindow(type) {
  let panel = document.querySelector(`[data-nav-window="${type}"]`);

  if (!panel) {
    panel = document.createElement("section");
    panel.className = `nav-window nav-window-${type}`;
    panel.dataset.navWindow = type;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", PANEL_LABELS[type].title);
    panel.hidden = true;
    document.querySelector(".nav-actions")?.appendChild(panel);
  }

  return panel;
}

function renderNavWindow(type) {
  const panel = ensureNavWindow(type);
  const labels = PANEL_LABELS[type];
  const items = itemsForPanel(type);

  panel.innerHTML = `
    <div class="nav-window-header">
      <strong>${labels.title}</strong>
      <button class="nav-window-close" type="button" aria-label="Fechar ${labels.title}">×</button>
    </div>
    <div class="nav-window-list">
      ${items.length ? items.map(renderNavWindowItem).join("") : `<div class="nav-window-empty">${labels.empty}</div>`}
    </div>
    <a class="nav-window-action" href="${labels.href}">${labels.action}</a>
  `;

  panel.querySelector(".nav-window-close")?.addEventListener("click", () => {
    closeNavWindows();
  });
}

function setupNavWindows() {
  document.querySelectorAll("[data-alert-type]").forEach((button) => {
    const type = button.dataset.alertType;
    if (!PANEL_LABELS[type]) return;

    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    ensureNavWindow(type);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const panel = ensureNavWindow(type);
      const willOpen = panel.hidden;

      closeDropdownMenus();
      closeNavWindows(willOpen ? type : "");

      panel.hidden = !willOpen;
      button.setAttribute("aria-expanded", String(willOpen));

      if (willOpen) {
        renderNavWindow(type);
        if (currentUser) markCategoryRead(currentUser.uid, type).catch(() => {});
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-nav-window]") || event.target.closest("[data-alert-type]")) return;
    closeNavWindows();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavWindows();
  });
}

function markCurrentAreaRead(user) {
  const page = window.location.pathname.split("/").pop();

  if (page === "chat.html") {
    markCategoryRead(user.uid, "messages").catch(() => {});
  }

  if (page === "notifications.html") {
    markCategoryRead(user.uid, "notifications").catch(() => {});
  }
}

setupMenus();
setupNavWindows();

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  currentUser = user;
  startUnreadBadges(user);
  startNavWindowFeed(user);
  markCurrentAreaRead(user);
});
