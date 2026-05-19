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
  IMAGE_GENERATE_API: "https://gen.pollinations.ai/image",
  IMAGE_MODELS_API: "https://gen.pollinations.ai/image/models",
  MEDIA_UPLOAD_API: "https://media.pollinations.ai/upload",

  // Default models
  DEFAULT_TEXT_MODEL: "openai-fast",
  DEFAULT_IMAGE_MODEL: "zimage",
};

export const STORAGE_KEYS = {
  TEXT_MODEL: "pollen_text_model",
  IMAGE_MODEL: "pollen_image_model",
  IMAGE_WIDTH: "pollen_image_width",
  IMAGE_HEIGHT: "pollen_image_height",
  IMAGE_SEED: "pollen_image_seed",
  IMAGE_ENHANCE: "pollen_image_enhance",
  REFERENCE_IMAGE: "pollen_reference_image",
  PARAGRAPHS: "pollen_paragraphs",
  ARTICLE_TEXT: "pollen_article_text",
};

export const IMAGE_GENERATION_DEFAULTS = {
  width: 1024,
  height: 576,
  seed: -1,
  enhance: false,
};

export const MAX_REFERENCE_IMAGE_BYTES = 50 * 1024 * 1024;

export const STYLE_PROMPTS = {
  photo:
    "photorealistic, professional photography, high detail, 8k resolution, authentic lighting",
  illustration:
    "editorial illustration, flat design, clean lines, modern aesthetic, professional graphics",
  painting:
    "oil painting, artistic texture, rich brushstrokes, classical art style",
  free: "", // No style hint, let AI decide
};
