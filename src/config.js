export const CONFIG = {
  // Replace with your Pollinations App Key from enter.pollinations.ai
  CLIENT_ID: "pk_IVftQZh3J2zUFJ6F",

  // Current application's full URL (assigned by Cloudflare Pages or custom domain)
  // For local development, use 'http://localhost:5173'
  REDIRECT_URI: window.location.origin,

  // Pollinations API base and endpoints
  API_BASE_URL: "https://gen.pollinations.ai",
  AUTH_URL: "https://enter.pollinations.ai/authorize",
  PROFILE_API: "https://gen.pollinations.ai/account/profile",
  BALANCE_API: "https://gen.pollinations.ai/account/balance",
  MODELS_API: "https://gen.pollinations.ai/v1/models",
  CHAT_COMPLETIONS_API: "https://gen.pollinations.ai/v1/chat/completions",
  IMAGE_GENERATIONS_API: "https://gen.pollinations.ai/v1/images/generations",

  // Default models
  DEFAULT_TEXT_MODEL: "openai-fast",
  DEFAULT_IMAGE_MODEL: "flux",
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
