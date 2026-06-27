import { supabaseConfig } from "./config.js";

const SUPABASE_URL = supabaseConfig.url;
const SUPABASE_ANON_KEY = supabaseConfig.anonKey;
const BUCKET = supabaseConfig.bucket;

function safeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .toLowerCase();
}

export function isValidImageFile(file) {
  if (!file) return false;
  return ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type);
}

export function previewLocalImage(file, imgElement) {
  if (!file || !imgElement) return;

  const previewUrl = URL.createObjectURL(file);
  imgElement.src = previewUrl;

  imgElement.onload = () => {
    URL.revokeObjectURL(previewUrl);
  };
}

export function bindDropZone(dropZone, fileInput, onFileSelected) {
  if (!dropZone || !fileInput) return;

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("drag-over");
    });
  });

  dropZone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];

    if (!file) return;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;

    if (typeof onFileSelected === "function") onFileSelected(file);
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file && typeof onFileSelected === "function") onFileSelected(file);
  });
}

export async function uploadImageFile(file, folder = "general") {
  if (!file) throw new Error("Escolha uma imagem primeiro.");

  if (!isValidImageFile(file)) {
    throw new Error("Use uma imagem PNG, JPG, WEBP ou GIF.");
  }

  const maxSize = 5 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error("A imagem precisa ter até 5 MB.");
  }

  const extension = file.name.split(".").pop() || "png";
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeFileName(file.name || "image." + extension)}`;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
      "x-upsert": "false",
      "content-type": file.type
    },
    body: file
  });

  if (!response.ok) {
    throw new Error("Não consegui enviar a imagem. Verifique as políticas do bucket uploads no Supabase.");
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}
