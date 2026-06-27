import { auth, db, defaultAvatar, defaultBanner } from "./firebase.js";
import { protectPage } from "./auth.js";
import { applyUserTheme } from "./theme.js";
import { avatarHTML, escapeHTML } from "./utils.js";
import { musicPlayerHTML } from "./music.js";
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
    icon: "👤",
    content: () => `
      <div class="desktop-profile">
        <div class="desktop-banner" style="background-image: url('${currentProfile.banner || defaultBanner}')"></div>
        ${avatarHTML(currentProfile.photo || defaultAvatar, currentProfile.photoZoom || 1, currentProfile.photoX || 0, currentProfile.photoY || 0, "medium")}
        <h2>@${escapeHTML(currentProfile.username || "usuaria")}</h2>
        <p class="status-box">${escapeHTML(currentProfile.customStatus || "✨ online no Music Diary")}</p>
        <p>${escapeHTML(currentProfile.bio || "Sem bio ainda.")}</p>
        <a class="main-btn" href="profile.html">Editar perfil completo</a>
      </div>
    `
  },
  winamp: {
    title: "Mini Winamp",
    icon: "🎵",
    content: () => `
      <div class="winamp-box">
        <div class="winamp-screen">
          <span>NOW PLAYING</span>
          <strong>${escapeHTML(currentProfile.musicTitle || "Música do perfil")}</strong>
          <small>${escapeHTML(currentProfile.musicArtist || "Artista")}</small>
        </div>
        ${musicPlayerHTML(currentProfile)}
      </div>
    `
  },
  playlists: {
    title: "Playlists",
    icon: "💿",
    content: () => `
      <div>
        <h2>Minhas playlists</h2>
        <p>Abra sua página de playlists para criar e editar músicas.</p>
        <a class="main-btn" href="playlists.html">Abrir playlists</a>
      </div>
    `
  },
  chat: {
    title: "Mensagens",
    icon: "💬",
    content: () => `
      <div>
        <h2>Music Messenger</h2>
        <p>Abra o chat para conversar em tempo real.</p>
        <a class="main-btn" href="chat.html">Abrir mensagens</a>
      </div>
    `
  },
  feed: {
    title: "Feed",
    icon: "📝",
    content: () => `
      <div>
        <h2>Feed</h2>
        <p>Veja posts, curtidas e comentários.</p>
        <a class="main-btn" href="feed.html">Abrir feed</a>
      </div>
    `
  },
  settings: {
    title: "Configurações",
    icon: "⚙️",
    content: () => `
      <div>
        <h2>Configurações do Desktop</h2>
        <p>Em breve: wallpaper, cursores, sons e temas do desktop.</p>
        <p class="muted">Essa é a primeira base do Desktop Y2K.</p>
      </div>
    `
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
      document.querySelectorAll(".desktop-icon").forEach((i) => i.classList.remove("selected"));
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
  win.style.left = isSmallScreen ? "10px" : `${80 + openWindows.size * 28}px`;
  win.style.top = isSmallScreen ? `${80 + openWindows.size * 12}px` : `${70 + openWindows.size * 28}px`;
  win.style.zIndex = ++zIndex;

  win.innerHTML = `
    <div class="window-bar">
      <span>${app.icon} ${app.title}</span>
      <div class="window-controls">
        <button class="minimize-btn" title="Minimizar">—</button>
        <button class="close-btn" title="Fechar">×</button>
      </div>
    </div>
    <div class="window-content">
      ${app.content()}
    </div>
  `;

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
  document.querySelectorAll(".desktop-window").forEach((w) => w.classList.remove("focused"));
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

    win.style.left = `${x}px`;
    win.style.top = `${y}px`;
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
    btn.className = `taskbar-app ${win.classList.contains("minimized") ? "is-minimized" : ""}`;
    btn.textContent = `${app.icon} ${app.title}`;
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
  currentProfile = snap.exists() ? snap.data() : {
    username: user.email.split("@")[0],
    email: user.email,
    photo: defaultAvatar,
    banner: defaultBanner,
    theme: "sakura"
  };

  if (currentProfile.theme) document.body.dataset.theme = currentProfile.theme;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;
  await loadProfile(user);
  createIcons();
});
