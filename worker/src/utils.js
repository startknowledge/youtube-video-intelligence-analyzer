export function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "Access-Control-Allow-Origin":
          "*",

        "Access-Control-Allow-Headers":
          "Content-Type, Authorization",

        "Access-Control-Allow-Methods":
          "GET, POST, OPTIONS"
      }
    }
  );
}

export function corsResponse() {
  return new Response(null, {
    status: 204,

    headers: {
      "Access-Control-Allow-Origin":
        "*",

      "Access-Control-Allow-Headers":
        "Content-Type, Authorization",

      "Access-Control-Allow-Methods":
        "GET, POST, OPTIONS"
    }
  });
}

export function errorResponse(
  message,
  status = 400,
  details = null
) {
  return json(
    {
      ok: false,
      error: message,
      details
    },
    status
  );
}

export function extractVideoId(
  input
) {

  if (!input) {
    return null;
  }

  try {

    const url =
      new URL(input);

    const hostname =
      url.hostname
        .toLowerCase()
        .replace(/^www\./, "");

    if (
      hostname === "youtu.be"
    ) {

      const id =
        url.pathname
          .split("/")
          .filter(Boolean)[0];

      return validVideoId(id)
        ? id
        : null;
    }

    if (
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "music.youtube.com"
    ) {

      const queryId =
        url.searchParams.get("v");

      if (
        validVideoId(queryId)
      ) {
        return queryId;
      }

      const parts =
        url.pathname
          .split("/")
          .filter(Boolean);

      if (
        parts[0] === "shorts" ||
        parts[0] === "embed" ||
        parts[0] === "live"
      ) {

        return validVideoId(parts[1])
          ? parts[1]
          : null;
      }
    }

    return null;

  } catch {
    return null;
  }
}

function validVideoId(id) {

  return Boolean(
    id &&
    /^[a-zA-Z0-9_-]{11}$/.test(id)
  );
}

export function parseDuration(
  iso
) {

  if (!iso) {
    return 0;
  }

  const match =
    iso.match(
      /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
    );

  if (!match) {
    return 0;
  }

  const hours =
    Number(match[1] || 0);

  const minutes =
    Number(match[2] || 0);

  const seconds =
    Number(match[3] || 0);

  return (
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}

export function formatDuration(
  seconds
) {

  const s =
    Number(seconds) || 0;

  const h =
    Math.floor(s / 3600);

  const m =
    Math.floor(
      (s % 3600) / 60
    );

  const sec =
    Math.floor(s % 60);

  if (h) {

    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;

  }

  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function wordCount(
  text
) {

  if (!text) {
    return 0;
  }

  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

export function unique(
  values
) {

  return [
    ...new Set(
      (values || [])
        .filter(Boolean)
        .map(
          (v) =>
            String(v).trim()
        )
    )
  ];
}

export function safeJsonParse(
  text
) {

  if (!text) {
    return null;
  }

  let cleaned =
    String(text)
      .trim();

  cleaned =
    cleaned
      .replace(
        /^```json/i,
        ""
      )
      .replace(
        /^```/,
        ""
      )
      .replace(
        /```$/,
        ""
      )
      .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export function clamp(
  value,
  min = 0,
  max = 100
) {

  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}