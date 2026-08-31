const API_BASE =
  window.VIA_API_BASE ||
  "https://youtube-video-intelligence-api.82749sondeep.workers.dev";

let latestReport = null;

const $ = (id) =>
  document.getElementById(id);

const youtubeUrl = $("youtubeUrl");
const analyzeBtn = $("analyzeBtn");
const report = $("report");
const loading = $("loading");
const errorBox = $("errorBox");
const errorMessage = $("errorMessage");

function show(element) {
  if (element) {
    element.classList.remove("hidden");
  }
}

function hide(element) {
  if (element) {
    element.classList.add("hidden");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent =
      value === undefined ||
      value === null ||
      value === ""
        ? "—"
        : value;
  }
}

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN"
  ).format(n);
}

function score(value) {
  const n =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) || 0
      )
    );

  return Math.round(n);
}

function setScore(
  id,
  barId,
  value
) {
  const n = score(value);

  setText(id, `${n}/100`);

  const bar = $(barId);

  if (bar) {
    requestAnimationFrame(() => {
      bar.style.width = `${n}%`;
    });
  }
}

function setProgress(
  scoreId,
  barId,
  value
) {
  const n = score(value);

  setText(scoreId, n);

  const bar = $(barId);

  if (bar) {
    requestAnimationFrame(() => {
      bar.style.width = `${n}%`;
    });
  }
}

function tags(
  elementId,
  values
) {
  const element = $(elementId);

  if (!element) return;

  if (
    !Array.isArray(values) ||
    !values.length
  ) {
    element.innerHTML =
      `<span class="tag">No data</span>`;

    return;
  }

  element.innerHTML =
    values
      .slice(0, 100)
      .map(
        (item) =>
          `<span class="tag">${escapeHtml(item)}</span>`
      )
      .join("");
}

function list(
  elementId,
  values
) {
  const element = $(elementId);

  if (!element) return;

  if (
    !Array.isArray(values) ||
    !values.length
  ) {
    element.innerHTML =
      "<li>No data available</li>";

    return;
  }

  element.innerHTML =
    values
      .slice(0, 30)
      .map(
        (item) =>
          `<li>${escapeHtml(item)}</li>`
      )
      .join("");
}

function orderedList(
  elementId,
  values
) {
  const element = $(elementId);

  if (!element) return;

  if (
    !Array.isArray(values) ||
    !values.length
  ) {
    element.innerHTML =
      "<li>No data available</li>";

    return;
  }

  element.innerHTML =
    values
      .slice(0, 20)
      .map(
        (item) =>
          `<li>${escapeHtml(item)}</li>`
      )
      .join("");
}

function formatDuration(seconds) {
  const s =
    Number(seconds) || 0;

  const hours =
    Math.floor(s / 3600);

  const minutes =
    Math.floor(
      (s % 3600) / 60
    );

  const secs =
    Math.floor(s % 60);

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function parseYouTubeId(url) {
  try {
    const u = new URL(url);

    const hostname =
      u.hostname.toLowerCase();

    if (
      hostname === "youtu.be"
    ) {
      return u.pathname
        .slice(1)
        .split("/")[0] || null;
    }

    if (
      hostname.includes("youtube.com")
    ) {
      if (
        u.pathname === "/watch"
      ) {
        return u.searchParams.get("v");
      }

      if (
        u.pathname.startsWith("/shorts/")
      ) {
        return u.pathname
          .split("/")[2] || null;
      }

      if (
        u.pathname.startsWith("/embed/")
      ) {
        return u.pathname
          .split("/")[2] || null;
      }
    }

    return null;

  } catch {
    return null;
  }
}


/* =========================================================
   LOADING SYSTEM
   ========================================================= */

const loadingStepMessages = [
  "Validating YouTube URL...",
  "Fetching YouTube metadata...",
  "Analyzing SEO and keywords...",
  "Generating AI intelligence...",
  "Building final report..."
];

function resetLoadingSteps() {

  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    const step =
      $(`step${i}`);

    if (!step) continue;

    step.classList.remove(
      "done",
      "active"
    );

    const span =
      step.querySelector("span");

    if (span) {
      span.textContent = "✓";
    }
  }

  const line =
    $("loadingProgressLine");

  if (line) {
    line.style.setProperty(
      "--loading-progress",
      "0%"
    );

    line.classList.remove(
      "complete"
    );
  }

  const loadingText =
    $("loadingText");

  if (loadingText) {
    loadingText.textContent =
      "Preparing analysis...";
  }
}

