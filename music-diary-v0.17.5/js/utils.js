export function showToast(message, type = "success") {
  let toast = document.querySelector(".toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 3200);
}

export function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function firebaseErrorMessage(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "Esse e-mail já está em uso.",
    "auth/invalid-email": "Esse e-mail não parece válido.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/missing-password": "Digite sua senha.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/user-not-found": "Conta não encontrada.",
    "auth/wrong-password": "Senha incorreta.",
    "permission-denied": "Não foi possível salvar. Confira as regras do Firestore."
  };
  return messages[code] || "Algo deu errado. Tente novamente.";
}

export function avatarHTML(photo, zoom = 1, x = 0, y = 0, sizeClass = "") {
  return `
    <div class="avatar-frame ${sizeClass}">
      <img class="avatar-img" src="${photo}" style="transform: translate(${x}px, ${y}px) scale(${zoom});" alt="Avatar">
    </div>
  `;
}
