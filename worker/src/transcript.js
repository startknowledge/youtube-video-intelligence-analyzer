// =========================================================
// TRANSCRIPT FETCHER
// Uses YouTube's public timedtext API + InnerTube fallback
// No API key needed. Server-side → no CORS issues.
// =========================================================

/**
 * Fetch transcript for a YouTube video
 * @param {string} videoId - 11-char YouTube video ID
 * @returns {Promise<{text: string, language: string, available: boolean, wordCount: number} | null>}
 */
export async function fetchTranscript(videoId) {
  if (!videoId || typeof videoId !== "string") {
    return null;
  }

  // =========================================================
  // METHOD 1: YouTube timedtext API (direct)
  // =========================================================

  const langs = [
    "en",
    "en-US",
    "en-GB",
    "hi",
    "en-IN",
    "auto"
  ];

  for (const lang of langs) {
    try {
      const url = `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}`;

      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
          Accept: "text/xml,application/xml,*/*"
        }
      });

      if (!res.ok) continue;

      const xml = await res.text();
      if (!xml || xml.length < 50) continue;

      const text = parseTimedTextXML(xml);

      if (text && text.length > 100) {
        return {
          text,
          language: lang === "auto" ? "AUTO" : lang.toUpperCase(),
          available: true,
          wordCount: text.split(/\s+/).filter(Boolean).length
        };
      }
    } catch (err) {
      // try next language
    }
  }

  // =========================================================
  // METHOD 2: InnerTube API (gets caption tracks from player response)
  // =========================================================

  try {
    const tracks = await getCaptionTracksFromInnerTube(videoId);

    for (const track of tracks) {
      try {
        const baseUrl = track.baseUrl;
        if (!baseUrl) continue;

        const res = await fetch(baseUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
          }
        });

        if (!res.ok) continue;

        const xml = await res.text();
        if (!xml || xml.length < 50) continue;

        const text = parseTimedTextXML(xml);

        if (text && text.length > 100) {
          return {
            text,
            language:
              track.languageCode?.toUpperCase() ||
              "AUTO",
            available: true,
            wordCount: text
              .split(/\s+/)
              .filter(Boolean).length
          };
        }
      } catch (err) {
        // try next track
      }
    }
  } catch (err) {
    // InnerTube failed — fall through to return null
  }

  return null;
}

/**
 * Parse YouTube timedtext XML format
 * @param {string} xml
 * @returns {string}
 */
function parseTimedTextXML(xml) {
  try {
    const matches = xml.match(
      /<text[^>]*>([\s\S]*?)<\/text>/g
    );

    if (!matches || matches.length === 0) {
      return "";
    }

    let text = "";

    for (const m of matches) {
      const inner = m.replace(/<[^>]+>/g, "");

      const decoded = inner
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_, num) =>
          String.fromCharCode(Number(num))
        )
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16))
        )
        .replace(/\n+/g, " ")
        .trim();

      if (decoded) {
        text += decoded + " ";
      }
    }

    return text.replace(/\s+/g, " ").trim();
  } catch (err) {
    return "";
  }
}

/**
 * Get caption tracks using YouTube's InnerTube (player) API
 * @param {string} videoId
 * @returns {Promise<Array>}
 */
async function getCaptionTracksFromInnerTube(videoId) {
  try {
    const body = {
      context: {
        client: {
          clientName: "WEB",
          clientVersion: "2.20240101.00.00",
          hl: "en",
          gl: "US"
        }
      },
      videoId: videoId
    };

    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
        },
        body: JSON.stringify(body)
      }
    );

    if (!res.ok) return [];

    const data = await res.json();

    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer
        ?.captionTracks;

    if (!Array.isArray(tracks)) return [];

    // Prefer English or Hindi first
    return tracks.sort((a, b) => {
      const score = (t) => {
        const code = (t.languageCode || "").toLowerCase();
        if (code === "en") return 100;
        if (code === "hi") return 95;
        if (code.startsWith("en-")) return 90;
        return 50;
      };
      return score(b) - score(a);
    });
  } catch (err) {
    return [];
  }
}