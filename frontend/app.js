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
  element.classList.remove("hidden");
}

function hide(element) {
  element.classList.add("hidden");
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

  return new Intl.NumberFormat(
    "en-IN"
  ).format(Number(value));
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
    bar.style.width = `${n}%`;
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
    bar.style.width = `${n}%`;
  }
}

function tags(
  elementId,
  values
) {
  const element = $(elementId);

  if (!element) return;

  if (!Array.isArray(values) || !values.length) {
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

  if (!Array.isArray(values) || !values.length) {
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

  if (!Array.isArray(values) || !values.length) {
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

    if (
      u.hostname === "youtu.be"
    ) {
      return u.pathname.slice(1);
    }

    if (
      u.hostname.includes("youtube.com")
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
          .split("/")[2];
      }

      if (
        u.pathname.startsWith("/embed/")
      ) {
        return u.pathname
          .split("/")[2];
      }
    }

    return null;
  } catch {
    return null;
  }
}

function setLoadingStep(
  number,
  text
) {
  const step =
    $(`step${number}`);

  if (!step) return;

  step.classList.add("done");

  const span =
    step.querySelector("span");

  if (span) {
    span.textContent = "✓";
  }

  $("loadingText").textContent =
    text;
}

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

  show(loading);

  analyzeBtn.disabled = true;

  $("analyzeText").textContent =
    "Analyzing...";

  try {

    setLoadingStep(
      1,
      "Validating YouTube URL..."
    );

    await sleep(250);

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

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Server returned an error."
      );
    }

    setLoadingStep(
      3,
      "Analyzing SEO and keywords..."
    );

    await sleep(250);

    setLoadingStep(
      4,
      "Generating AI intelligence..."
    );

    await sleep(250);

    setLoadingStep(
      5,
      "Building final report..."
    );

    await sleep(250);

    latestReport = data;

    renderReport(data);

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

    $("analyzeText").textContent =
      "Analyze Video";
  }
}

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

  iframe.src =
    `https://www.youtube.com/embed/${encodeURIComponent(video.id)}`;

  const watch =
    $("watchVideo");

  watch.href =
    video.url ||
    `https://www.youtube.com/watch?v=${video.id}`;

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

  renderLocation(
    video.location
  );
}

function renderChapters(
  chapters
) {

  const element =
    $("chapters");

  if (!chapters.length) {

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

function renderTone(
  tone
) {

  const element =
    $("toneList");

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

function renderSuggestions(
  elementId,
  values
) {

  const element =
    $(elementId);

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

function renderGaps(
  values
) {

  const element =
    $("contentGaps");

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

function renderRelatedVideos(
  videos
) {

  const element =
    $("relatedVideos");

  if (
    !Array.isArray(videos) ||
    !videos.length
  ) {

    element.innerHTML =
      "<div class='related-card-body'>No related videos available.</div>";

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
                ${escapeHtml(video.channelTitle || "")}
              </div>

            </div>

          </a>
        `
      )
      .join("");
}

function renderLocation(
  location
) {

  const container =
    $("mapContainer");

  if (
    !location ||
    !location.latitude ||
    !location.longitude
  ) {

    container.innerHTML = `
      <div class="map-placeholder">

        <div class="map-icon">
          🗺️
        </div>

        <h3>
          No public location data
        </h3>

        <p>
          The analyzed video's public metadata
          does not contain usable geographic coordinates.
        </p>

      </div>
    `;

    return;
  }

  const lat =
    Number(location.latitude);

  const lon =
    Number(location.longitude);

  const bbox =
    [
      lon - 0.08,
      lat - 0.05,
      lon + 0.08,
      lat + 0.05
    ].join("%2C");

  container.innerHTML = `
    <iframe
      title="Video location"
      style="
        width:100%;
        height:360px;
        border:0;
      "
      src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}"
    ></iframe>
  `;
}

function showError(
  message
) {

  errorMessage.textContent =
    message;

  show(errorBox);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

/* SAMPLE */

$("exampleBtn")
  .addEventListener(
    "click",
    () => {

      youtubeUrl.value =
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

      youtubeUrl.focus();
    }
  );

/* ANALYZE */

analyzeBtn
  .addEventListener(
    "click",
    analyze
  );

youtubeUrl
  .addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {
        analyze();
      }

    }
  );

/* EXPORT */

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
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        "youtube-video-intelligence-report.json";

      a.click();

      URL.revokeObjectURL(url);
    }
  );

/* PRINT */

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

/* MOBILE MENU */

const sidebar =
  $("sidebar");

const overlay =
  $("sidebarOverlay");

$("menuToggle")
  .addEventListener(
    "click",
    () => {

      sidebar.classList.toggle(
        "open"
      );

      overlay.classList.toggle(
        "show"
      );
    }
  );

overlay
  .addEventListener(
    "click",
    () => {

      sidebar.classList.remove(
        "open"
      );

      overlay.classList.remove(
        "show"
      );
    }
  );