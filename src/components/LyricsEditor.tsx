import React, { useState, useRef, useEffect } from 'react';
import { generateLyrics, processWord, refineLyrics, vocalizeLyrics } from '../services/gemini';
import { Sparkles, Type as TypeIcon, Languages, ChevronDown, Loader2, Replace, SpellCheck, Copy, Check, Wand2, Trash2, Plus, User, UserCheck, Info, Layout } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

interface LyricsEditorProps {
  lyrics: string;
  setLyrics: (l: string) => void;
  topic: string;
  setTopic: (t: string) => void;
  language: string;
  setLanguage: (l: string) => void;
  usageCount: number;
  usageLimit: number;
  isAdmin: boolean;
  onAction: () => void;
}

export default function LyricsEditor({ 
  lyrics, 
  setLyrics, 
  topic, 
  setTopic, 
  language, 
  setLanguage,
  usageCount,
  usageLimit,
  isAdmin,
  onAction
}: LyricsEditorProps) {
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
  const [isEditing, setIsEditing] = useState(false);
  const [editorHeight, setEditorHeight] = useState(400);
  const [isMaximized, setIsMaximized] = useState(false);
  const isResizing = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newHeight = Math.max(200, Math.min(1200, e.clientY - 300)); // Adjust based on layout
    setEditorHeight(newHeight);
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  const handleGenerate = async () => {
    if (!topic) return;
    if (!isAdmin && usageCount >= usageLimit) {
      setError("Usage limit reached. Please contact admin for more credits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateLyrics(topic, language, lyrics, gender);
      if (result) {
        setLyrics(result);
        onAction();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate lyrics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVocalize = async () => {
    if (!lyrics) return;
    if (!isAdmin && usageCount >= usageLimit) {
      setError("Usage limit reached. Please contact admin for more credits.");
      return;
    }
    setVocalizing(true);
    setError(null);
    try {
      const result = await vocalizeLyrics(lyrics, gender);
      if (result) {
        setLyrics(result);
        onAction();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to vocalize lyrics. Please try again.");
    } finally {
      setVocalizing(false);
    }
  };

  const handleRefine = async () => {
    if (!lyrics) return;
    if (!isAdmin && usageCount >= usageLimit) {
      setError("Usage limit reached. Please contact admin for more credits.");
      return;
    }
    setRefining(true);
    setError(null);
    try {
      const result = await refineLyrics(lyrics, language, topic, gender);
      if (result) {
        setLyrics(result);
        onAction();
      }
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

  const getSuggestions = async (action: 'replace' | 'nikud' | 'nikud_options') => {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs uppercase tracking-widest text-studio-muted font-mono">{t('lyrics.topic.label')}</label>
              <div className="group relative">
                <Info size={12} className="text-studio-muted cursor-help" />
                <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-studio-card border border-studio-border rounded text-[10px] text-studio-muted hidden group-hover:block z-50 shadow-2xl">
                  {t('lyrics.mode.info')}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${isEditing ? 'bg-studio-accent text-black' : 'bg-studio-border text-studio-muted hover:text-white'}`}
              >
                {isEditing ? <Check size={12} /> : <TypeIcon size={12} />}
                {isEditing ? t('lyrics.mode.done') || 'Finish Editing' : t('lyrics.mode.edit') || 'Manual Writing'}
              </button>
            </div>
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={t('lyrics.topic.placeholder')}
            className="bg-studio-card border border-studio-border rounded-lg p-3 focus:outline-none focus:border-studio-accent transition-colors h-24 resize-y min-h-[6rem]"
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
            <option>Italian</option>
            <option>Portuguese</option>
            <option>Arabic</option>
            <option>Russian</option>
            <option>Georgian</option>
            <option>Armenian</option>
            <option>Hindi</option>
            <option>Greek</option>
            <option>Turkish</option>
            <option>Yiddish</option>
            <option>Swahili</option>
            <option>Amharic</option>
            <option>Yoruba</option>
            <option>Zulu</option>
            <option>Hausa</option>
            <option>Igbo</option>
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
                  {vocalizing ? (
                    <Loader2 key="vocal-spinner" className="animate-spin" size={12} />
                  ) : (
                    <SpellCheck key="vocal-icon" size={12} />
                  )}
                  <span key="vocal-text">
                    {vocalizing ? t('lyrics.btn.vocalizing') : t('lyrics.btn.vocalize')}
                  </span>
                </button>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || refining || vocalizing || !topic}
              className="bg-studio-accent hover:bg-opacity-90 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 key="lyrics-gen-spinner" className="animate-spin" size={20} />
              ) : (
                <Sparkles key="lyrics-gen-icon" size={20} />
              )}
              <span key="lyrics-gen-text">
                {loading ? t('lyrics.btn.generating') : t('lyrics.btn.generate')}
              </span>
            </button>
            <button
              onClick={handleRefine}
              disabled={loading || refining || vocalizing || !lyrics}
              className="bg-studio-border hover:bg-studio-accent hover:text-black text-studio-text font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {refining ? (
                <Loader2 key="lyrics-refine-spinner" className="animate-spin" size={20} />
              ) : (
                <Wand2 key="lyrics-refine-icon" size={20} />
              )}
              <span key="lyrics-refine-text">
                {refining ? t('lyrics.btn.refining') : t('lyrics.btn.refine')}
              </span>
            </button>
          </div>
          {error && <p className="text-[10px] text-red-500 mt-2 font-mono">{error}</p>}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-0">
        <div className="md:col-span-3 flex flex-col gap-2 relative h-full">
          <div className="flex justify-between items-center">
            <label className="text-xs uppercase tracking-widest text-studio-muted font-mono">{t('lyrics.editor.label')}</label>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMaximized(!isMaximized)}
                className="bg-studio-border hover:bg-studio-accent hover:text-black p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px]"
                title={isMaximized ? "Minimize" : "Maximize"}
              >
                <Layout size={12} />
                {isMaximized ? "Minimize" : "Maximize"}
              </button>
              <button 
                onClick={copyToClipboard}
                className="bg-studio-border hover:bg-studio-accent hover:text-black p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px]"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? t('lyrics.copied') : t('lyrics.copy')}
              </button>
            </div>
          </div>
          <div 
            className={`flex-1 bg-studio-card border border-studio-border rounded-lg p-6 overflow-y-auto relative ${isMaximized ? 'fixed inset-4 z-[100] h-auto shadow-2xl ring-1 ring-studio-accent/20' : ''}`}
            style={isMaximized ? {} : { height: `${editorHeight}px` }}
          >
            {isMaximized && (
              <button 
                onClick={() => setIsMaximized(false)}
                className="absolute top-4 right-4 p-2 bg-studio-border hover:bg-red-500 rounded-full transition-all z-[110]"
                title="Close"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            )}
            {isEditing ? (
              <div className="h-full flex flex-col gap-4">
                <textarea
                  autoFocus
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={t('lyrics.editor.placeholder') || 'Write or paste your lyrics here...'}
                  className="w-full flex-1 bg-transparent border-none focus:outline-none resize-y min-h-[200px] leading-relaxed nikud-text text-lg"
                  dir={language === 'Hebrew' || language === 'Arabic' ? 'rtl' : 'ltr'}
                />
                {language === 'Hebrew' && (
                  <div className="flex justify-end border-t border-studio-border pt-4">
                    <button
                      onClick={handleVocalize}
                      disabled={vocalizing || !lyrics}
                      className="bg-studio-accent text-black font-bold px-6 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-studio-accent/20 disabled:opacity-50"
                    >
                      {vocalizing ? <Loader2 className="animate-spin" size={16} /> : <SpellCheck size={16} />}
                      {vocalizing ? t('lyrics.btn.vocalizing') : t('lyrics.btn.vocalize')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div 
                className="whitespace-pre-wrap leading-relaxed nikud-text text-lg focus:outline-none min-h-[200px]" 
                dir={language === 'Hebrew' || language === 'Arabic' ? 'rtl' : 'ltr'}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={(e) => {
                  const target = e.target as HTMLElement;
                  // Use innerText to preserve newlines, fallback to textContent
                  const newText = target.innerText || target.textContent || '';
                  setLyrics(newText);
                  setIsEditing(true);
                }}
              >
                {lyrics.split(/(\s+)/).map((part, i) => {
                  if (part.trim() === "") return part;
                  return (
                    <span
                      key={i}
                      contentEditable={false}
                      onClick={(e) => handleWordClick(e, part, i)}
                      className={`cursor-pointer hover:bg-studio-accent hover:text-black rounded px-0.5 transition-colors ${selectedWord?.index === i ? 'bg-studio-accent text-black' : ''}`}
                    >
                      {part}
                    </span>
                  );
                })}
              </div>
            )}

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
                <button
                  onClick={() => getSuggestions('nikud_options')}
                  className="flex items-center gap-2 text-sm bg-studio-border hover:bg-studio-accent hover:text-black p-2 rounded transition-colors"
                >
                  <Languages size={14} /> {t('lyrics.word.nikud_options')}
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
          {!isMaximized && (
            <div 
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-studio-accent transition-colors z-10 group"
              onMouseDown={startResizing}
            >
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-studio-border group-hover:bg-studio-accent/50 transition-colors" />
            </div>
          )}
        </div>
      </div>
      
      <div className="md:col-span-1 flex flex-col gap-2 h-full overflow-y-auto bg-studio-card/30 border border-studio-border rounded-xl p-3">
          <label className="text-[10px] uppercase tracking-widest text-studio-muted font-mono mb-2">Song Structure Tags</label>
          
          <div className="flex flex-col gap-4">
            <div>
              <h4 className="text-xs font-bold text-studio-accent mb-2 border-b border-studio-border pb-1">Structure</h4>
              <div className="flex flex-col gap-1">
                {[
                  { tag: "[Intro]", desc: "פתיחה" },
                  { tag: "[Verse]", desc: "בית" },
                  { tag: "[Pre-Chorus]", desc: "מעבר" },
                  { tag: "[Chorus]", desc: "פזמון" },
                  { tag: "[Bridge]", desc: "גשר" },
                  { tag: "[Outro]", desc: "סיום" },
                  { tag: "[End]", desc: "סיום מוחלט" }
                ].map(item => (
                  <button 
                    key={item.tag}
                    onClick={() => {
                      navigator.clipboard.writeText(item.tag);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex justify-between items-center p-1.5 hover:bg-studio-accent/10 rounded group text-left transition-colors"
                    title="Click to copy tag"
                  >
                    <span className="text-xs font-mono font-bold text-studio-text group-hover:text-studio-accent">{item.tag}</span>
                    <span className="text-[10px] text-studio-muted">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-studio-accent mb-2 border-b border-studio-border pb-1">Music & Effects</h4>
              <div className="flex flex-col gap-1">
                {[
                  { tag: "[Instrumental Break]", desc: "הפסקה לנגינה" },
                  { tag: "[Guitar Solo]", desc: "סולו גיטרה" },
                  { tag: "[Drop]", desc: "דרופ" },
                  { tag: "[Breakdown]", desc: "הפחתת עוצמה" },
                  { tag: "[Silence]", desc: "שקט" },
                  { tag: "[Crescendo]", desc: "התחזקות" },
                  { tag: "[Sting]", desc: "צליל חד" }
                ].map(item => (
                  <button 
                    key={item.tag}
                    onClick={() => {
                      navigator.clipboard.writeText(item.tag);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex justify-between items-center p-1.5 hover:bg-studio-accent/10 rounded group text-left transition-colors"
                    title="Click to copy tag"
                  >
                    <span className="text-xs font-mono font-bold text-studio-text group-hover:text-studio-accent">{item.tag}</span>
                    <span className="text-[10px] text-studio-muted">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-studio-accent mb-2 border-b border-studio-border pb-1">Vocals</h4>
              <div className="flex flex-col gap-1">
                {[
                  { tag: "(Whispered)", desc: "לחישה" },
                  { tag: "(Spoken Word)", desc: "דיבור" },
                  { tag: "(Ad-libs)", desc: "אלתורים" },
                  { tag: "(Echo)", desc: "הד" },
                  { tag: "(Backing Vocals)", desc: "קולות ליווי" },
                  { tag: "(Laughing)", desc: "צחוק" },
                  { tag: "(Sighing)", desc: "אנחה" }
                ].map(item => (
                  <button 
                    key={item.tag}
                    onClick={() => {
                      navigator.clipboard.writeText(item.tag);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex justify-between items-center p-1.5 hover:bg-studio-accent/10 rounded group text-left transition-colors"
                    title="Click to copy tag"
                  >
                    <span className="text-xs font-mono font-bold text-studio-text group-hover:text-studio-accent">{item.tag}</span>
                    <span className="text-[10px] text-studio-muted">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