function setLoadingStep(
  stepNumber,
  text
) {

  const current =
    $(`step${stepNumber}`);

  if (!current) return;

  for (
    let i = 1;
    i <= 5;
    i++
  ) {

    const step =
      $(`step${i}`);

    if (!step) continue;

    if (i < stepNumber) {
      step.classList.add("done");
      step.classList.remove("active");
    }

    else if (i === stepNumber) {
      step.classList.add("active");
      step.classList.remove("done");
    }

    else {
      step.classList.remove(
        "done",
        "active"
      );
    }
  }

  const span =
    current.querySelector("span");

  if (span) {
    span.textContent = "•";
  }

  const loadingText =
    $("loadingText");

  if (loadingText) {
    loadingText.textContent =
      text ||
      loadingStepMessages[
        stepNumber - 1
      ];
  }

  const line =
    $("loadingProgressLine");

  if (line) {

    const percentage =
      Math.max(
        5,
        ((stepNumber - 1) / 5) * 100
      );

    line.style.setProperty(
      "--loading-progress",
      `${percentage}%`
    );

    line.classList.remove(
      "complete"
    );
  }
}

function completeLoadingStep(
  stepNumber
) {

  const step =
    $(`step${stepNumber}`);

  if (!step) return;

  step.classList.remove("active");
  step.classList.add("done");

  const span =
    step.querySelector("span");

  if (span) {
    span.textContent = "✓";
  }

  const line =
    $("loadingProgressLine");

  if (line) {

    const percentage =
      (stepNumber / 5) * 100;

    line.style.setProperty(
      "--loading-progress",
      `${percentage}%`
    );
  }
}

function completeAllLoadingSteps() {

  for (
    let i = 1;
    i <= 5;
    i++
  ) {
    completeLoadingStep(i);
  }

  const line =
    $("loadingProgressLine");

  if (line) {
    line.style.setProperty(
      "--loading-progress",
      "100%"
    );

    line.classList.add(
      "complete"
    );
  }

  const loadingText =
    $("loadingText");

  if (loadingText) {
    loadingText.textContent =
      "Analysis complete!";
  }
}


/* =========================================================
   ANALYZE
   ========================================================= */

async function analyze() {

  const url =
    youtubeUrl.value.trim();

  if (!url) {

    showError(
      "Please paste a YouTube video URL."
    );

    return;
  }

  const videoId =
    parseYouTubeId(url);

  if (!videoId) {

    showError(
      "Invalid YouTube URL. Please use a normal YouTube video, Shorts, or youtu.be URL."
    );

    return;
  }

  hide(errorBox);
  hide(report);

  resetLoadingSteps();

  show(loading);

  analyzeBtn.disabled = true;
  analyzeBtn.classList.add(
    "is-loading"
  );

  const analyzeText =
    $("analyzeText");

  if (analyzeText) {
    analyzeText.textContent =
      "Analyzing...";
  }

  try {

    /* STEP 1 */

    setLoadingStep(
      1,
      "Validating YouTube URL..."
    );

    await sleep(250);

    completeLoadingStep(1);


    /* STEP 2 */

    setLoadingStep(
      2,
      "Fetching YouTube metadata..."
    );

    const response =
      await fetch(
        `${API_BASE}/api/analyze`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            url,
            level: "3"
          })
        }
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      throw new Error(
        "The analysis server returned an invalid response."
      );
    }

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Server returned an error."
      );
    }

    completeLoadingStep(2);


    /* STEP 3 */

    setLoadingStep(
      3,
      "Analyzing SEO and keywords..."
    );

    await sleep(350);

    completeLoadingStep(3);


    /* STEP 4 */

    setLoadingStep(
      4,
      "Generating AI intelligence..."
    );

    await sleep(350);

    completeLoadingStep(4);


    /* STEP 5 */

    setLoadingStep(
      5,
      "Building final report..."
    );

    await sleep(350);

    latestReport = data;

    renderReport(data);

    completeAllLoadingSteps();

    await sleep(450);

    hide(loading);

    show(report);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    hide(loading);

    showError(
      error.message ||
      "Unable to analyze this video."
    );

  } finally {

    analyzeBtn.disabled = false;

    analyzeBtn.classList.remove(
      "is-loading"
    );

    if (analyzeText) {
      analyzeText.textContent =
        "Analyze Video";
    }
  }
}


