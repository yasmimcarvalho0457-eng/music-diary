import { auth, db, defaultAvatar } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { avatarHTML, escapeHTML } from "./utils.js";
import { musicPlayerHTML } from "./music.js";
import { normalizeBannerProfile, renderProfileBanner } from "./banner.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

protectPage();
applyUserTheme();

const desktop = document.querySelector("#desktopArea");
const taskbarApps = document.querySelector("#taskbarApps");
const clock = document.querySelector("#clock");

let zIndex = 20;
let currentUser = null;
let currentProfile = null;
let openWindows = new Map();

const apps = {
  profile: {
    title: "Meu Perfil",
    icon: "\uD83D\uDC64",
    content: () => [
      "<div class=\"desktop-profile\">",
      renderProfileBanner(currentProfile, { className: "desktop-banner", alt: "Banner do perfil" }),
      avatarHTML(currentProfile.photo || defaultAvatar, currentProfile.photoZoom || 1, currentProfile.photoX || 0, currentProfile.photoY || 0, "medium"),
      "<h2>@" + escapeHTML(currentProfile.username || "usuaria") + "</h2>",
      "<p class=\"status-box\">" + escapeHTML(currentProfile.customStatus || "\u2728 online no Music Diary") + "</p>",
      "<p>" + escapeHTML(currentProfile.bio || "Sem bio ainda.") + "</p>",
      "<a class=\"main-btn\" href=\"profile.html\">Editar perfil completo</a>",
      "</div>"
    ].join("\n")
  },
  winamp: {
    title: "Mini Winamp",
    icon: "\uD83C\uDFB5",
    content: () => [
      "<div class=\"winamp-box\">",
      "<div class=\"winamp-screen\"><span>NOW PLAYING</span><strong>" + escapeHTML(currentProfile.musicTitle || "M\u00FAsica do perfil") + "</strong><small>" + escapeHTML(currentProfile.musicArtist || "Artista") + "</small></div>",
      musicPlayerHTML(currentProfile),
      "</div>"
    ].join("\n")
  },
  playlists: {
    title: "Playlists",
    icon: "\uD83D\uDCBF",
    content: () => [
      "<div>",
      "<h2>Minhas playlists</h2>",
      "<p>Abra sua p\u00E1gina de playlists para criar e editar m\u00FAsicas.</p>",
      "<a class=\"main-btn\" href=\"playlists.html\">Abrir playlists</a>",
      "</div>"
    ].join("\n")
  },
  chat: {
    title: "Mensagens",
    icon: "\uD83D\uDCAC",
    content: () => [
      "<div>",
      "<h2>Music Messenger</h2>",
      "<p>Abra o chat para conversar em tempo real.</p>",
      "<a class=\"main-btn\" href=\"chat.html\">Abrir mensagens</a>",
      "</div>"
    ].join("\n")
  },
  feed: {
    title: "Feed",
    icon: "\uD83D\uDCDD",
    content: () => [
      "<div>",
      "<h2>Feed</h2>",
      "<p>Veja posts, curtidas e coment\u00E1rios.</p>",
      "<a class=\"main-btn\" href=\"feed.html\">Abrir feed</a>",
      "</div>"
    ].join("\n")
  },
  settings: {
    title: "Configura\u00E7\u00F5es",
    icon: "\u2699\uFE0F",
    content: () => [
      "<div>",
      "<h2>Configura\u00E7\u00F5es do Desktop</h2>",
      "<p>Em breve: wallpaper, cursores, sons e temas do desktop.</p>",
      "<p class=\"muted\">Essa \u00E9 a primeira base do Desktop Y2K.</p>",
      "</div>"
    ].join("\n")
  }
};

function updateClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

setInterval(updateClock, 1000);
updateClock();

function createIcons() {
  document.querySelectorAll(".desktop-icon").forEach((icon) => {
    icon.addEventListener("click", () => {
      document.querySelectorAll(".desktop-icon").forEach((item) => item.classList.remove("selected"));
      icon.classList.add("selected");
      openApp(icon.dataset.app);
    });
  });
}

