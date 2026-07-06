import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const SYSTEM_PROMPT = `You are an expert AI image prompt engineer. Analyze the provided image in extreme detail and generate a comprehensive prompt that could be used to recreate a highly similar image using AI image generation tools like Midjourney, DALL-E, Stable Diffusion, or Google Imagen.

Your response MUST be a valid JSON object with EXACTLY this structure:
{
  "prompt": "The complete, detailed generation prompt (2-5 sentences)",
  "negativePrompt": "Things to avoid/exclude from the image",
  "style": "Primary art style (e.g. photorealistic, oil painting, digital art, anime, etc.)",
  "mood": "Emotional tone (e.g. dramatic, serene, ethereal, gritty, etc.)",
  "composition": "Compositional notes (e.g. wide shot, close-up portrait, rule of thirds, etc.)",
  "lighting": "Lighting description (e.g. golden hour, studio lighting, neon-lit, etc.)",
  "colorPalette": "Dominant colors (e.g. warm earth tones, cool blues, monochrome, etc.)",
  "suggestedTools": ["Midjourney", "DALL-E 3"]
}

Be extremely specific and descriptive. Include camera angles, lens types, artistic styles, color grading, textures, and atmosphere. The prompt should be production-ready.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY environment variable is not set. Please add it to your .env.local file." },
        { status: 500 }
      );
    }

    // Safety check log for debugging Vercel environment variable corruptions (without exposing the whole key)
    console.log("[generate-prompt] API Key diagnostic:", {
      length: apiKey.length,
      prefix: apiKey.slice(0, 6) + "...",
      suffix: "..." + apiKey.slice(-6),
      hasWhitespace: /\s/.test(apiKey),
      hasNewlines: /\n|\r/.test(apiKey)
    });

    const genAI = new GoogleGenerativeAI(apiKey.trim());
    const body = await req.json();
    const { imageUrl, imageBase64, mimeType } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: "Either imageUrl or imageBase64 is required." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    let imagePart: { inlineData: { data: string; mimeType: string } };

    if (imageUrl) {
      // Fetch the image server-side so the API key is never exposed to the client
      const imageRes = await fetch(imageUrl, {
        headers: { "User-Agent": "PixelClean/1.0" },
        signal: AbortSignal.timeout(15000),
      });

      if (!imageRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image from URL (${imageRes.status}): ${imageRes.statusText}` },
          { status: 400 }
        );
      }

      const contentType = imageRes.headers.get("content-type") || "image/jpeg";
      if (!contentType.startsWith("image/")) {
        return NextResponse.json(
          { error: "The URL does not point to a valid image." },
          { status: 400 }
        );
      }

      const buffer = await imageRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      imagePart = { inlineData: { data: base64, mimeType: contentType.split(";")[0] } };
    } else {
      imagePart = {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || "image/jpeg",
        },
      };
    }

    const result = await model.generateContent([SYSTEM_PROMPT, imagePart]);
    const rawText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // Fallback: return raw text as prompt if JSON parsing fails
      parsed = { prompt: rawText, raw: true };
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error("[generate-prompt] Error:", err);
    let message = err instanceof Error ? err.message : "Internal server error";

    // Provide user-friendly messages for common Gemini API errors
    if (message.includes("429") || message.includes("Too Many Requests") || message.includes("Quota exceeded")) {
      message = "API quota exceeded. Your free-tier limit has been reached. Please wait a moment and try again, or upgrade your Google AI plan at https://ai.google.dev.";
    } else if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
      message = "Invalid Gemini API key. Please check your GEMINI_API_KEY in .env or .env.local.";
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