/* =========================================================
   REPORT
   ========================================================= */

function renderReport(data) {

  const video =
    data.video || {};

  const seo =
    data.seo || {};

  const ai =
    data.ai || {};

  const description =
    data.description || {};

  const keywords =
    data.keywords || {};

  const stats =
    video.statistics || {};


  /* VIDEO */

  setText(
    "videoTitle",
    video.title
  );

  setText(
    "channelName",
    video.channelTitle
  );

  setText(
    "publishedDate",
    video.publishedAt
      ? new Date(
          video.publishedAt
        ).toLocaleString(
          "en-IN",
          {
            dateStyle: "medium"
          }
        )
      : "—"
  );

  setText(
    "duration",
    formatDuration(
      video.durationSeconds
    )
  );

  setText(
    "views",
    number(stats.viewCount)
  );

  setText(
    "likes",
    number(stats.likeCount)
  );

  setText(
    "comments",
    number(stats.commentCount)
  );

  setText(
    "videoId",
    video.id
  );

  setText(
    "category",
    video.categoryTitle
  );

  setText(
    "language",
    video.defaultLanguage ||
      video.defaultAudioLanguage ||
      "Not specified"
  );

  setText(
    "definition",
    video.definition
  );

  setText(
    "dimension",
    video.dimension
  );

  setText(
    "caption",
    video.caption
      ? "Available"
      : "Not available"
  );

  const iframe =
    $("videoFrame");

  if (
    iframe &&
    video.id
  ) {

    iframe.src =
      `https://www.youtube.com/embed/${encodeURIComponent(video.id)}`;
  }

  const watch =
    $("watchVideo");

  if (watch) {

    watch.href =
      video.url ||
      `https://www.youtube.com/watch?v=${video.id}`;
  }


  /* DESCRIPTION */

  setText(
    "descriptionText",
    video.description ||
      "No description available."
  );

  setText(
    "descriptionChars",
    description.characters || 0
  );

  setText(
    "descriptionWords",
    description.words || 0
  );

  setText(
    "descriptionHashtags",
    description.hashtags || 0
  );

  setText(
    "descriptionLinks",
    description.links || 0
  );


  /* SCORES */

  setScore(
    "seoScore",
    "seoScoreBar",
    seo.overallScore
  );

  setScore(
    "titleScore",
    "titleScoreBar",
    seo.titleScore
  );

  setScore(
    "descriptionScore",
    "descriptionScoreBar",
    seo.descriptionScore
  );

  setScore(
    "contentScore",
    "contentScoreBar",
    seo.contentScore
  );

  setProgress(
    "seoTitleScore",
    "seoTitleBar",
    seo.titleScore
  );

  setProgress(
    "seoDescriptionScore",
    "seoDescriptionBar",
    seo.descriptionScore
  );

  setProgress(
    "seoKeywordScore",
    "seoKeywordBar",
    seo.keywordScore
  );

  setProgress(
    "seoStructureScore",
    "seoStructureBar",
    seo.structureScore
  );


  /* SEO */

  setText(
    "searchIntent",
    seo.searchIntent
  );

  setText(
    "contentType",
    seo.contentType
  );


  /* KEYWORDS */

  tags(
    "primaryKeywords",
    keywords.primary
  );

  tags(
    "secondaryKeywords",
    keywords.secondary
  );

  tags(
    "longtailKeywords",
    keywords.longTail
  );

  tags(
    "hashtags",
    keywords.hashtags
  );

  tags(
    "youtubeTags",
    video.tags
  );


  /* CHAPTERS */

  renderChapters(
    data.chapters || []
  );


  /* TRANSCRIPT */

  renderTranscript(
    data.transcript ||
    data.transcripts ||
    video.transcript ||
    null
  );


  /* COPYRIGHT */

  renderCopyright(
    data.copyright ||
    data.copyrightStatus ||
    video.copyright ||
    video.copyrightStatus ||
    null
  );


  /* AI */

  setText(
    "mainTopic",
    ai.mainTopic
  );

  setText(
    "aiContentType",
    ai.contentType
  );

  setText(
    "difficulty",
    ai.difficulty
  );

  setText(
    "aiSearchIntent",
    ai.searchIntent
  );

  setText(
    "summary",
    ai.summary
  );

  list(
    "keyPoints",
    ai.keyPoints
  );

  list(
    "audienceList",
    ai.audience
  );

  renderTone(
    ai.tone
  );

  setText(
    "sentiment",
    ai.sentiment
  );


  /* LEVEL 3 */

  orderedList(
    "shortsIdeas",
    ai.shortsIdeas
  );

  orderedList(
    "blogIdeas",
    ai.blogIdeas
  );

  orderedList(
    "relatedIdeas",
    ai.relatedContentIdeas
  );

  orderedList(
    "faqIdeas",
    ai.faqIdeas
  );

  renderSuggestions(
    "titleSuggestions",
    ai.titleSuggestions
  );

  renderGaps(
    ai.contentGaps
  );

  renderRelatedVideos(
    data.relatedVideos || []
  );


  /* LOCATION */

  renderLocation(
    video.location
  );
}


