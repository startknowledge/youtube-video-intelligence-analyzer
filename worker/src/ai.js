
import {
  safeJsonParse
} from "./utils.js";

const SYSTEM_PROMPT = `
You are YouTube Video Intelligence Analyzer.

Analyze ONLY the information supplied by the application.

Do not invent:
- views
- likes
- comments
- transcript content
- private analytics
- revenue
- CTR
- watch time
- audience demographics

If information is unavailable, clearly say "Not available".

Return ONLY valid JSON.

Required JSON schema:

{
  "mainTopic": "",
  "contentType": "",
  "difficulty": "",
  "searchIntent": "",
  "summary": "",
  "keyPoints": [],
  "audience": [],
  "tone": {
    "Educational": 0,
    "Professional": 0,
    "Persuasive": 0,
    "Entertainment": 0,
    "Inspirational": 0
  },
  "sentiment": "",
  "shortsIdeas": [],
  "blogIdeas": [],
  "relatedContentIdeas": [],
  "faqIdeas": [],
  "titleSuggestions": [],
  "contentGaps": []
}

Keep arrays concise and useful.

Do not claim that AI-generated keyword scores are official
YouTube ranking scores.

Clearly distinguish inference from official metadata.
`;

function buildPrompt(
  video,
  analysis
) {

  return `
Analyze this YouTube video.

VIDEO:

Title:
${video.title}

Channel:
${video.channelTitle}

Category:
${video.categoryTitle}

Published:
${video.publishedAt}

Duration seconds:
${video.durationSeconds}

Description:
${video.description}

YouTube Tags:
${JSON.stringify(video.tags || [])}

Statistics:
${JSON.stringify(video.statistics || {})}

Detected chapters:
${JSON.stringify(analysis.chapters || [])}

SEO analysis:
${JSON.stringify(analysis.seo || {})}

Keywords:
${JSON.stringify(analysis.keywords || {})}

Description analysis:
${JSON.stringify(analysis.description || {})}

Create practical intelligence for a YouTube creator.

Again:
ONLY valid JSON.
`;
}


/* =========================================================
   GEMINI
   ========================================================= */

async function callGemini(
  prompt,
  env
) {

  const apiKey =
    env.YOUTUBEVIDEOANALYZER_GEMINI_API_KEY;

  /*
    IMPORTANT:
    If Gemini secret is not configured,
    throw immediately so fallback can continue.
  */

  if (!apiKey) {

    throw new Error(
      "YOUTUBEVIDEOANALYZER_GEMINI_API_KEY missing"
    );
  }

  const model =
    env.AI_GEMINI_MODEL ||
    "gemini-2.5-flash";

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          systemInstruction: {
            parts: [
              {
                text:
                  SYSTEM_PROMPT
              }
            ]
          },

          contents: [
            {
              role: "user",

              parts: [
                {
                  text:
                    prompt
                }
              ]
            }
          ],

          generationConfig: {

            temperature:
              0.25,

            responseMimeType:
              "application/json"
          }
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `Gemini error ${response.status}`
    );
  }

  const text =
    data?.candidates?.[0]
      ?.content?.parts
      ?.map(
        (part) =>
          part.text || ""
      )
      .join("") || "";

  const parsed =
    safeJsonParse(text);

  if (!parsed) {

    throw new Error(
      "Gemini returned invalid JSON"
    );
  }

  return {

    provider:
      "Gemini",

    model,

    data:
      parsed
  };
}


/* =========================================================
   OPENAI-COMPATIBLE PROVIDERS
   ========================================================= */