function openApp(appId) {
  const app = apps[appId];
  if (!app) return;

  if (openWindows.has(appId)) {
    const existing = openWindows.get(appId);
    existing.classList.remove("minimized");
    focusWindow(existing);
    updateTaskbar();
    return;
  }

  const win = document.createElement("section");
  win.className = "desktop-window";
  win.dataset.app = appId;
  const isSmallScreen = window.innerWidth < 700;
  win.style.left = isSmallScreen ? "10px" : 80 + openWindows.size * 28 + "px";
  win.style.top = isSmallScreen ? 80 + openWindows.size * 12 + "px" : 70 + openWindows.size * 28 + "px";
  win.style.zIndex = ++zIndex;

  win.innerHTML = [
    "<div class=\"window-bar\">",
    "<span>" + escapeHTML(app.icon) + " " + escapeHTML(app.title) + "</span>",
    "<div class=\"window-controls\"><button class=\"minimize-btn\" title=\"Minimizar\">-</button><button class=\"close-btn\" title=\"Fechar\">x</button></div>",
    "</div>",
    "<div class=\"window-content\">" + app.content() + "</div>"
  ].join("\n");

  desktop.appendChild(win);
  openWindows.set(appId, win);
  makeDraggable(win);
  focusWindow(win);
  updateTaskbar();

  win.addEventListener("mousedown", () => focusWindow(win));
  win.querySelector(".close-btn").addEventListener("click", () => closeWindow(appId));
  win.querySelector(".minimize-btn").addEventListener("click", () => {
    win.classList.add("minimized");
    updateTaskbar();
  });
}

function closeWindow(appId) {
  const win = openWindows.get(appId);
  if (!win) return;
  win.remove();
  openWindows.delete(appId);
  updateTaskbar();
}

function focusWindow(win) {
  win.style.zIndex = ++zIndex;
  document.querySelectorAll(".desktop-window").forEach((windowElement) => windowElement.classList.remove("focused"));
  win.classList.add("focused");
}

function makeDraggable(win) {
  const bar = win.querySelector(".window-bar");
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  bar.addEventListener("pointerdown", (event) => {
    isDragging = true;
    focusWindow(win);
    offsetX = event.clientX - win.offsetLeft;
    offsetY = event.clientY - win.offsetTop;
    bar.setPointerCapture(event.pointerId);
  });

  bar.addEventListener("pointermove", (event) => {
    if (!isDragging) return;

    const maxX = desktop.clientWidth - win.offsetWidth;
    const maxY = desktop.clientHeight - win.offsetHeight - 40;
    const x = Math.max(0, Math.min(event.clientX - offsetX, maxX));
    const y = Math.max(0, Math.min(event.clientY - offsetY, maxY));

    win.style.left = x + "px";
    win.style.top = y + "px";
  });

  bar.addEventListener("pointerup", () => {
    isDragging = false;
  });
}

function updateTaskbar() {
  taskbarApps.innerHTML = "";

  openWindows.forEach((win, appId) => {
    const app = apps[appId];
    const btn = document.createElement("button");
    btn.className = "taskbar-app " + (win.classList.contains("minimized") ? "is-minimized" : "");
    btn.textContent = app.icon + " " + app.title;
    btn.addEventListener("click", () => {
      win.classList.toggle("minimized");
      if (!win.classList.contains("minimized")) focusWindow(win);
      updateTaskbar();
    });
    taskbarApps.appendChild(btn);
  });
}

async function loadProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};

  currentProfile = {
    ...data,
    username: data.username || user.email.split("@")[0],
    email: data.email || user.email,
    photo: data.photo || defaultAvatar,
    photoZoom: Number(data.photoZoom || 1),
    photoX: Number(data.photoX || 0),
    photoY: Number(data.photoY || 0),
    ...normalizeBannerProfile(data),
    theme: data.theme || "sakura"
  };

  if (currentProfile.theme) document.body.dataset.theme = currentProfile.theme;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadProfile(user);
  createIcons();
});