/* =========================================================
   CHAPTERS
   ========================================================= */

function renderChapters(
  chapters
) {

  const element =
    $("chapters");

  if (!element) return;

  if (
    !Array.isArray(chapters) ||
    !chapters.length
  ) {

    element.innerHTML = `
      <div class="chapter">
        <strong>No chapters found</strong>
        <div>
          Chapters were not detected in the
          public video description.
        </div>
      </div>
    `;

    return;
  }

  element.innerHTML =
    chapters
      .map(
        (chapter) => `
          <div class="chapter">

            <span class="chapter-time">
              ${escapeHtml(chapter.time)}
            </span>

            ${escapeHtml(chapter.title)}

          </div>
        `
      )
      .join("");
}


/* =========================================================
   TRANSCRIPT
   ========================================================= */

function normalizeTranscript(data) {

  if (!data) {
    return null;
  }

  if (
    typeof data === "string"
  ) {
    return {
      text: data,
      language: "Unknown",
      available: true
    };
  }

  if (
    Array.isArray(data)
  ) {

    return {
      segments: data,
      text: data
        .map(
          item =>
            item.text ||
            item.content ||
            ""
        )
        .join(" "),
      language: "Unknown",
      available: true
    };
  }

  return {
    text:
      data.text ||
      data.transcript ||
      data.content ||
      "",
    language:
      data.language ||
      data.lang ||
      "Unknown",
    available:
      data.available !== false
  };
}

