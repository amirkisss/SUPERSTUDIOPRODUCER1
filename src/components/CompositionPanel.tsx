import React, { useState } from 'react';
import { generateComposition } from '../services/gemini';
import { Guitar, Music2, Mic2, Loader2, Copy, Check, PenTool } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

interface CompositionPanelProps {
  lyrics: string;
  compositionResult: string;
  setCompositionResult: (r: string) => void;
  compositionIdea: string;
  setCompositionIdea: (i: string) => void;
}

const MOODS = [
  "Melancholic", "Uplifting", "Aggressive", "Dreamy", "Energetic", "Dark", "Romantic", "Cinematic", "Nostalgic"
];

export default function CompositionPanel({ lyrics, compositionResult, setCompositionResult, compositionIdea, setCompositionIdea }: CompositionPanelProps) {
  const { t } = useLanguage();
  const [selectedMood, setSelectedMood] = useState('Melancholic');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateComposition(lyrics, selectedMood, compositionIdea);
      if (res) setCompositionResult(res);
    } catch (err) {
      console.error(err);
      setError("Failed to generate composition. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(compositionResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto pr-2">
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
          <PenTool size={14} /> {t('composition.idea.label')}
        </label>
        <textarea
          value={compositionIdea}
          onChange={(e) => setCompositionIdea(e.target.value)}
          placeholder={t('composition.idea.placeholder')}
          className="bg-studio-card border border-studio-border rounded-xl p-4 focus:outline-none focus:border-studio-accent transition-colors h-24 resize-none text-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
          <Mic2 size={14} /> Musical Mood
        </label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(mood => (
            <button
              key={mood}
              onClick={() => setSelectedMood(mood)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                selectedMood === mood 
                  ? 'bg-studio-accent border-studio-accent text-black' 
                  : 'border-studio-border text-studio-muted hover:border-studio-muted'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-studio-accent hover:bg-opacity-90 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        {loading ? t('lyrics.btn.generating') : t('composition.btn.generate')}
      </button>
      {error && <p className="text-xs text-red-500 text-center font-mono">{error}</p>}

      <div className="flex-1 bg-studio-card border border-studio-border rounded-xl p-6 overflow-y-auto relative">
        <label className="text-xs uppercase tracking-widest text-studio-muted font-mono mb-4 block">{t('composition.result.label')}</label>
        {!compositionResult && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-studio-muted text-center p-8">
            <Music2 size={48} className="mb-4 opacity-20" />
            <p>Choose a mood and click generate.</p>
          </div>
        )}
        
        {compositionResult && (
          <div className="prose prose-invert max-w-none">
            <div className="flex justify-end mb-4">
              <button 
                onClick={copyToClipboard}
                className="bg-studio-border hover:bg-studio-accent hover:text-black p-2 rounded-lg transition-all flex items-center gap-2 text-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Composition'}
              </button>
            </div>
            <ReactMarkdown>{compositionResult}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
