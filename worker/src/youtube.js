import {
  parseDuration
} from "./utils.js";

const API =
  "https://www.googleapis.com/youtube/v3";

async function youtubeRequest(
  endpoint,
  params,
  apiKey
) {

  const url =
    new URL(
      `${API}/${endpoint}`
    );

  Object.entries(
    {
      ...params,
      key: apiKey
    }
  ).forEach(
    ([key, value]) => {

      if (
        value !== undefined &&
        value !== null
      ) {
        url.searchParams.set(
          key,
          String(value)
        );
      }
    }
  );

  const response =
    await fetch(url);

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `YouTube API error ${response.status}`
    );
  }

  return data;
}

export async function getVideo(
  videoId,
  apiKey
) {

  const data =
    await youtubeRequest(
      "videos",
      {
        part:
          "snippet,contentDetails,statistics,status,recordingDetails",
        id: videoId
      },
      apiKey
    );

  if (
    !data.items ||
    !data.items.length
  ) {
    throw new Error(
      "Video not found, private, removed, or unavailable."
    );
  }

  const item =
    data.items[0];

  const snippet =
    item.snippet || {};

  const details =
    item.contentDetails || {};

  const statistics =
    item.statistics || {};

  const recording =
    item.recordingDetails || {};

  let categoryTitle =
    "Unknown";

  if (
    snippet.categoryId
  ) {

    try {

      const categories =
        await youtubeRequest(
          "videoCategories",
          {
            part: "snippet",
            id: snippet.categoryId
          },
          apiKey
        );

      categoryTitle =
        categories
          ?.items?.[0]
          ?.snippet
          ?.title ||
        snippet.categoryId;

    } catch {
      categoryTitle =
        snippet.categoryId;
    }
  }

  return {

    id: item.id,

    url:
      `https://www.youtube.com/watch?v=${item.id}`,

    title:
      snippet.title || "",

    description:
      snippet.description || "",

    channelId:
      snippet.channelId || "",

    channelTitle:
      snippet.channelTitle || "",

    publishedAt:
      snippet.publishedAt || "",

    categoryId:
      snippet.categoryId || "",

    categoryTitle,

    tags:
      snippet.tags || [],

    defaultLanguage:
      snippet.defaultLanguage || "",

    defaultAudioLanguage:
      snippet.defaultAudioLanguage || "",

    liveBroadcastContent:
      snippet.liveBroadcastContent ||
      "none",

    thumbnail:
      snippet.thumbnails?.maxres?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      "",

    duration:
      details.duration || "",

    durationSeconds:
      parseDuration(
        details.duration
      ),

    dimension:
      details.dimension || "",

    definition:
      details.definition || "",

    caption:
      details.caption === "true",

    licensedContent:
      Boolean(
        details.licensedContent
      ),

    statistics: {
      viewCount:
        statistics.viewCount || 0,

      likeCount:
        statistics.likeCount || 0,

      commentCount:
        statistics.commentCount || 0,

      favoriteCount:
        statistics.favoriteCount || 0
    },

    status: {
      embeddable:
        item.status?.embeddable !== false,

      privacyStatus:
        item.status?.privacyStatus || ""
    },

    location: {
      latitude:
        recording.location?.latitude ??
        null,

      longitude:
        recording.location?.longitude ??
        null
    }

  };
}

export async function getRelatedVideos(
  query,
  apiKey
) {

  if (!query) {
    return [];
  }

  const data =
    await youtubeRequest(
      "search",
      {
        part: "snippet",
        q: query,
        type: "video",
        maxResults: 12
      },
      apiKey
    );

  return (
    data.items || []
  )
    .map(
      (item) => {

        const id =
          item.id?.videoId;

        if (!id) {
          return null;
        }

        return {
          id,

          title:
            item.snippet?.title ||
            "",

          channelTitle:
            item.snippet?.channelTitle ||
            "",

          publishedAt:
            item.snippet?.publishedAt ||
            "",

          description:
            item.snippet?.description ||
            "",

          thumbnail:
            item.snippet
              ?.thumbnails
              ?.high
              ?.url ||
            item.snippet
              ?.thumbnails
              ?.medium
              ?.url ||
            "",

          url:
            `https://www.youtube.com/watch?v=${id}`
        };
      }
    )
    .filter(Boolean);
}