function renderTranscript(
  transcript
) {

  const container =
    $("transcriptContainer");

  if (!container) return;

  const data =
    normalizeTranscript(
      transcript
    );

  if (
    !data ||
    data.available === false ||
    !data.text
  ) {

    container.innerHTML = `
      <div class="transcript-empty">

        <div class="transcript-empty-icon">
          🎙️
        </div>

        <div>
          <strong>
            Transcript not available
          </strong>

          <p>
            A public transcript was not returned
            for this video.
          </p>
        </div>

      </div>
    `;

    return;
  }

  const text =
    String(data.text);

  container.innerHTML = `

    <div class="transcript-toolbar">

      <div>
        <strong>
          Transcript
        </strong>

        <span class="transcript-language">
          ${escapeHtml(data.language)}
        </span>
      </div>

      <button
        type="button"
        class="copy-transcript-btn"
        id="copyTranscriptBtn"
      >
        📋 Copy
      </button>

    </div>

    <div
      class="transcript-text"
      id="transcriptText"
    >
      ${escapeHtml(text)}
    </div>

  `;

  const copyButton =
    $("copyTranscriptBtn");

  if (copyButton) {

    copyButton.addEventListener(
      "click",
      async () => {

        try {

          await navigator.clipboard.writeText(
            text
          );

          copyButton.textContent =
            "✓ Copied";

          setTimeout(() => {
            copyButton.textContent =
              "📋 Copy";
          }, 1800);

        } catch {

          copyButton.textContent =
            "Copy failed";
        }
      }
    );
  }
}


/* =========================================================
   COPYRIGHT
   ========================================================= */

function renderCopyright(
  copyright
) {

  const container =
    $("copyrightContainer");

  if (!container) return;

  /*
   * IMPORTANT:
   * Public YouTube metadata normally cannot prove
   * that a video is copyright-free.
   */

  let status =
    "Unknown";

  let title =
    "Copyright status cannot be verified";

  let message =
    "Public YouTube metadata does not reliably prove that a video is copyright-free. Check the rights holder, license and YouTube copyright information before reusing content.";

  let className =
    "copyright-unknown";

  if (copyright) {

    const raw =
      typeof copyright === "string"
        ? copyright
        : (
            copyright.status ||
            copyright.label ||
            copyright.result ||
            ""
          );

    const normalized =
      String(raw)
        .toLowerCase();

    if (
      normalized.includes(
        "copyright free"
      ) ||
      normalized.includes(
        "royalty free"
      ) ||
      normalized === "free"
    ) {

      status =
        "Claimed as free";

      title =
        "Creator indicates free use";

      message =
        "The available data indicates that the creator describes this content as free to use. This is not a legal verification.";

      className =
        "copyright-positive";

    } else if (
      normalized.includes(
        "copyright"
      ) ||
      normalized.includes(
        "claimed"
      )
    ) {

      status =
        "Copyright indicated";

      title =
        "Copyright information detected";

      message =
        "Copyright-related information was detected in the available data. Do not reuse the content unless you have permission or a valid license.";

      className =
        "copyright-warning";
    }
  }

  container.innerHTML = `

    <div class="copyright-box ${className}">

      <div class="copyright-icon">
        ${
          status === "Unknown"
            ? "ⓘ"
            : status === "Copyright indicated"
              ? "©"
              : "✓"
        }
      </div>

      <div class="copyright-content">

        <div class="copyright-heading">

          <strong>
            ${escapeHtml(title)}
          </strong>

          <span class="copyright-status">
            ${escapeHtml(status)}
          </span>

        </div>

        <p>
          ${escapeHtml(message)}
        </p>

      </div>

    </div>

  `;
}


/* =========================================================
   TONE
   ========================================================= */

function renderTone(
  tone
) {

  const element =
    $("toneList");

  if (!element) return;

  if (
    !tone ||
    typeof tone !== "object"
  ) {

    element.innerHTML =
      "<p>No tone analysis.</p>";

    return;
  }

  element.innerHTML =
    Object.entries(tone)
      .slice(0, 8)
      .map(
        ([name, value]) => {

          const n =
            Math.max(
              0,
              Math.min(
                100,
                Number(value) || 0
              )
            );

          return `
            <div class="tone-row">

              <div class="tone-label">

                <span>
                  ${escapeHtml(name)}
                </span>

                <strong>
                  ${n}%
                </strong>

              </div>

              <div class="tone-bar">

                <span
                  style="width:${n}%">
                </span>

              </div>

            </div>
          `;
        }
      )
      .join("");
}


