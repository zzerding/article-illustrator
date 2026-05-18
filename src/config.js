export const CONFIG = {
  // Replace with your Pollinations App Key from enter.pollinations.ai
  CLIENT_ID: "pk_IVftQZh3J2zUFJ6F",

  // Current application's full URL (assigned by Cloudflare Pages or custom domain)
  // For local development, use 'http://localhost:5173'
  REDIRECT_URI: window.location.origin,

  // Pollinations API endpoints
  AUTH_URL: "https://enter.pollinations.ai/authorize",
  TEXT_API: "https://text.pollinations.ai/openai",
  IMAGE_API: "https://image.pollinations.ai/prompt",
  USERINFO_API: "https://enter.pollinations.ai/api/device/userinfo",
};

export const STYLE_PROMPTS = {
  photo:
    "photorealistic, professional photography, high detail, 8k resolution, authentic lighting",
  illustration:
    "editorial illustration, flat design, clean lines, modern aesthetic, professional graphics",
  painting:
    "oil painting, artistic texture, rich brushstrokes, classical art style",
  free: "", // No style hint, let AI decide
};
