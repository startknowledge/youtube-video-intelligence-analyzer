import {
  json,
  corsResponse,
  errorResponse,
  extractVideoId
} from "./utils.js";

import {
  getVideo,
  getRelatedVideos
} from "./youtube.js";

import {
  analyzeVideo
} from "./analyzer.js";

import {
  generateAI
} from "./ai.js";

import {
  fetchTranscript
} from "./transcript.js";

export default {

  async fetch(
    request,
    env
  ) {

    if (
      request.method === "OPTIONS"
    ) {
      return corsResponse();
    }

    const url =
      new URL(
        request.url
      );

    /* HEALTH */

    if (
      request.method === "GET" &&
      url.pathname === "/"
    ) {

      return json({
        ok: true,

        service:
          "YouTube Video Intelligence Analyzer",

        version:
          "1.0.0",

        status:
          "online"
      });
    }

    /* HEALTH API */

    if (
      request.method === "GET" &&
      url.pathname === "/api/health"
    ) {

      return json({

        ok: true,

        youtubeConfigured:
          Boolean(
            env.YOUTUBEVIDEOANALYZER_YOUTUBE_API_KEY
          ),

        geminiConfigured:
          Boolean(
            env.YOUTUBEVIDEOANALYZER_GEMINI_API_KEY
          ),

        groqConfigured:
          Boolean(
            env.YOUTUBEVIDEOANALYZER_GROQ_API_KEY
          ),

        openrouterConfigured:
          Boolean(
            env.YOUTUBEVIDEOANALYZER_OPENROUTER_API_KEY
          ),

        openaiConfigured:
          Boolean(
            env.YOUTUBEVIDEOANALYZER_OPENAI_API_KEY
          ),

        aiEnabled:
          env.YOUTUBEVIDEOANALYZER_AI_ENABLED !==
          "false",

        relatedSearchEnabled:
          env.YOUTUBEVIDEOANALYZER_YOUTUBE_RELATED_SEARCH !==
          "false"
      });
    }

    /* ANALYZE */

    if (
      request.method === "POST" &&
      url.pathname === "/api/analyze"
    ) {

      return analyzeRequest(
        request,
        env
      );
    }

    return errorResponse(
      "Endpoint not found.",
      404
    );
  }

};

async function analyzeRequest(
  request,
  env
) {

  try {

    /* YOUTUBE API CHECK */

    if (
      !env.YOUTUBEVIDEOANALYZER_YOUTUBE_API_KEY
    ) {

      return errorResponse(
        "YouTube API key is not configured on the Worker.",
        500
      );
    }

    const body =
      await request.json();

    const input =
      body?.url?.trim();

    const level =
      String(
        body?.level || "3"
      );

    if (!input) {

      return errorResponse(
        "YouTube URL is required.",
        400
      );
    }

    const videoId =
      extractVideoId(input);

    if (!videoId) {

      return errorResponse(
        "Invalid YouTube video URL.",
        400
      );
    }

    /* STEP 1: YOUTUBE */

    const video =
      await getVideo(
        videoId,
        env.YOUTUBEVIDEOANALYZER_YOUTUBE_API_KEY
      );

    /* STEP 2: LOCAL ANALYSIS */

    const analysis =
      analyzeVideo(
        video
      );

    /* STEP 3: RELATED VIDEOS */

    let relatedVideos = [];

    if (
      env.YOUTUBEVIDEOANALYZER_YOUTUBE_RELATED_SEARCH !==
      "false"
    ) {

      try {

        const query =
          [
            video.title,
            ...(
              analysis
                ?.keywords
                ?.primary || []
            )
          ]
            .join(" ")
            .slice(0, 350);

        relatedVideos =
          await getRelatedVideos(
            query,
            env.YOUTUBEVIDEOANALYZER_YOUTUBE_API_KEY
          );

      } catch (error) {

        console.error(
          "RELATED VIDEO ERROR:",
          error
        );

        relatedVideos = [];
      }
    }

        /* STEP 3.5: TRANSCRIPT */

    let transcript = null;

    try {

      transcript =
        await fetchTranscript(videoId);

      if (transcript) {

        console.log(
          `Transcript fetched for ${videoId}: ${transcript.wordCount} words`
        );

      } else {

        console.log(
          `No transcript found for ${videoId}`
        );
      }

    } catch (error) {

      console.error(
        "TRANSCRIPT ERROR:",
        error
      );

      transcript = null;
    }

    /* STEP 4: AI */

    let ai = {

      provider:
        "Disabled",

      model:
        "none",

      fallbackUsed:
        false,

      data: {},

      attempts: []
    };

    if (
      env.YOUTUBEVIDEOANALYZER_AI_ENABLED !==
      "false"
    ) {

      const aiResult =
        await generateAI(
          video,
          analysis,
          env
        );

      ai = {

        provider:
          aiResult.provider,

        model:
          aiResult.model,

        fallbackUsed:
          aiResult.fallbackUsed,

        data:
          aiResult.data,

        attempts:
          aiResult.attempts || []
      };
    }

    return json({

      ok: true,

      analyzedAt:
        new Date().toISOString(),

      level,

      video,

      description:
        analysis.description,

      seo:
        analysis.seo,

      keywords:
        analysis.keywords,

      chapters:
        analysis.chapters,

      transcript,

      relatedVideos,

      ai:
        ai.data,

      aiMeta: {

        provider:
          ai.provider,

        model:
          ai.model,

        fallbackUsed:
          ai.fallbackUsed,

        attempts:
          ai.attempts
      }
    });

  } catch (error) {

    console.error(
      "ANALYZE ERROR:",
      error
    );

    return errorResponse(
      error?.message ||
      "Unexpected analysis error.",
      500
    );
  }
}