/* =========================================================
   SUGGESTIONS
   ========================================================= */

function renderSuggestions(
  elementId,
  values
) {

  const element =
    $(elementId);

  if (!element) return;

  if (
    !Array.isArray(values) ||
    !values.length
  ) {

    element.innerHTML =
      "<div class='suggestion'>No suggestions.</div>";

    return;
  }

  element.innerHTML =
    values
      .slice(0, 10)
      .map(
        (value, index) => `
          <div class="suggestion">

            <span class="suggestion-number">
              ${index + 1}
            </span>

            ${escapeHtml(value)}

          </div>
        `
      )
      .join("");
}


/* =========================================================
   CONTENT GAPS
   ========================================================= */

function renderGaps(
  values
) {

  const element =
    $("contentGaps");

  if (!element) return;

  if (
    !Array.isArray(values) ||
    !values.length
  ) {

    element.innerHTML =
      "<div class='gap-item'>No major content gaps detected.</div>";

    return;
  }

  element.innerHTML =
    values
      .slice(0, 20)
      .map(
        (value) =>
          `<div class="gap-item">
            ${escapeHtml(value)}
          </div>`
      )
      .join("");
}


/* =========================================================
   RELATED VIDEOS
   ========================================================= */

function renderRelatedVideos(
  videos
) {

  const element =
    $("relatedVideos");

  if (!element) return;

  if (
    !Array.isArray(videos) ||
    !videos.length
  ) {

    element.innerHTML =
      `<div class="related-card-body">
        No related videos available.
      </div>`;

    return;
  }

  element.innerHTML =
    videos
      .slice(0, 12)
      .map(
        (video) => `

          <a
            class="related-card"
            href="${escapeHtml(video.url)}"
            target="_blank"
            rel="noopener noreferrer"
          >

            <img
              src="${escapeHtml(video.thumbnail)}"
              alt="${escapeHtml(video.title)}"
              loading="lazy"
            />

            <div class="related-card-body">

              <div class="related-card-title">
                ${escapeHtml(video.title)}
              </div>

              <div class="related-card-channel">
                ${escapeHtml(
                  video.channelTitle || ""
                )}
              </div>

            </div>

          </a>

        `
      )
      .join("");
}


/* =========================================================
   WORLD MAP
   ========================================================= */

