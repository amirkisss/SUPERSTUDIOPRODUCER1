import React, { useState, useRef, useEffect } from 'react';
import { generateLyrics, processWord, refineLyrics, vocalizeLyrics } from '../services/gemini';
import { Sparkles, Type as TypeIcon, Languages, ChevronDown, Loader2, Replace, SpellCheck, Copy, Check, Wand2, Trash2, Plus, User, UserCheck } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

interface LyricsEditorProps {
  lyrics: string;
  setLyrics: (l: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  language: string;
  setLanguage: (l: string) => void;
}

export default function LyricsEditor({ lyrics, setLyrics, topic, setTopic, language, setLanguage }: LyricsEditorProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{ word: string; index: number } | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [vocalizing, setVocalizing] = useState(false);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [error, setError] = useState<string | null>(null);
  const [newWordInput, setNewWordInput] = useState('');
  const [manualWordInput, setManualWordInput] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setError(null);
    try {
      const result = await generateLyrics(topic, language, lyrics, gender);
      if (result) setLyrics(result);
    } catch (err) {
      console.error(err);
      setError("Failed to generate lyrics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVocalize = async () => {
    if (!lyrics) return;
    setVocalizing(true);
    setError(null);
    try {
      const result = await vocalizeLyrics(lyrics, gender);
      if (result) setLyrics(result);
    } catch (err) {
      console.error(err);
      setError("Failed to vocalize lyrics. Please try again.");
    } finally {
      setVocalizing(false);
    }
  };

  const handleRefine = async () => {
    if (!lyrics) return;
    setRefining(true);
    setError(null);
    try {
      const result = await refineLyrics(lyrics, language, topic, gender);
      if (result) setLyrics(result);
    } catch (err) {
      console.error(err);
      setError("Failed to refine lyrics. Please try again.");
    } finally {
      setRefining(false);
    }
  };

  const handleWordClick = (e: React.MouseEvent, word: string, index: number) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    
    // Calculate position relative to container
    setPopupPosition({
      top: rect.bottom - containerRect.top + 10,
      left: Math.min(rect.left - containerRect.left, containerRect.width - 260) // Keep within bounds
    });

    // Clean word from punctuation for AI processing
    const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    setSelectedWord({ word: cleanWord, index });
    setManualWordInput(word); // Set initial value for manual editing
    setSuggestions([]);
    setShowAddInput(false);
    setNewWordInput('');
  };

  const getSuggestions = async (action: 'replace' | 'nikud') => {
    if (!selectedWord) return;
    setSuggestionLoading(true);
    try {
      const result = await processWord(selectedWord.word, action, lyrics);
      setSuggestions(result.suggestions || [result.explanation]);
    } catch (error) {
      console.error(error);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const replaceWordInLyrics = (newWord: string) => {
    if (!selectedWord) return;
    const parts = lyrics.split(/(\s+)/);
    // The index in selectedWord refers to the index in the split array
    parts[selectedWord.index] = newWord;
    setLyrics(parts.join(''));
    setSelectedWord(null);
  };

  const deleteWord = () => {
    if (!selectedWord) return;
    const parts = lyrics.split(/(\s+)/);
    // Remove the word at the index
    parts.splice(selectedWord.index, 1);
    // Also remove the following whitespace if it exists to avoid double spaces
    if (parts[selectedWord.index] && parts[selectedWord.index].match(/^\s+$/)) {
      parts.splice(selectedWord.index, 1);
    }
    setLyrics(parts.join(''));
    setSelectedWord(null);
  };

  const addWordAfter = () => {
    if (!selectedWord || !newWordInput) return;
    const parts = lyrics.split(/(\s+)/);
    // Insert after the word (and its following whitespace if it exists)
    let insertIndex = selectedWord.index + 1;
    // If the next part is whitespace, insert after the whitespace
    if (parts[insertIndex] && parts[insertIndex].match(/^\s+$/)) {
      insertIndex++;
    }
    parts.splice(insertIndex, 0, " " + newWordInput);
    setLyrics(parts.join(''));
    setSelectedWord(null);
    setNewWordInput('');
    setShowAddInput(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(lyrics);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono">{t('lyrics.topic.label')}</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('lyrics.topic.placeholder')}
            className="bg-studio-card border border-studio-border rounded-lg p-3 focus:outline-none focus:border-studio-accent transition-colors h-24 resize-none"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono">{t('lyrics.lang.label')}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-studio-card border border-studio-border rounded-lg p-3 focus:outline-none focus:border-studio-accent appearance-none cursor-pointer"
          >
            <option>Hebrew</option>
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>Arabic</option>
            <option>Russian</option>
            <option>Georgian</option>
            <option>Armenian</option>
          </select>
          <div className="flex flex-col gap-2 mt-auto">
            {language === 'Hebrew' && (
              <div className="flex flex-col gap-2 mb-2 p-2 bg-studio-border/30 rounded-lg">
                <label className="text-[10px] uppercase tracking-widest text-studio-muted font-mono flex items-center gap-1">
                  <User size={10} /> {t('lyrics.gender.label')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGender('male')}
                    className={`flex-1 py-1 text-[10px] rounded border transition-all ${gender === 'male' ? 'bg-studio-accent border-studio-accent text-black' : 'border-studio-border text-studio-muted'}`}
                  >
                    {t('lyrics.gender.male')}
                  </button>
                  <button
                    onClick={() => setGender('female')}
                    className={`flex-1 py-1 text-[10px] rounded border transition-all ${gender === 'female' ? 'bg-studio-accent border-studio-accent text-black' : 'border-studio-border text-studio-muted'}`}
                  >
                    {t('lyrics.gender.female')}
                  </button>
                </div>
                <button
                  onClick={handleVocalize}
                  disabled={loading || refining || vocalizing || !lyrics}
                  className="w-full bg-studio-border hover:bg-studio-accent hover:text-black text-studio-text text-[10px] font-bold py-2 rounded flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {vocalizing ? <Loader2 className="animate-spin" size={12} /> : <SpellCheck size={12} />}
                  {vocalizing ? t('lyrics.btn.vocalizing') : t('lyrics.btn.vocalize')}
                </button>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || refining || vocalizing || !topic}
              className="bg-studio-accent hover:bg-opacity-90 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              {loading ? t('lyrics.btn.generating') : t('lyrics.btn.generate')}
            </button>
            <button
              onClick={handleRefine}
              disabled={loading || refining || vocalizing || !lyrics}
              className="bg-studio-border hover:bg-studio-accent hover:text-black text-studio-text font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {refining ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
              {refining ? t('lyrics.btn.refining') : t('lyrics.btn.refine')}
            </button>
          </div>
          {error && <p className="text-[10px] text-red-500 mt-2 font-mono">{error}</p>}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 min-h-0">
        <div className="flex justify-between items-center">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono">{t('lyrics.editor.label')}</label>
          <button 
            onClick={copyToClipboard}
            className="bg-studio-border hover:bg-studio-accent hover:text-black p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px]"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? t('lyrics.copied') : t('lyrics.copy')}
          </button>
        </div>
        <div className="flex-1 bg-studio-card border border-studio-border rounded-lg p-6 overflow-y-auto relative">
          <div className="whitespace-pre-wrap leading-relaxed nikud-text">
            {lyrics.split(/(\s+)/).map((part, i) => {
              if (part.trim() === "") return part;
              return (
                <span
                  key={i}
                  onClick={(e) => handleWordClick(e, part, i)}
                  className={`cursor-pointer hover:bg-studio-accent hover:text-black rounded px-0.5 transition-colors ${selectedWord?.index === i ? 'bg-studio-accent text-black' : ''}`}
                >
                  {part}
                </span>
              );
            })}
          </div>

          {selectedWord && popupPosition && (
            <div 
              className="absolute w-64 studio-glass rounded-xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in duration-200"
              style={{ top: popupPosition.top, left: popupPosition.left }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-studio-accent truncate pr-2">{selectedWord.word}</h3>
                <button onClick={() => setSelectedWord(null)} className="text-studio-muted hover:text-white">×</button>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 mb-2">
                  <label className="text-[10px] text-studio-muted font-mono">{t('lyrics.word.manual')}</label>
                  <div className="flex gap-1">
                    <input 
                      value={manualWordInput}
                      onChange={(e) => setManualWordInput(e.target.value)}
                      className="bg-studio-bg border border-studio-border rounded p-1 text-xs flex-1 focus:outline-none focus:border-studio-accent"
                    />
                    <button 
                      onClick={() => replaceWordInLyrics(manualWordInput)}
                      className="bg-studio-accent text-black p-1 rounded hover:bg-opacity-80"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => getSuggestions('replace')}
                  className="flex items-center gap-2 text-sm bg-studio-border hover:bg-studio-accent hover:text-black p-2 rounded transition-colors"
                >
                  <Replace size={14} /> {t('lyrics.word.replace')}
                </button>
                <button
                  onClick={() => getSuggestions('nikud')}
                  className="flex items-center gap-2 text-sm bg-studio-border hover:bg-studio-accent hover:text-black p-2 rounded transition-colors"
                >
                  <SpellCheck size={14} /> {t('lyrics.word.nikud')}
                </button>
                
                <div className="h-px bg-studio-border my-1" />
                
                <button
                  onClick={deleteWord}
                  className="flex items-center gap-2 text-sm bg-studio-border hover:bg-red-500 hover:text-white p-2 rounded transition-colors"
                >
                  <Trash2 size={14} /> {t('lyrics.word.delete')}
                </button>
                
                <button
                  onClick={() => setShowAddInput(!showAddInput)}
                  className="flex items-center gap-2 text-sm bg-studio-border hover:bg-studio-accent hover:text-black p-2 rounded transition-colors"
                >
                  <Plus size={14} /> {t('lyrics.word.add')}
                </button>

                {showAddInput && (
                  <div className="flex gap-1 mt-1">
                    <input 
                      autoFocus
                      value={newWordInput}
                      onChange={(e) => setNewWordInput(e.target.value)}
                      placeholder="New word..."
                      className="bg-studio-bg border border-studio-border rounded p-1 text-xs flex-1 focus:outline-none focus:border-studio-accent"
                      onKeyDown={(e) => e.key === 'Enter' && addWordAfter()}
                    />
                    <button 
                      onClick={addWordAfter}
                      className="bg-studio-accent text-black p-1 rounded hover:bg-opacity-80"
                    >
                      <Check size={14} />
                    </button>
                  </div>
                )}
              </div>

              {suggestionLoading && <div className="mt-4 flex justify-center"><Loader2 className="animate-spin text-studio-accent" size={20} /></div>}

              {suggestions.length > 0 && (
                <div className="mt-4 flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => replaceWordInLyrics(s)}
                      className="text-left text-xs p-2 hover:bg-studio-accent hover:text-black rounded truncate"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
