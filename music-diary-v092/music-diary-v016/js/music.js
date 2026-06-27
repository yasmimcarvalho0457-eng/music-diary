export function getYouTubeId(url) {
  if (!url) return null;

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function getSpotifyEmbed(url) {
  if (!url || !url.includes("spotify.com")) return null;

  try {
    const clean = url.split("?")[0];

    if (clean.includes("/track/")) {
      const id = clean.split("/track/")[1];
      return `https://open.spotify.com/embed/track/${id}`;
    }

    if (clean.includes("/playlist/")) {
      const id = clean.split("/playlist/")[1];
      return `https://open.spotify.com/embed/playlist/${id}`;
    }

    if (clean.includes("/album/")) {
      const id = clean.split("/album/")[1];
      return `https://open.spotify.com/embed/album/${id}`;
    }
  } catch (error) {
    return null;
  }

  return null;
}

export function isAudioFile(url) {
  return /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(url || "");
}

export function musicPlayerHTML(profile = {}) {
  const title = profile.musicTitle || "Música do perfil";
  const artist = profile.musicArtist || "Artista";
  const url = profile.musicUrl || "";

  if (!url) {
    return `
      <div class="music-player empty-player">
        <div class="player-disc">💿</div>
        <div>
          <strong>Sem música fixa ainda</strong>
          <p>Edite o perfil e adicione uma música.</p>
        </div>
      </div>
    `;
  }

  const youtubeId = getYouTubeId(url);
  const spotifyEmbed = getSpotifyEmbed(url);

  let embed = "";

  if (youtubeId) {
    embed = `
      <iframe
        class="music-embed"
        src="https://www.youtube.com/embed/${youtubeId}"
        title="YouTube player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    `;
  } else if (spotifyEmbed) {
    embed = `
      <iframe
        class="spotify-embed"
        src="${spotifyEmbed}"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy">
      </iframe>
    `;
  } else if (isAudioFile(url)) {
    embed = `<audio class="audio-player" controls src="${url}"></audio>`;
  } else {
    embed = `<a class="music-pill" href="${url}" target="_blank">🎵 Abrir música</a>`;
  }

  return `
    <div class="music-player">
      <div class="player-top">
        <div class="player-disc">💿</div>
        <div>
          <strong>${title}</strong>
          <p>${artist}</p>
        </div>
      </div>
      ${embed}
    </div>
  `;
}
