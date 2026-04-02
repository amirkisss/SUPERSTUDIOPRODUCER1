import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe } from 'lucide-react';
import { useLanguage, Language } from '../contexts/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const languages: { code: Language; name: string; native: string }[] = [
  { code: 'he', name: 'Hebrew', native: 'עברית' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ar', name: 'Arabic', native: 'العربية' },
  { code: 'de', name: 'German', native: 'Deutsch' },
  { code: 'fr', name: 'French', native: 'Français' },
  { code: 'ka', name: 'Georgian', native: 'ქართული' },
  { code: 'ru', name: 'Russian', native: 'Русский' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-studio-card border border-studio-border rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-studio-border">
              <div className="flex items-center gap-3">
                <Globe className="text-studio-accent" size={24} />
                <h2 className="text-xl font-bold">{t('settings.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="text-studio-muted hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-studio-muted mb-4">
                {t('settings.language')}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all border ${
                      language === lang.code
                        ? 'bg-studio-accent border-studio-accent text-black font-bold'
                        : 'bg-studio-border/30 border-transparent text-studio-text hover:border-studio-muted'
                    }`}
                  >
                    <span>{lang.native}</span>
                    <span className="text-xs opacity-60">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-studio-border/10">
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-studio-accent text-black font-bold hover:opacity-90 transition-all"
              >
                {t('settings.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
