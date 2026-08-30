import {
  clamp,
  unique,
  wordCount
} from "./utils.js";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "your",
  "you",
  "are",
  "was",
  "were",
  "have",
  "has",
  "how",
  "what",
  "when",
  "where",
  "which",
  "will",
  "about",
  "into",
  "using",
  "use",
  "used",
  "can",
  "not",
  "but",
  "all",
  "our",
  "their",
  "they",
  "them",
  "his",
  "her",
  "its",
  "who",
  "why",
  "than",
  "then",
  "also",
  "just",
  "more",
  "very",
  "your",
  "youtube",
  "video"
]);

function tokens(text) {

  return String(text || "")
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s-]/gu,
      " "
    )
    .split(/\s+/)
    .map(
      (word) =>
        word.trim()
    )
    .filter(
      (word) =>
        word.length >= 3 &&
        !STOPWORDS.has(word) &&
        !/^\d+$/.test(word)
    );
}

function topWords(
  title,
  description,
  tags
) {

  const all =
    [
      title,
      description,
      ...(tags || [])
    ]
      .join(" ");

  const counts =
    new Map();

  for (
    const token of tokens(all)
  ) {

    counts.set(
      token,
      (counts.get(token) || 0) + 1
    );
  }

  return [
    ...counts.entries()
  ]
    .sort(
      (a, b) =>
        b[1] - a[1]
    )
    .map(
      ([word]) =>
        word
    )
    .slice(0, 30);
}

function extractHashtags(
  text
) {

  return unique(
    String(text || "")
      .match(
        /#[\p{L}\p{N}_-]+/gu
      ) || []
  );
}

function extractLinks(
  text
) {

  return (
    String(text || "")
      .match(
        /https?:\/\/[^\s<]+/gi
      ) || []
  );
}

function detectChapters(
  description
) {

  const lines =
    String(description || "")
      .split(/\r?\n/);

  const chapters = [];

  for (
    const line of lines
  ) {

    const match =
      line.match(
        /^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+(.+?)\s*$/
      );

    if (!match) {
      continue;
    }

    const hours =
      Number(match[1] || 0);

    const minutes =
      Number(match[2]);

    const seconds =
      Number(match[3]);

    const title =
      match[4];

    chapters.push({
      time:
        match[1]
          ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
          : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,

      title
    });
  }

  return chapters;
}

function titleScore(
  title
) {

  const length =
    String(title || "")
      .trim()
      .length;

  let result = 50;

  if (
    length >= 30 &&
    length <= 70
  ) {
    result += 25;
  } else if (
    length >= 20 &&
    length <= 90
  ) {
    result += 15;
  }

  if (
    /[0-9]/.test(title)
  ) {
    result += 5;
  }

  if (
    /[?!:|-]/.test(title)
  ) {
    result += 5;
  }

  if (
    /how|why|what|guide|tutorial|best|top|tips|complete/i
      .test(title)
  ) {
    result += 10;
  }

  return clamp(result);
}

function descriptionScore(
  description
) {

  const length =
    String(description || "")
      .trim()
      .length;

  let result = 30;

  if (length >= 300) {
    result += 25;
  }

  if (length >= 800) {
    result += 15;
  }

  if (
    extractLinks(description)
      .length
  ) {
    result += 5;
  }

  if (
    extractHashtags(description)
      .length
  ) {
    result += 5;
  }

  if (
    detectChapters(description)
      .length >= 3
  ) {
    result += 10;
  }

  return clamp(result);
}

export function analyzeDescription(
  description
) {

  return {
    characters:
      String(description || "")
        .length,

    words:
      wordCount(description),

    hashtags:
      extractHashtags(
        description
      ).length,

    links:
      extractLinks(
        description
      ).length
  };
}

export function analyzeVideo(
  video
) {

  const words =
    topWords(
      video.title,
      video.description,
      video.tags
    );

  const description =
    analyzeDescription(
      video.description
    );

  const chapters =
    detectChapters(
      video.description
    );

  const primary =
    unique(
      [
        ...(video.tags || [])
          .slice(0, 8),

        ...words.slice(0, 5)
      ]
    ).slice(0, 12);

  const secondary =
    unique(
      words.slice(5, 18)
    );

  const longTail =
    primary
      .slice(0, 8)
      .map(
        (keyword) =>
          `how to ${keyword}`
      );

  const hashtags =
    unique(
      [
        ...extractHashtags(
          video.description
        ),

        ...primary.map(
          (keyword) =>
            `#${keyword.replace(/\s+/g, "")}`
        )
      ]
    ).slice(0, 20);

  const tScore =
    titleScore(
      video.title
    );

  const dScore =
    descriptionScore(
      video.description
    );

  const keywordScore =
    clamp(
      45 +
      Math.min(
        40,
        primary.length * 4
      )
    );

  const structureScore =
    clamp(
      40 +
      (chapters.length >= 3
        ? 25
        : 0) +
      (description.words >= 150
        ? 20
        : 0)
    );

  const contentScore =
    clamp(
      (
        tScore +
        dScore +
        keywordScore +
        structureScore
      ) / 4
    );

  const overall =
    Math.round(
      (
        tScore +
        dScore +
        keywordScore +
        structureScore
      ) / 4
    );

  let searchIntent =
    "Informational";

  if (
    /buy|price|review|best|software|tool|product|course/i
      .test(
        `${video.title} ${video.description}`
      )
  ) {
    searchIntent =
      "Commercial / Investigational";
  }

  if (
    /how|tutorial|guide|learn|explain/i
      .test(
        `${video.title} ${video.description}`
      )
  ) {
    searchIntent =
      "Informational / Educational";
  }

  let contentType =
    "General Video";

  if (
    /tutorial|how to|guide/i
      .test(video.title)
  ) {
    contentType =
      "Tutorial / Guide";
  } else if (
    /review|comparison|vs/i
      .test(video.title)
  ) {
    contentType =
      "Review / Comparison";
  } else if (
    /news|update|latest/i
      .test(video.title)
  ) {
    contentType =
      "News / Update";
  }

  return {

    description,

    chapters,

    keywords: {
      primary,
      secondary,
      longTail,
      hashtags
    },

    seo: {
      overallScore:
        overall,

      titleScore:
        tScore,

      descriptionScore:
        dScore,

      keywordScore,

      structureScore,

      contentScore,

      searchIntent,

      contentType
    }
  };
}