async function loadExternalScript(
  src
) {

  return new Promise(
    (resolve, reject) => {

      if (
        document.querySelector(
          `script[src="${src}"]`
        )
      ) {
        resolve();
        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src = src;
      script.async = true;

      script.onload =
        () => resolve();

      script.onerror =
        () =>
          reject(
            new Error(
              `Failed to load ${src}`
            )
          );

      document.head.appendChild(
        script
      );
    }
  );
}

async function createWorldMap(
  location
) {

  const container =
    $("mapContainer");

  if (!container) return;

  container.innerHTML = `

    <div class="world-map-loading">
      <div class="map-spinner"></div>
      <span>Loading world map...</span>
    </div>

  `;

  try {

    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"
    );

    await loadExternalScript(
      "https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js"
    );

    const response =
      await fetch(
        "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
      );

    if (!response.ok) {
      throw new Error(
        "World map data unavailable."
      );
    }

    const world =
      await response.json();

    container.innerHTML = "";

    const width =
      Math.max(
        300,
        container.clientWidth || 900
      );

    const height =
      window.innerWidth <= 600
        ? 260
        : 430;

    const svg =
      d3.select(container)
        .append("svg")
        .attr(
          "viewBox",
          `0 0 ${width} ${height}`
        )
        .attr(
          "role",
          "img"
        )
        .attr(
          "aria-label",
          "Colorful world map showing video location"
        );

    const defs =
      svg.append("defs");

    const gradient =
      defs
        .append("linearGradient")
        .attr(
          "id",
          "worldMapGradient"
        )
        .attr(
          "x1",
          "0%"
        )
        .attr(
          "y1",
          "0%"
        )
        .attr(
          "x2",
          "100%"
        )
        .attr(
          "y2",
          "100%"
        );

    gradient
      .append("stop")
      .attr(
        "offset",
        "0%"
      )
      .attr(
        "stop-color",
        "#635bff"
      );

    gradient
      .append("stop")
      .attr(
        "offset",
        "35%"
      )
      .attr(
        "stop-color",
        "#06b6d4"
      );

    gradient
      .append("stop")
      .attr(
        "offset",
        "65%"
      )
      .attr(
        "stop-color",
        "#22c55e"
      );

    gradient
      .append("stop")
      .attr(
        "offset",
        "100%"
      )
      .attr(
        "stop-color",
        "#f97316"
      );

    const projection =
      d3.geoNaturalEarth1()
        .fitSize(
          [
            width - 30,
            height - 30
          ],
          {
            type: "Sphere"
          }
        );

    const path =
      d3.geoPath()
        .projection(
          projection
        );

    const countryColors = [
      "#635bff",
      "#06b6d4",
      "#22c55e",
      "#f59e0b",
      "#ec4899",
      "#8b5cf6",
      "#ef4444",
      "#14b8a6"
    ];

    const countries =
      topojson.feature(
        world,
        world.objects.countries
      );

    svg
      .append("rect")
      .attr(
        "width",
        width
      )
      .attr(
        "height",
        height
      )
      .attr(
        "fill",
        "#eef4ff"
      );

    svg
      .append("g")
      .selectAll("path")
      .data(countries.features)
      .join("path")
      .attr(
        "d",
        path
      )
      .attr(
        "fill",
        (d, index) =>
          countryColors[
            index %
              countryColors.length
          ]
      )
      .attr(
        "fill-opacity",
        0.78
      )
      .attr(
        "stroke",
        "#ffffff"
      )
      .attr(
        "stroke-width",
        0.6
      )
      .style(
        "transition",
        "0.2s ease"
      )
      .on(
        "mouseenter",
        function () {
          d3.select(this)
            .attr(
              "fill-opacity",
              1
            );
        }
      )
      .on(
        "mouseleave",
        function () {
          d3.select(this)
            .attr(
              "fill-opacity",
              0.78
            );
        }
      );

    /*
     * LOCATION MARKER
     */

    const lat =
      Number(
        location?.latitude
      );

    const lon =
      Number(
        location?.longitude
      );

    const validLocation =
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180;

    if (validLocation) {

      const point =
        projection([
          lon,
          lat
        ]);

      if (point) {

        const marker =
          svg
            .append("g")
            .attr(
              "class",
              "world-map-marker"
            )
            .attr(
              "transform",
              `translate(${point[0]},${point[1]})`
            );

        marker
          .append("circle")
          .attr(
            "r",
            15
          )
          .attr(
            "fill",
            "#ef4444"
          )
          .attr(
            "fill-opacity",
            0.2
          )
          .attr(
            "class",
            "marker-pulse"
          );

        marker
          .append("circle")
          .attr(
            "r",
            7
          )
          .attr(
            "fill",
            "#ef4444"
          )
          .attr(
            "stroke",
            "#ffffff"
          )
          .attr(
            "stroke-width",
            3
          );

        marker
          .append("title")
          .text(
            `Video location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`
          );
      }
    }

    const info =
      document.createElement(
        "div"
      );

    info.className =
      "map-info-overlay";

    if (validLocation) {

      info.innerHTML = `
        <span class="map-info-dot"></span>
        <strong>Public location detected</strong>
        <span>
          ${lat.toFixed(4)}, ${lon.toFixed(4)}
        </span>
      `;

    } else {

      info.innerHTML = `
        <span class="map-info-dot map-info-dot-muted"></span>
        <strong>No public location data</strong>
        <span>
          World map shown for geographic context
        </span>
      `;
    }

    container.appendChild(
      info
    );

  } catch (error) {

    container.innerHTML = `

      <div class="map-fallback">

        <div class="map-icon">
          🌍
        </div>

        <h3>
          World map unavailable
        </h3>

        <p>
          Geographic map data could not be loaded.
        </p>

        ${
          location
            ? `
              <strong>
                ${escapeHtml(
                  location.latitude
                )},
                ${escapeHtml(
                  location.longitude
                )}
              </strong>
            `
            : `
              <span>
                No public location data available.
              </span>
            `
        }

      </div>

    `;
  }
}

