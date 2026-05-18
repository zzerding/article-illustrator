import { useState, useEffect, useRef } from 'react';
import { Settings2, Type, Image, Check, ChevronDown, Loader2, Upload, X, SlidersHorizontal } from 'lucide-react';
import {
  CONFIG,
  IMAGE_GENERATION_DEFAULTS,
  MAX_REFERENCE_IMAGE_BYTES,
  STORAGE_KEYS
} from '../config';
import { persistReferenceImage, readImageGenerationSettings } from '../imageSettings';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const FALLBACK_TEXT_MODELS = [
  { id: 'openai-fast' },
  { id: 'openai' },
];

const FALLBACK_IMAGE_MODELS = [
  { id: 'zimage' },
  { id: 'flux' },
  { id: 'gptimage' },
];

const getModelList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.models)) return payload.models;
  throw new Error('Unexpected models response shape');
};

const normalizeModel = (model) => {
  if (typeof model === 'string') {
    return { id: model };
  }

  const id = model?.id || model?.name;
  return id ? { ...model, id } : null;
};

const normalizeModels = (models) => models.map(normalizeModel).filter(Boolean);

const isTextModel = (model) =>
  model.output_modalities?.includes('text') &&
  (
    model.supported_endpoints?.includes('/v1/chat/completions') ||
    model.supported_endpoints?.includes('/text/{prompt}')
  );

const isImageModel = (model) =>
  !Array.isArray(model.output_modalities) ||
  model.output_modalities.includes('image');

const dispatchSettingsChanged = () => {
  window.dispatchEvent(new Event('pollen_settings_changed'));
};