async function callOpenAICompatible(
  endpoint,
  apiKey,
  model,
  prompt,
  provider
) {

  if (!apiKey) {

    throw new Error(
      `${provider} API key missing`
    );
  }

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${apiKey}`
        },

        body: JSON.stringify({

          model,

          messages: [

            {
              role: "system",

              content:
                SYSTEM_PROMPT
            },

            {
              role: "user",

              content:
                prompt
            }
          ],

          temperature:
            0.25,

          max_tokens:
            6000,

          response_format: {
            type:
              "json_object"
          }
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      `${provider} error ${response.status}`
    );
  }

  const text =
    data?.choices?.[0]
      ?.message?.content ||
    "";

  const parsed =
    safeJsonParse(text);

  if (!parsed) {

    throw new Error(
      `${provider} returned invalid JSON`
    );
  }

  return {

    provider,

    model,

    data:
      parsed
  };
}


/* =========================================================
   GROQ
   ========================================================= */

async function callGroq(
  prompt,
  env
) {

  return callOpenAICompatible(

    "https://api.groq.com/openai/v1/chat/completions",

    env.YOUTUBEVIDEOANALYZER_GROQ_API_KEY,

    env.AI_GROQ_MODEL ||
      "llama-3.3-70b-versatile",

    prompt,

    "Groq"
  );
}


/* =========================================================
   OPENROUTER
   ========================================================= */

async function callOpenRouter(
  prompt,
  env
) {

  return callOpenAICompatible(

    "https://openrouter.ai/api/v1/chat/completions",

    env.YOUTUBEVIDEOANALYZER_OPENROUTER_API_KEY,

    env.AI_OPENROUTER_MODEL ||
      "openai/gpt-oss-20b",

    prompt,

    "OpenRouter"
  );
}


/* =========================================================
   OPENAI
   ========================================================= */

async function callOpenAI(
  prompt,
  env
) {

  return callOpenAICompatible(

    "https://api.openai.com/v1/chat/completions",

    env.YOUTUBEVIDEOANALYZER_OPENAI_API_KEY,

    env.AI_OPENAI_MODEL ||
      "gpt-4o-mini",

    prompt,

    "OpenAI"
  );
}


/* =========================================================
   MAIN AI FALLBACK ENGINE
   ========================================================= */

export async function generateAI(
  video,
  analysis,
  env
) {

  const prompt =
    buildPrompt(
      video,
      analysis
    );

  const attempts =
    [];

  /*
    FIXED FALLBACK ORDER:

    1. Gemini
    2. Groq
    3. OpenRouter
    4. OpenAI
    5. Local heuristic fallback
  */

  const providers = [

    {
      name:
        "gemini",

      call: () =>
        callGemini(
          prompt,
          env
        )
    },

    {
      name:
        "groq",

      call: () =>
        callGroq(
          prompt,
          env
        )
    },

    {
      name:
        "openrouter",

      call: () =>
        callOpenRouter(
          prompt,
          env
        )
    },

    {
      name:
        "openai",

      call: () =>
        callOpenAI(
          prompt,
          env
        )
    }
  ];


  /*
    Optional primary provider.

    If AI_PRIMARY is set, that provider
    gets tried first.

    After it fails, the remaining
    providers continue in the normal
    fallback order.
  */

  const primary =
    (
      env.AI_PRIMARY ||
      "gemini"
    ).toLowerCase();

  providers.sort(
    (a, b) => {

      if (
        a.name === primary
      ) {
        return -1;
      }

      if (
        b.name === primary
      ) {
        return 1;
      }

      return 0;
    }
  );


  /*
    Try providers one by one.
  */

  for (
    const provider of providers
  ) {

    try {

      const result =
        await provider.call();

      return {

        ...result,

        fallbackUsed:
          attempts.length > 0,

        attempts
      };

    } catch (error) {

      console.error(
        `AI PROVIDER FAILED: ${provider.name}`,
        error
      );

      attempts.push({

        provider:
          provider.name,

        error:
          error?.message ||
          "Unknown provider error"
      });
    }
  }


  /*
    ALL AI PROVIDERS FAILED
    -----------------------
    Do not fail the whole YouTube analysis.

    Return local heuristic analysis.
  */

  return {

    provider:
      "Local heuristic fallback",

    model:
      "none",

    fallbackUsed:
      true,

    attempts,

    data:
      createLocalFallback(
        video,
        analysis
      )
  };
}


/* =========================================================
   LOCAL FALLBACK
   ========================================================= */

function createLocalFallback(
  video,
  analysis
) {

  const primary =
    analysis
      ?.keywords
      ?.primary ||
      [];

  return {

    mainTopic:
      video.title,

    contentType:
      analysis?.seo?.contentType ||
      "General Video",

    difficulty:
      "Not available",

    searchIntent:
      analysis?.seo?.searchIntent ||
      "Informational",

    summary:
      video.description
        ? video.description.slice(
            0,
            700
          )
        : "AI analysis unavailable.",

    keyPoints: [

      `Video title: ${video.title}`,

      `Channel: ${video.channelTitle}`,

      `Category: ${video.categoryTitle}`,

      ...primary
        .slice(0, 5)
        .map(
          (k) =>
            `Important keyword: ${k}`
        )
    ],

    audience: [
      "Audience could not be reliably inferred."
    ],

    tone: {

      Educational:
        50,

      Professional:
        50,

      Persuasive:
        25,

      Entertainment:
        25,

      Inspirational:
        25
    },

    sentiment:
      "Not reliably determined",

    shortsIdeas:
      primary
        .slice(0, 5)
        .map(
          (k) =>
            `Create a short explaining ${k}`
        ),

    blogIdeas:
      primary
        .slice(0, 5)
        .map(
          (k) =>
            `${k}: complete guide`
        ),

    relatedContentIdeas:
      primary
        .slice(0, 5)
        .map(
          (k) =>
            `Advanced ${k} tutorial`
        ),

    faqIdeas:
      primary
        .slice(0, 5)
        .map(
          (k) =>
            `What is ${k}?`
        ),

    titleSuggestions: [

      `${video.title} - Complete Guide`,

      `Everything You Need to Know About ${video.title}`,

      `${video.title}: Beginner to Advanced Guide`
    ],

    contentGaps: [

      "Add a detailed beginner explanation.",

      "Add practical examples.",

      "Add frequently asked questions.",

      "Add a clear conclusion and next steps."
    ]
  };
}
