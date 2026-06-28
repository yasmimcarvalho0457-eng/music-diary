export function normalizeImageUrl(url) {
  return (url || "").trim();
}

export function isLikelyImageUrl(url) {
  const clean = normalizeImageUrl(url);

  if (!clean) return true;

  try {
    const parsed = new URL(clean);

    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const imageExtensions = /\.(png|jpg|jpeg|webp|gif|avif|svg)(\?.*)?$/i;

    if (imageExtensions.test(parsed.pathname)) return true;

    const allowedHosts = [
      "i.pinimg.com",
      "i.imgur.com",
      "imgur.com",
      "res.cloudinary.com",
      "raw.githubusercontent.com",
      "github.com",
      "firebasestorage.googleapis.com",
      "lh3.googleusercontent.com",
      "cdn.discordapp.com",
      "media.discordapp.net",
      "images.unsplash.com",
      "64.media.tumblr.com"
    ];

    if (allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith("." + host))) {
      return true;
    }

    // Aceita outros links HTTPS também, porque muitos serviços escondem a extensão da imagem.
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function imageUrlErrorMessage() {
  return "Use um link de imagem válido começando com https://. Pode ser Pinterest, Imgur, GitHub, Cloudinary, Firebase, Discord CDN ou link direto PNG/JPG/WEBP/GIF.";
}