const formatBytes = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const ModelSettings = () => {
  const { t } = useTranslation();
  const { apiKey, logout } = useAuth();
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [textModels, setTextModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [selectedTextModel, setSelectedTextModel] = useState(
    localStorage.getItem(STORAGE_KEYS.TEXT_MODEL) || CONFIG.DEFAULT_TEXT_MODEL
  );
  const [selectedImageModel, setSelectedImageModel] = useState(
    localStorage.getItem(STORAGE_KEYS.IMAGE_MODEL) || CONFIG.DEFAULT_IMAGE_MODEL
  );
  const [imageSettings, setImageSettings] = useState(() => {
    const stored = readImageGenerationSettings();
    return {
      width: String(stored.width),
      height: String(stored.height),
      seed: String(stored.seed),
      enhance: stored.enhance,
      referenceImage: stored.referenceImage,
    };
  });

  useEffect(() => {
    let isCancelled = false;

    const fetchTextModels = async () => {
      const res = await fetch(CONFIG.MODELS_API);
      if (!res.ok) throw new Error('Failed to fetch text models');
      const payload = await res.json();
      return normalizeModels(getModelList(payload)).filter(isTextModel);
    };

    const fetchImageModels = async () => {
      const res = await fetch(CONFIG.IMAGE_MODELS_API);
      if (!res.ok) throw new Error('Failed to fetch image models');
      const payload = await res.json();
      return normalizeModels(getModelList(payload)).filter(isImageModel);
    };

    const fetchModels = async () => {
      setLoading(true);
      const [textResult, imageResult] = await Promise.allSettled([
        fetchTextModels(),
        fetchImageModels(),
      ]);

      if (isCancelled) return;

      if (textResult.status === 'fulfilled' && textResult.value.length > 0) {
        setTextModels(textResult.value);
      } else {
        if (textResult.status === 'rejected') {
          console.error('Failed to load text models', textResult.reason);
        }
        setTextModels(FALLBACK_TEXT_MODELS);
      }

      if (imageResult.status === 'fulfilled' && imageResult.value.length > 0) {
        setImageModels(imageResult.value);
      } else {
        if (imageResult.status === 'rejected') {
          console.error('Failed to load image models', imageResult.reason);
        }
        setImageModels(FALLBACK_IMAGE_MODELS);
      }

      setLoading(false);
    };

    fetchModels().catch((error) => {
      if (!isCancelled) {
        console.error('Failed to load models', error);
        setTextModels(FALLBACK_TEXT_MODELS);
        setImageModels(FALLBACK_IMAGE_MODELS);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const persistSetting = (key, value) => {
    localStorage.setItem(key, String(value));
    dispatchSettingsChanged();
  };

  const handleSelectText = (id) => {
    setSelectedTextModel(id);
    persistSetting(STORAGE_KEYS.TEXT_MODEL, id);
  };

  const handleSelectImage = (id) => {
    setSelectedImageModel(id);
    persistSetting(STORAGE_KEYS.IMAGE_MODEL, id);
  };

  const handleNumberChange = (field, storageKey, value) => {
    setImageSettings((prev) => ({ ...prev, [field]: value }));
    persistSetting(storageKey, value);
  };

  const normalizeNumberSetting = (field, storageKey, fallback, requirePositive = false) => {
    const raw = imageSettings[field];
    const parsed = String(raw).trim() === '' ? NaN : Math.floor(Number(raw));
    const normalized = Number.isFinite(parsed) && (!requirePositive || parsed > 0)
      ? parsed
      : fallback;

    setImageSettings((prev) => ({ ...prev, [field]: String(normalized) }));
    persistSetting(storageKey, normalized);
  };

  const handleEnhanceToggle = () => {
    const next = !imageSettings.enhance;
    setImageSettings((prev) => ({ ...prev, enhance: next }));
    persistSetting(STORAGE_KEYS.IMAGE_ENHANCE, next);
  };

  const setReferenceImage = (referenceImage) => {
    setImageSettings((prev) => ({ ...prev, referenceImage }));
    persistReferenceImage(referenceImage);
    dispatchSettingsChanged();
  };

  const handleReferenceUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadError(null);

    if (!apiKey) {
      setUploadError(t('common.upload_login_required'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError(t('common.upload_invalid_file'));
      return;
    }

    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      setUploadError(t('common.upload_file_too_large'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const res = await fetch(CONFIG.MEDIA_UPLOAD_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (res.status === 401) {
        logout();
        throw new Error('UNAUTHORIZED');
      }
      if (res.status === 413) {
        throw new Error('FILE_TOO_LARGE');
      }
      if (res.status === 403) {
        throw new Error('FORBIDDEN');
      }
      if (!res.ok) {
        throw new Error('UPLOAD_FAILED');
      }

      const data = await res.json();
      if (!data?.url) {
        throw new Error('UPLOAD_FAILED');
      }

      setReferenceImage({
        url: data.url,
        id: data.id || null,
        contentType: data.contentType || file.type,
        size: Number(data.size || file.size),
        duplicate: Boolean(data.duplicate),
        name: file.name,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error.message === 'FILE_TOO_LARGE') {
        setUploadError(t('common.upload_file_too_large'));
      } else if (error.message === 'FORBIDDEN') {
        setUploadError(t('common.error_forbidden'));
      } else if (error.message !== 'UNAUTHORIZED') {
        setUploadError(t('common.upload_failed'));
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-text/5 bg-white/50 group"
      >
        <Settings2 className={`w-4 h-4 text-text/40 group-hover:text-primary transition-colors ${isOpen ? 'text-primary' : ''}`} />
        <span className="text-[10px] font-bold text-text/60 uppercase tracking-widest hidden sm:block">{t('common.settings')}</span>
        <ChevronDown className={`w-3 h-3 text-text/20 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-100 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="p-4 flex flex-col gap-5 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">

              {/* Text Model Selection */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text/30 uppercase tracking-widest">
                  <Type className="w-3 h-3" />
                  {t('common.text_model')}
                </div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {textModels.length === 0 && !loading && (
                    <button
                      type="button"
                      onClick={() => handleSelectText(CONFIG.DEFAULT_TEXT_MODEL)}
                      className="text-left px-2 py-1.5 rounded-md text-xs font-medium bg-primary/5 text-primary border border-primary/10"
                    >
                      {CONFIG.DEFAULT_TEXT_MODEL} (Default)
                    </button>
                  )}
                  {textModels.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectText(m.id)}
                      className={`text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex flex-col gap-0.5 group ${
                        selectedTextModel === m.id ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50 text-text/70'
                      }`}
                      title={m.description || m.id}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate pr-2">{m.id}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.paid_only && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">PRO</span>}
                          {selectedTextModel === m.id && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      {m.description && (
                        <span className="text-[9px] opacity-40 truncate w-full font-normal">
                          {m.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Model Selection */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text/30 uppercase tracking-widest">
                  <Image className="w-3 h-3" />
                  {t('common.image_model')}
                </div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                  {imageModels.length === 0 && !loading && (
                    <button
                      type="button"
                      onClick={() => handleSelectImage(CONFIG.DEFAULT_IMAGE_MODEL)}
                      className="text-left px-2 py-1.5 rounded-md text-xs font-medium bg-primary/5 text-primary border border-primary/10"
                    >
                      {CONFIG.DEFAULT_IMAGE_MODEL} (Default)
                    </button>
                  )}
                  {imageModels.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectImage(m.id)}
                      className={`text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex flex-col gap-0.5 group ${
                        selectedImageModel === m.id ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50 text-text/70'
                      }`}
                      title={m.description || m.id}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate pr-2">{m.id}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {m.paid_only && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">PRO</span>}
                          {selectedImageModel === m.id && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                      {m.description && (
                        <span className="text-[9px] opacity-40 truncate w-full font-normal">
                          {m.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Generation Settings */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text/30 uppercase tracking-widest">
                  <SlidersHorizontal className="w-3 h-3" />
                  {t('common.image_settings')}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-text/35 uppercase tracking-wider">
                      {t('common.image_width')}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={imageSettings.width}
                      onChange={(event) => handleNumberChange('width', STORAGE_KEYS.IMAGE_WIDTH, event.target.value)}
                      onBlur={() => normalizeNumberSetting('width', STORAGE_KEYS.IMAGE_WIDTH, IMAGE_GENERATION_DEFAULTS.width, true)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-text/35 uppercase tracking-wider">
                      {t('common.image_height')}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={imageSettings.height}
                      onChange={(event) => handleNumberChange('height', STORAGE_KEYS.IMAGE_HEIGHT, event.target.value)}
                      onBlur={() => normalizeNumberSetting('height', STORAGE_KEYS.IMAGE_HEIGHT, IMAGE_GENERATION_DEFAULTS.height, true)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-text/35 uppercase tracking-wider">
                      {t('common.image_seed')}
                    </span>
                    <input
                      type="number"
                      step="1"
                      value={imageSettings.seed}
                      onChange={(event) => handleNumberChange('seed', STORAGE_KEYS.IMAGE_SEED, event.target.value)}
                      onBlur={() => normalizeNumberSetting('seed', STORAGE_KEYS.IMAGE_SEED, IMAGE_GENERATION_DEFAULTS.seed)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-xs font-medium text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    />
                  </label>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-text/35 uppercase tracking-wider">
                      {t('common.image_enhance')}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={imageSettings.enhance}
                      onClick={handleEnhanceToggle}
                      className={`h-[30px] rounded-md border px-2 text-xs font-bold transition-colors flex items-center justify-between ${
                        imageSettings.enhance
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-slate-200 bg-white text-text/40'
                      }`}
                    >
                      <span>{imageSettings.enhance ? 'ON' : 'OFF'}</span>
                      <span className={`h-3.5 w-3.5 rounded-full transition-colors ${
                        imageSettings.enhance ? 'bg-primary' : 'bg-slate-200'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Reference Image Upload */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[10px] font-bold text-text/30 uppercase tracking-widest">
                  <Image className="w-3 h-3" />
                  {t('common.reference_image')}
                </div>

                {imageSettings.referenceImage && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2">
                    <img
                      src={imageSettings.referenceImage.url}
                      alt={t('common.reference_image')}
                      className="h-12 w-16 rounded-md object-cover bg-white border border-slate-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-text/70">
                        {imageSettings.referenceImage.name || imageSettings.referenceImage.url}
                      </p>
                      <p className="text-[10px] text-text/35">
                        {[imageSettings.referenceImage.contentType, formatBytes(imageSettings.referenceImage.size)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReferenceImage(null)}
                      className="p-1 text-text/30 hover:text-red-500 transition-colors"
                      title={t('common.clear_reference')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReferenceUpload}
                />
                <button
                  type="button"
                  disabled={!apiKey || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-bold text-text/60 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {imageSettings.referenceImage ? t('common.replace_reference') : t('common.upload_reference')}
                </button>

                {!apiKey && (
                  <p className="text-[10px] text-text/35">
                    {t('common.upload_login_required')}
                  </p>
                )}
                {uploadError && (
                  <p className="text-[10px] font-medium text-red-500">
                    {uploadError}
                  </p>
                )}
              </div>

              {loading && (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSettings;
