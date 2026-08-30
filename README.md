# YouTube Video Intelligence Analyzer

**YouTube Video Intelligence Analyzer** is a powerful web-based tool designed to analyze publicly available YouTube video information from a single video URL. The project combines the YouTube Data API with optional AI-powered analysis to transform raw video metadata into a detailed, colorful and easy-to-understand intelligence report.

Simply enter a YouTube video URL and the application can retrieve available video metadata such as title, description, channel information, publication date, duration, category, tags, thumbnail, statistics and other supported YouTube Data API information.

The project separates **data collection** from **AI analysis**. The YouTube Data API is responsible for retrieving YouTube-related information, while AI providers such as Gemini, Groq or OpenRouter can optionally analyze that information and generate useful insights including keywords, keyword clusters, topic identification, summaries, SEO analysis, title suggestions, hashtags, content ideas, audience insights and content opportunities.

The application is designed for deployment using **GitHub + Cloudflare Pages + Cloudflare Workers**. The frontend provides a modern responsive dashboard, while the Cloudflare Worker acts as a secure backend API. Sensitive API keys are stored as Cloudflare Worker Secrets and are never exposed in frontend JavaScript.

The analyzer is designed with a modular architecture so additional analysis providers or legally available transcript sources can be added later without changing the main application.

Future features can include multi-level reports, PDF/CSV/JSON export, advanced SEO scoring, keyword clustering, suggested video chapters, Shorts ideas, competitor research, content-gap analysis, thumbnail concepts and AI-generated content strategies.

**Important:** YouTube API data and AI-generated analysis are treated separately. AI-generated insights are interpretations or recommendations and should not be presented as official YouTube data.

## Architecture

GitHub → Cloudflare Pages → Cloudflare Worker → YouTube Data API → Optional AI Analysis → Interactive Report

The project is intended for educational, research, SEO and content-analysis purposes.
