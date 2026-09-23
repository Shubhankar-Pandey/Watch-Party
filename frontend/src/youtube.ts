const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

/*
 * Accepts anything a user might paste - a full watch URL, a
 * youtu.be short link, a shorts/embed/live URL, a URL without a
 * protocol, or a bare 11-character video ID - and returns just the
 * video ID, or null if nothing valid could be found.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  // Already looks like a bare video ID - nothing to extract.
  if (YOUTUBE_ID_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    // Support URLs pasted without a protocol (e.g. "youtu.be/xyz")
    // by giving the URL constructor one to work with.
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
      }

      const pathMatch = url.pathname.match(
        /^\/(embed|shorts|live)\/([a-zA-Z0-9_-]{11})/,
      );

      if (pathMatch) {
        return pathMatch[2];
      }
    }

    return null;
  } catch {
    return null;
  }
}
