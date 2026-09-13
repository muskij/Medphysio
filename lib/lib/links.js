// Converts share/watch links people paste into the embeddable form the
// lesson player actually needs. Deterministic and offline - no AI call
// required for this part, since regex handles it more reliably than a model
// would.

export function normalizeYouTubeUrl(input) {
  if (!input) return null;
  const url = input.trim();
  let videoId = null;

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube(?:-nocookie)?\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{6,})/,
    /youtube(?:-nocookie)?\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube(?:-nocookie)?\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) {
      videoId = m[1];
      break;
    }
  }
  if (!videoId) return null;

  return {
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
    linkUrl: `https://youtu.be/${videoId}`,
  };
}

export function normalizeDriveUrl(input) {
  if (!input) return null;
  const url = input.trim();
  const m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const fileId = m[1];
  return {
    embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
    linkUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
  };
}

// Voice notes on this site are Drive audio embeds; video (lecture/answer)
// links are YouTube. Falls back to using the raw pasted URL as both the
// embed and link if it doesn't match a known pattern, rather than silently
// dropping what the admin pasted.
export function normalizeVoiceLink(input) {
  if (!input || !input.trim()) return { embedUrl: "", linkUrl: "" };
  const drive = normalizeDriveUrl(input);
  if (drive) return drive;
  return { embedUrl: input.trim(), linkUrl: input.trim() };
}

export function normalizeVideoLink(input) {
  if (!input || !input.trim()) return { embedUrl: "", linkUrl: "" };
  const yt = normalizeYouTubeUrl(input);
  if (yt) return yt;
  return { embedUrl: input.trim(), linkUrl: input.trim() };
}