function renderLocation(
  location
) {

  createWorldMap(
    location
  );
}


/* =========================================================
   ERROR
   ========================================================= */

function showError(
  message
) {

  if (errorMessage) {
    errorMessage.textContent =
      message;
  }

  show(errorBox);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   UTILITY
   ========================================================= */

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}


/* =========================================================
   SAMPLE
   ========================================================= */

if ($("exampleBtn")) {

  $("exampleBtn")
    .addEventListener(
      "click",
      () => {

        youtubeUrl.value =
          "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

        youtubeUrl.focus();
      }
    );
}


/* =========================================================
   ANALYZE BUTTON
   ========================================================= */

if (analyzeBtn) {

  analyzeBtn
    .addEventListener(
      "click",
      analyze
    );
}


/* =========================================================
   ENTER KEY
   ========================================================= */

if (youtubeUrl) {

  youtubeUrl
    .addEventListener(
      "keydown",
      (event) => {

        if (
          event.key === "Enter"
        ) {

          event.preventDefault();

          analyze();
        }

      }
    );
}


/* =========================================================
   EXPORT JSON
   ========================================================= */

if ($("exportJsonBtn")) {

  $("exportJsonBtn")
    .addEventListener(
      "click",
      () => {

        if (!latestReport) {

          showError(
            "Analyze a video first."
          );

          return;
        }

        const blob =
          new Blob(
            [
              JSON.stringify(
                latestReport,
                null,
                2
              )
            ],
            {
              type:
                "application/json"
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const a =
          document.createElement(
            "a"
          );

        a.href = url;

        a.download =
          "youtube-video-intelligence-report.json";

        document.body.appendChild(a);

        a.click();

        a.remove();

        setTimeout(
          () =>
            URL.revokeObjectURL(
              url
            ),
          1000
        );
      }
    );
}


/* =========================================================
   PRINT
   ========================================================= */

if ($("printBtn")) {

  $("printBtn")
    .addEventListener(
      "click",
      () => {

        if (!latestReport) {

          showError(
            "Analyze a video first."
          );

          return;
        }

        window.print();
      }
    );
}


/* =========================================================
   MOBILE MENU
   ========================================================= */

const sidebar =
  $("sidebar");

const overlay =
  $("sidebarOverlay");

if ($("menuToggle")) {

  $("menuToggle")
    .addEventListener(
      "click",
      () => {

        if (!sidebar) return;

        sidebar.classList.toggle(
          "open"
        );

        if (overlay) {
          overlay.classList.toggle(
            "show"
          );
        }

        document.body.classList.toggle(
          "menu-open"
        );
      }
    );
}

if (overlay) {

  overlay
    .addEventListener(
      "click",
      () => {

        if (sidebar) {
          sidebar.classList.remove(
            "open"
          );
        }

        overlay.classList.remove(
          "show"
        );

        document.body.classList.remove(
          "menu-open"
        );
      }
    );
}


/* =========================================================
   CLOSE MOBILE MENU AFTER NAVIGATION
   ========================================================= */

document
  .querySelectorAll(
    ".menu-item, .menu-button"
  )
  .forEach(
    (item) => {

      item.addEventListener(
        "click",
        () => {

          if (
            window.innerWidth <= 850
          ) {

            if (sidebar) {
              sidebar.classList.remove(
                "open"
              );
            }

            if (overlay) {
              overlay.classList.remove(
                "show"
              );
            }

            document.body.classList.remove(
              "menu-open"
            );
          }
        }
      );

    }
  );