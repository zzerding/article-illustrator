import { CONFIG, IMAGE_GENERATION_DEFAULTS, STORAGE_KEYS } from './config';

const parsePositiveInteger = (value, fallback) => {
  if (value === null || String(value).trim() === '') return fallback;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseInteger = (value, fallback) => {
  if (value === null || String(value).trim() === '') return fallback;
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const readReferenceImage = () => {
  const raw = localStorage.getItem(STORAGE_KEYS.REFERENCE_IMAGE);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.url === 'string' && parsed.url.trim()) {
      return parsed;
    }
  } catch (error) {
    console.warn('Invalid reference image metadata', error);
  }

  localStorage.removeItem(STORAGE_KEYS.REFERENCE_IMAGE);
  return null;
};

export const persistReferenceImage = (image) => {
  if (!image?.url) {
    localStorage.removeItem(STORAGE_KEYS.REFERENCE_IMAGE);
    return;
  }

  localStorage.setItem(STORAGE_KEYS.REFERENCE_IMAGE, JSON.stringify(image));
};

export const readImageGenerationSettings = () => ({
  model: localStorage.getItem(STORAGE_KEYS.IMAGE_MODEL) || CONFIG.DEFAULT_IMAGE_MODEL,
  width: parsePositiveInteger(
    localStorage.getItem(STORAGE_KEYS.IMAGE_WIDTH),
    IMAGE_GENERATION_DEFAULTS.width
  ),
  height: parsePositiveInteger(
    localStorage.getItem(STORAGE_KEYS.IMAGE_HEIGHT),
    IMAGE_GENERATION_DEFAULTS.height
  ),
  seed: parseInteger(
    localStorage.getItem(STORAGE_KEYS.IMAGE_SEED),
    IMAGE_GENERATION_DEFAULTS.seed
  ),
  enhance: localStorage.getItem(STORAGE_KEYS.IMAGE_ENHANCE) === 'true',
  referenceImage: readReferenceImage(),
});
