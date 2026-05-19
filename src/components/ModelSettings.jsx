import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings2, Type, Image, Check, ChevronDown, Loader2, Upload, X, SlidersHorizontal, Search, Shuffle } from 'lucide-react';
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

const ModelDropdown = ({ label, icon: Icon, models, selectedId, onSelect, search, onSearchChange, loading, t }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModel = useMemo(() => models.find(m => m.id === selectedId) || { id: selectedId }, [models, selectedId]);

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <div className="flex items-center gap-2 text-[11px] sm:text-[10px] font-bold text-text/40 uppercase tracking-widest">
        <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
        {label}
      </div>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-primary/20 transition-all group"
        >
          <span className="text-xs font-bold text-text/70 truncate group-hover:text-primary transition-colors">
            {selectedModel.id}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-text/30 group-hover:text-primary/50 transition-all ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={t('common.search_models') || 'Search models...'}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-9 py-2 text-xs font-medium outline-none focus:border-primary/30 transition-all"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {models.length === 0 && !loading && (
                <div className="text-center py-4 text-xs text-text/30 italic">
                  {t('common.no_models_found') || 'No models found'}
                </div>
              )}
              {models.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    onSelect(m.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-medium transition-colors flex flex-col gap-0.5 group border ${
                    selectedId === m.id ? 'bg-primary/5 text-primary border-primary/10' : 'hover:bg-slate-50 text-text/70 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="truncate pr-2">{m.id}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.paid_only && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 rounded font-bold">PRO</span>}
                      {selectedId === m.id && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                  {m.description && (
                    <span className="text-[10px] opacity-40 truncate w-full font-normal">
                      {m.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ModelSettings = ({ inline = false }) => {
  const { t } = useTranslation();
  const { apiKey, logout } = useAuth();
  const fileInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [textModels, setTextModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const [textSearch, setTextSearch] = useState('');
  const [imageSearch, setImageSearch] = useState('');

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

  const filteredTextModels = useMemo(() => {
    return textModels.filter(m => 
      m.id.toLowerCase().includes(textSearch.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(textSearch.toLowerCase()))
    );
  }, [textModels, textSearch]);

  const filteredImageModels = useMemo(() => {
    return imageModels.filter(m => 
      m.id.toLowerCase().includes(imageSearch.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(imageSearch.toLowerCase()))
    );
  }, [imageModels, imageSearch]);

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

  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    setImageSettings(prev => ({ ...prev, seed: String(newSeed) }));
    persistSetting(STORAGE_KEYS.IMAGE_SEED, newSeed);
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

  const settingsContent = (
    <div className={`flex flex-col gap-10 sm:gap-6 ${inline ? 'p-6' : 'p-6'}`}>
      {/* Text Model Selection */}
      <ModelDropdown
        label={t('common.text_model')}
        icon={Type}
        models={filteredTextModels}
        selectedId={selectedTextModel}
        onSelect={handleSelectText}
        search={textSearch}
        onSearchChange={setTextSearch}
        loading={loading}
        t={t}
      />

      {/* Image Model Selection */}
      <ModelDropdown
        label={t('common.image_model')}
        icon={Image}
        models={filteredImageModels}
        selectedId={selectedImageModel}
        onSelect={handleSelectImage}
        search={imageSearch}
        onSearchChange={setImageSearch}
        loading={loading}
        t={t}
      />

      {/* Image Generation Settings */}
      <div className="flex flex-col gap-5 sm:gap-3">
        <div className="flex items-center gap-2 text-[11px] sm:text-[10px] font-bold text-text/30 uppercase tracking-widest">
          <SlidersHorizontal className="w-4 h-4 sm:w-3 h-3" />
          {t('common.image_settings')}
        </div>

        <div className="grid grid-cols-2 gap-5 sm:gap-3">
          <label className="flex flex-col gap-2 sm:gap-1">
            <span className="text-[11px] sm:text-[9px] font-bold text-text/35 uppercase tracking-wider">
              {t('common.image_width')}
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={imageSettings.width}
              onChange={(event) => handleNumberChange('width', STORAGE_KEYS.IMAGE_WIDTH, event.target.value)}
              onBlur={() => normalizeNumberSetting('width', STORAGE_KEYS.IMAGE_WIDTH, IMAGE_GENERATION_DEFAULTS.width, true)}
              className="w-full rounded-2xl sm:rounded-md border border-slate-200 px-4 py-4 sm:px-3 sm:py-1.5 text-base sm:text-xs font-medium text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </label>

          <label className="flex flex-col gap-2 sm:gap-1">
            <span className="text-[11px] sm:text-[9px] font-bold text-text/35 uppercase tracking-wider">
              {t('common.image_height')}
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={imageSettings.height}
              onChange={(event) => handleNumberChange('height', STORAGE_KEYS.IMAGE_HEIGHT, event.target.value)}
              onBlur={() => normalizeNumberSetting('height', STORAGE_KEYS.IMAGE_HEIGHT, IMAGE_GENERATION_DEFAULTS.height, true)}
              className="w-full rounded-2xl sm:rounded-md border border-slate-200 px-4 py-4 sm:px-3 sm:py-1.5 text-base sm:text-xs font-medium text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </label>

          <label className="flex flex-col gap-2 sm:gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-[9px] font-bold text-text/35 uppercase tracking-wider">
                {t('common.image_seed')}
              </span>
              <button 
                onClick={handleRandomizeSeed}
                className="p-1 hover:text-primary transition-colors"
                title="Randomize Global Seed"
              >
                <Shuffle className="w-3 h-3 text-text/20 hover:text-primary" />
              </button>
            </div>
            <input
              type="number"
              step="1"
              value={imageSettings.seed}
              onChange={(event) => handleNumberChange('seed', STORAGE_KEYS.IMAGE_SEED, event.target.value)}
              onBlur={() => normalizeNumberSetting('seed', STORAGE_KEYS.IMAGE_SEED, IMAGE_GENERATION_DEFAULTS.seed)}
              className="w-full rounded-2xl sm:rounded-md border border-slate-200 px-4 py-4 sm:px-3 sm:py-1.5 text-base sm:text-xs font-medium text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
            />
          </label>

          <div className="flex flex-col gap-2 sm:gap-1">
            <span className="text-[11px] sm:text-[9px] font-bold text-text/35 uppercase tracking-wider">
              {t('common.image_enhance')}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={imageSettings.enhance}
              onClick={handleEnhanceToggle}
              className={`h-14 sm:h-[30px] rounded-2xl sm:rounded-md border px-4 sm:px-3 text-base sm:text-xs font-bold transition-colors flex items-center justify-between ${
                imageSettings.enhance
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-text/40'
              }`}
            >
              <span>{imageSettings.enhance ? 'ON' : 'OFF'}</span>
              <span className={`h-5 w-5 sm:h-3.5 sm:w-3.5 rounded-full transition-colors ${
                imageSettings.enhance ? 'bg-primary' : 'bg-slate-200'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Reference Image Upload */}
      <div className="flex flex-col gap-5 sm:gap-2">
        <div className="flex items-center gap-2 text-[11px] sm:text-[10px] font-bold text-text/30 uppercase tracking-widest">
          <Image className="w-4 h-4 sm:w-3 h-3" />
          {t('common.reference_image')}
        </div>

        {imageSettings.referenceImage && (
          <div className="flex items-center gap-4 sm:gap-3 rounded-[1.5rem] sm:rounded-lg border border-slate-100 bg-slate-50 p-4 sm:p-2">
            <img
              src={imageSettings.referenceImage.url}
              alt={t('common.reference_image')}
              className="h-16 w-16 sm:h-12 sm:w-16 rounded-2xl sm:rounded-md object-cover bg-white border border-slate-100 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm sm:text-xs font-semibold text-text/70">
                {imageSettings.referenceImage.name || imageSettings.referenceImage.url}
              </p>
              <p className="text-xs sm:text-[10px] text-text/35">
                {[imageSettings.referenceImage.contentType, formatBytes(imageSettings.referenceImage.size)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReferenceImage(null)}
              className="p-3 sm:p-1 text-text/30 hover:text-red-500 transition-colors"
              title={t('common.clear_reference')}
            >
              <X className="w-6 h-6 sm:w-3.5 sm:h-3.5" />
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
          className="flex items-center justify-center gap-2 rounded-2xl sm:rounded-md border border-slate-200 px-6 py-4 sm:py-2 text-base sm:text-xs font-bold text-text/60 transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 sm:w-3.5 sm:h-3.5 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 sm:w-3.5 sm:h-3.5" />
          )}
          {imageSettings.referenceImage ? t('common.replace_reference') : t('common.upload_reference')}
        </button>

        {!apiKey && (
          <p className="text-xs sm:text-[10px] text-text/35 text-center sm:text-left">
            {t('common.upload_login_required')}
          </p>
        )}
        {uploadError && (
          <p className="text-xs sm:text-[10px] font-medium text-red-500 text-center sm:text-left">
            {uploadError}
          </p>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4 sm:py-2">
          <Loader2 className="w-6 h-6 sm:w-4 sm:h-4 text-primary animate-spin" />
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
        {settingsContent}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all border group shadow-sm hover:shadow-md active:scale-95 ${
          isOpen
            ? 'bg-primary border-primary text-white'
            : 'bg-white/80 backdrop-blur-sm border-slate-200 text-text/80 hover:bg-white hover:border-primary/30'
        }`}
      >
        <Settings2 className={`w-4 h-4 transition-colors ${isOpen ? 'text-white' : 'text-text/60 group-hover:text-primary'}`} />
        <span className="text-xs font-bold uppercase tracking-widest">{t('common.settings')}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-text/30 group-hover:text-primary/50'}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Settings Drawer (Mobile) */}
          <div className="fixed inset-y-0 right-0 w-[85%] max-w-sm bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-bold text-text">
                {t('common.settings')}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-6 h-6 text-text/40" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="min-h-full flex flex-col">
                {settingsContent}
              </div>
            </div>

            {/* Drawer Footer (Optional: Logout button on mobile) */}
            {apiKey && (
              <div className="p-6 border-t border-slate-100 shrink-0">
                <button
                  onClick={logout}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 text-base font-bold transition-colors active:bg-red-100"
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ModelSettings;
