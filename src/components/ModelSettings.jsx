import { useState, useEffect } from 'react';
import { Settings2, Type, Image, Check, ChevronDown, Loader2 } from 'lucide-react';
import { CONFIG } from '../config';
import { useTranslation } from 'react-i18next';

const FALLBACK_TEXT_MODELS = [
  { id: 'openai-fast' },
  { id: 'openai' },
];

const FALLBACK_IMAGE_MODELS = [
  { id: 'flux' },
  { id: 'gptimage' },
];

const getModelList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error('Unexpected models response shape');
};

const ModelSettings = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [textModels, setTextModels] = useState([]);
  const [imageModels, setImageModels] = useState([]);

  const [selectedTextModel, setSelectedTextModel] = useState(
    localStorage.getItem('pollen_text_model') || CONFIG.DEFAULT_TEXT_MODEL
  );
  const [selectedImageModel, setSelectedImageModel] = useState(
    localStorage.getItem('pollen_image_model') || CONFIG.DEFAULT_IMAGE_MODEL
  );

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      try {
        const res = await fetch(CONFIG.MODELS_API);
        if (!res.ok) throw new Error('Failed to fetch models');
        const payload = await res.json();
        const models = getModelList(payload);

        // Filter text models: output_modalities contains 'text', supports chat completions or /text/{prompt}
        const text = models.filter(m =>
          m.output_modalities?.includes('text') &&
          (m.supported_endpoints?.includes('/v1/chat/completions') || m.supported_endpoints?.includes('/text/{prompt}'))
        );

        // Filter image models: output_modalities contains 'image', supports images generations or /image/{prompt}
        const image = models.filter(m =>
          m.output_modalities?.includes('image') &&
          (m.supported_endpoints?.includes('/v1/images/generations') || m.supported_endpoints?.includes('/image/{prompt}'))
        );

        setTextModels(text);
        setImageModels(image);
      } catch (e) {
        console.error('Failed to load models', e);
        setTextModels(FALLBACK_TEXT_MODELS);
        setImageModels(FALLBACK_IMAGE_MODELS);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleSelectText = (id) => {
    setSelectedTextModel(id);
    localStorage.setItem('pollen_text_model', id);
    // Custom event to notify other components if needed,
    // but here we'll just read from localStorage in EditorPage
    window.dispatchEvent(new Event('pollen_settings_changed'));
  };

  const handleSelectImage = (id) => {
    setSelectedImageModel(id);
    localStorage.setItem('pollen_image_model', id);
    window.dispatchEvent(new Event('pollen_settings_changed'));
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
          <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-100 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="p-4 flex flex-col gap-5">

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
