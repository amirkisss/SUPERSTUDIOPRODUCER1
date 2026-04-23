import React, { useState, useRef } from 'react';
import { generateArrangement } from '../services/gemini';
import { Music, Radio, Speaker, Loader2, Copy, Check, Mic, Disc, PenTool, Plus, Trash2, UserPlus, Waves, Globe, Layout, Activity, Minus, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '../contexts/LanguageContext';

interface Musician {
  id: string;
  instrument: string;
  type: string;
  model: string;
}

interface BackingVocal {
  id: string;
  gender: string;
  style: string;
}

interface ArrangementPanelProps {
  lyrics: string;
  arrangementResult: string;
  setArrangementResult: (r: string) => void;
  arrangementIdea: string;
  setArrangementIdea: (i: string) => void;
  usageCount: number;
  usageLimit: number;
  isAdmin: boolean;
  onAction: () => void;
  // Persistent parameters
  selectedGenres: string[];
  setSelectedGenres: (l: string[]) => void;
  selectedInstruments: string[];
  setSelectedInstruments: (l: string[]) => void;
  selectedVocals: string[];
  setSelectedVocals: (l: string[]) => void;
  selectedEffects: string[];
  setSelectedEffects: (l: string[]) => void;
  selectedRecordings: string[];
  setSelectedRecordings: (l: string[]) => void;
  selectedCountries: string[];
  setSelectedCountries: (l: string[]) => void;
  musicians: Musician[];
  setMusicians: (m: Musician[]) => void;
  backingVocals: BackingVocal[];
  setBackingVocals: (b: BackingVocal[]) => void;
  bpm: number;
  setBpm: (bpm: number) => void;
  timeSignature: string;
  setTimeSignature: (ts: string) => void;
  onSaveProject: () => void;
  isSaving: boolean;
}

const TIME_SIGNATURES = [
  "2/4", "3/4", "4/4", "5/4", "6/8", "7/8", "9/8", "12/8", "4/2"
];

const COUNTRIES = [
  "Israel", "USA", "UK", "France", "Italy", "Spain", "Germany", "Brazil", "Argentina", "Mexico", "Jamaica", "Cuba", "Japan", "South Korea", "China", "India", "Egypt", "Morocco", "Greece", "Turkey", "Russia", "Georgia", "Armenia", "Ireland", "Scotland", "Nigeria", "South Africa", "Mali", "Senegal", "Thailand", "Vietnam", "Indonesia", "Australia", "Canada", "Sweden", "Norway", "Finland", "Iceland", "Portugal", "Netherlands", "Belgium", "Switzerland", "Austria", "Poland", "Ukraine", "Romania", "Bulgaria", "Serbia", "Croatia", "Hungary", "Czech Republic", "Slovakia", "Denmark", "Iran", "Iraq", "Lebanon", "Jordan", "Saudi Arabia", "UAE", "Pakistan", "Afghanistan", "Colombia", "Chile", "Peru", "Venezuela", "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Kenya", "Ethiopia", "Ghana", "Congo", "Zimbabwe", "New Zealand", "Philippines", "Malaysia", "Singapore"
];

const MUSICIANS_DATA: Record<string, { types: string[], models: Record<string, string[]> }> = {
  "Guitarist": {
    types: ["Electric", "Acoustic", "Classical", "12-String", "Resonator"],
    models: {
      "Electric": ["Fender Stratocaster", "Gibson Les Paul", "Ibanez RG", "PRS Custom 24", "Gretsch Hollowbody", "Telecaster"],
      "Acoustic": ["Martin D-28", "Taylor 814ce", "Gibson J-45", "Yamaha FG800", "Guild D-55"],
      "Classical": ["Cordoba C10", "Yamaha C40", "Ramirez Studio", "Alhambra 7P"],
      "12-String": ["Taylor 150e", "Guild F-1512", "Martin D12-28"],
      "Resonator": ["Dobro Hound Dog", "National Style O", "Gretsch Boxcar"]
    }
  },
  "Pianist/Keyboardist": {
    types: ["Grand Piano", "Upright Piano", "Electric Piano", "Synthesizer", "Organ", "Mellotron"],
    models: {
      "Grand Piano": ["Steinway Model D", "Yamaha CFX", "Bosendorfer Imperial", "Fazioli F308"],
      "Upright Piano": ["Yamaha U1", "Steinway K-52", "Kawai K-300"],
      "Electric Piano": ["Rhodes Mark I", "Wurlitzer 200A", "Yamaha CP80", "Nord Stage 3"],
      "Synthesizer": ["Moog One", "Prophet-5", "Roland Juno-106", "Korg Minilogue", "DX7"],
      "Organ": ["Hammond B3", "Vox Continental", "Farfisa Compact"],
      "Mellotron": ["M400", "M300"]
    }
  },
  "Drummer": {
    types: ["Acoustic Kit", "Electronic Kit", "Percussion Set", "Drum Machine"],
    models: {
      "Acoustic Kit": ["Ludwig Classic Maple", "DW Collector's Series", "Tama Starclassic", "Gretsch USA Custom", "Pearl Export"],
      "Electronic Kit": ["Roland TD-50KV", "Alesis Strike Pro", "Yamaha DTX10"],
      "Percussion Set": ["Congas/Bongos", "Orchestral Percussion", "Cajon/Shakers"],
      "Drum Machine": ["Roland TR-808", "Roland TR-909", "LinnDrum", "MPC 2000XL"]
    }
  },
  "Bassist": {
    types: ["Electric Bass", "Acoustic Bass", "Upright Bass", "Synth Bass"],
    models: {
      "Electric Bass": ["Fender Precision Bass", "Fender Jazz Bass", "Music Man StingRay", "Rickenbacker 4003", "Warwick Thumb"],
      "Acoustic Bass": ["Taylor GS Mini Bass", "Ibanez AEB10E"],
      "Upright Bass": ["Double Bass (Jazz)", "Double Bass (Orchestral)"],
      "Synth Bass": ["Moog Minitaur", "Novation Bass Station II", "Roland TB-303"]
    }
  },
  "Strings": {
    types: ["Violin", "Viola", "Cello", "Double Bass", "String Ensemble"],
    models: {
      "Violin": ["Stradivarius Style", "Modern Electric Violin", "Fiddle"],
      "Viola": ["Standard Viola", "Electric Viola"],
      "Cello": ["Standard Cello", "Electric Cello"],
      "Double Bass": ["Standard Double Bass"],
      "String Ensemble": ["Full Orchestra", "Chamber Strings", "Quartet"]
    }
  },
  "Brass": {
    types: ["Trumpet", "Trombone", "Saxophone", "French Horn", "Tuba"],
    models: {
      "Trumpet": ["Bach Stradivarius", "Yamaha Xeno"],
      "Trombone": ["Bach 42B", "Conn 88H"],
      "Saxophone": ["Selmer Mark VI (Alto)", "Selmer Mark VI (Tenor)", "Yamaha Custom Z"],
      "French Horn": ["Holton H178", "Yamaha 667"],
      "Tuba": ["Miraphone 186", "Yamaha 641"]
    }
  },
  "Woodwinds": {
    types: ["Flute", "Clarinet", "Oboe", "Bassoon", "Recorder"],
    models: {
      "Flute": ["Powell Custom", "Yamaha 400 Series"],
      "Clarinet": ["Buffet Crampon R13", "Selmer Privilege"],
      "Oboe": ["Loreé Royal", "Yamaha 841"],
      "Bassoon": ["Fox Model 240", "Heckel"],
      "Recorder": ["Soprano", "Alto", "Tenor", "Bass"]
    }
  }
};

const GENRES = [
  "Pop", "Rock", "Jazz", "Hip Hop", "Electronic", "Classical", "Folk", "R&B", "Metal", "Country", "Blues", "Reggae", 
  "Armenian Folk", "Georgian Folk", "Mediterranean", "Russian Pop", "Mizrahi", "Arabic Pop", "Greek Laiko", "Turkish Arabesque",
  "Synthwave", "Lo-fi", "Cinematic", "Trance", "Electro", "Techno", "Opera", "Samba", "Rumba", "Tango", "Bossa Nova", "Salsa", "Flamenco", "K-Pop", "J-Pop"
];

const INSTRUMENTS = [
  "Acoustic Guitar", "Electric Guitar", "Piano", "Synthesizer", "Drums", "Bass Guitar", "Violin", "Cello", "Trumpet", "Saxophone", 
  "Duduk (Armenian)", "Tar (Armenian/Persian)", "Oud", "Kanun", "Bouzouki", "Darbuqa", "Dhol (Armenian)", "Arabic Violins", "Ney", "Accordion",
  "Harp", "Flute", "Clarinet", "Oboe", "Trombone", "Tuba", "Mandolin", "Banjo", "Ukulele", "Sitar", "Tabla", "Koto", "Shamisen", "Bagpipes"
];

const VOCAL_STYLES = [
  "Clean Male", "Clean Female", "Duet", "Children's Voice", "Children's A Cappella", "Husky", "Operatic", "Soulful", "Rapped", "Whispered", "Auto-tuned", "Traditional Folk", "Middle Eastern Melisma", "Gravely", "High Pitch"
];

const VOCAL_EFFECTS = [
  "Reverb", "Delay", "Echo", "Chorus", "Phaser", "Flanger", "Distortion", "Pitch Correction", "Doubling", "Compression", "De-esser"
];

const RECORDING_QUALITIES = [
  "Digital Studio", "Analog Tape", "Lo-fi Vinyl", "Stereo Wide", "Dolby Atmos", "Live Concert", "Binaural 3D", "Vintage 60s", "Modern Radio",
  "High Fidelity (Hi-Fi)", "Lo-Fi", "Analog Warmth", "Polished", "Slick", "Raw", "Gritty", "Overdriven", "Distorted", "Vintage", "Crisp", "Bright", "Atmospheric", "Spacey", "Ethereal", "Dry", "Wet", "Spacious", "Immersive", "Cathedral Reverb", "Hall Reverb", "Intimate", "Mastered", "Bass-heavy", "Sub-bass", "Punchy", "Aggressive", "Intense", "Cinematic", "Compressed", "Dynamic Range", "Heavy Saturation", "Multi-track", "Acoustic Mix", "Electronic Production", "Vinyl Crackle", "Tape Hiss", "Balanced Mix"
];

export default function ArrangementPanel({ 
  lyrics, 
  arrangementResult, 
  setArrangementResult, 
  arrangementIdea, 
  setArrangementIdea,
  usageCount,
  usageLimit,
  isAdmin,
  onAction,
  selectedGenres,
  setSelectedGenres,
  selectedInstruments,
  setSelectedInstruments,
  selectedVocals,
  setSelectedVocals,
  selectedEffects,
  setSelectedEffects,
  selectedRecordings,
  setSelectedRecordings,
  selectedCountries,
  setSelectedCountries,
  musicians,
  setMusicians,
  backingVocals,
  setBackingVocals,
  bpm,
  setBpm,
  timeSignature,
  setTimeSignature,
  onSaveProject,
  isSaving
}: ArrangementPanelProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultHeight, setResultHeight] = useState(400);
  const [isMaximized, setIsMaximized] = useState(false);
  const isResizing = useRef<boolean>(false);

  const startResizing = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const newHeight = Math.max(200, Math.min(1200, e.clientY - 400));
    setResultHeight(newHeight);
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  const handleGenerate = async () => {
    // Ensure we have a valid limit before blocking. If limit is 0, it might mean the profile is still loading.
    if (!isAdmin && usageLimit > 0 && usageCount >= usageLimit) {
      setError(t('error.usage_limit') || "Usage limit reached. Please contact admin for more credits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await generateArrangement(
        lyrics, 
        selectedGenres, 
        selectedInstruments, 
        selectedVocals, 
        selectedRecordings, 
        arrangementIdea,
        selectedEffects,
        musicians.map(({ instrument, type, model }) => ({ instrument, type: `${type} ${model}`.trim() })),
        backingVocals.map(({ gender, style }) => ({ gender, style })),
        selectedCountries,
        bpm,
        timeSignature
      );
      if (res) {
        setArrangementResult(res);
        onAction();
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate arrangement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addMusician = () => {
    const defaultInst = Object.keys(MUSICIANS_DATA)[0];
    const defaultType = MUSICIANS_DATA[defaultInst].types[0];
    const defaultModel = MUSICIANS_DATA[defaultInst].models[defaultType][0];
    setMusicians([...musicians, { 
      id: Math.random().toString(36).substr(2, 9), 
      instrument: defaultInst, 
      type: defaultType,
      model: defaultModel
    }]);
  };

  const updateMusician = (id: string, field: keyof Musician, value: string) => {
    setMusicians(musicians.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        // Reset type and model if instrument changes
        if (field === 'instrument') {
          updated.type = MUSICIANS_DATA[value].types[0];
          updated.model = MUSICIANS_DATA[value].models[updated.type][0];
        }
        // Reset model if type changes
        if (field === 'type') {
          updated.model = MUSICIANS_DATA[m.instrument].models[value][0];
        }
        return updated;
      }
      return m;
    }));
  };

  const removeMusician = (id: string) => {
    setMusicians(musicians.filter(m => m.id !== id));
  };

  const addBackingVocal = () => {
    setBackingVocals([...backingVocals, { id: Math.random().toString(36).substr(2, 9), gender: 'Female', style: 'Harmonies' }]);
  };

  const updateBackingVocal = (id: string, field: keyof BackingVocal, value: string) => {
    setBackingVocals(backingVocals.map(bv => bv.id === id ? { ...bv, [field]: value } : bv));
  };

  const removeBackingVocal = (id: string) => {
    setBackingVocals(backingVocals.filter(bv => bv.id !== id));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arrangementResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full gap-6 overflow-y-auto pr-2">
      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
          <PenTool size={14} /> {t('arrangement.idea.label')}
        </label>
        <textarea
          value={arrangementIdea}
          onChange={(e) => setArrangementIdea(e.target.value)}
          placeholder={t('arrangement.idea.placeholder')}
          className="bg-studio-card border border-studio-border rounded-xl p-4 focus:outline-none focus:border-studio-accent transition-colors h-24 resize-y min-h-[6rem] text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Activity size={14} /> Tempo (BPM)
          </label>
          <div className="flex items-center gap-4 bg-studio-card border border-studio-border rounded-xl p-2 w-fit">
            <button 
              onClick={() => setBpm(Math.max(40, bpm - 1))}
              className="p-2 hover:bg-studio-border rounded-lg transition-colors text-studio-muted hover:text-white"
            >
              <Minus size={16} />
            </button>
            <div className="flex flex-col items-center min-w-[60px]">
              <span className="text-xl font-bold text-white">{bpm}</span>
              <span className="text-[10px] text-studio-muted uppercase tracking-wider">BPM</span>
            </div>
            <button 
              onClick={() => setBpm(Math.min(240, bpm + 1))}
              className="p-2 hover:bg-studio-border rounded-lg transition-colors text-studio-muted hover:text-white"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Clock size={14} /> Time Signature (Rhythm)
          </label>
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.target.value)}
            className="bg-studio-card border border-studio-border rounded-xl p-4 focus:outline-none focus:border-studio-accent appearance-none cursor-pointer h-full"
          >
            {TIME_SIGNATURES.map(ts => (
              <option key={ts} value={ts}>{ts}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Radio size={14} /> Musical Genres
          </label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => toggleItem(genre, selectedGenres, setSelectedGenres)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                  selectedGenres.includes(genre) 
                    ? 'bg-studio-accent border-studio-accent text-black' 
                    : 'border-studio-border text-studio-muted hover:border-studio-muted'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Speaker size={14} /> Instruments
          </label>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map(inst => (
              <button
                key={inst}
                onClick={() => toggleItem(inst, selectedInstruments, setSelectedInstruments)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                  selectedInstruments.includes(inst) 
                    ? 'bg-studio-accent border-studio-accent text-black' 
                    : 'border-studio-border text-studio-muted hover:border-studio-muted'
                }`}
              >
                {inst}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
          <Globe size={14} /> Country & Cultural Influences
        </label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 border border-studio-border rounded-lg bg-studio-card/30">
          {COUNTRIES.map(country => (
            <button
              key={country}
              onClick={() => toggleItem(country, selectedCountries, setSelectedCountries)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                selectedCountries.includes(country) 
                  ? 'bg-studio-accent border-studio-accent text-black' 
                  : 'border-studio-border text-studio-muted hover:border-studio-muted'
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Waves size={14} /> Vocal Effects
          </label>
          <div className="flex flex-wrap gap-2">
            {VOCAL_EFFECTS.map(effect => (
              <button
                key={effect}
                onClick={() => toggleItem(effect, selectedEffects, setSelectedEffects)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                  selectedEffects.includes(effect) 
                    ? 'bg-studio-accent border-studio-accent text-black' 
                    : 'border-studio-border text-studio-muted hover:border-studio-muted'
                }`}
              >
                {effect}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Mic size={14} /> Vocal Styles
          </label>
          <div className="flex flex-wrap gap-2">
            {VOCAL_STYLES.map(v => (
              <button
                key={v}
                onClick={() => toggleItem(v, selectedVocals, setSelectedVocals)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                  selectedVocals.includes(v) 
                    ? 'bg-studio-accent border-studio-accent text-black' 
                    : 'border-studio-border text-studio-muted hover:border-studio-muted'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <Speaker size={14} /> Detailed Musicians & Band
          </label>
          <button 
            onClick={addMusician}
            className="text-[10px] uppercase tracking-wider bg-studio-accent/10 text-studio-accent border border-studio-accent/20 px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-studio-accent hover:text-black transition-all"
          >
            <Plus size={12} /> Add Musician
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {musicians.map((m) => (
            <div key={m.id} className="flex flex-col sm:flex-row gap-3 bg-studio-card/50 border border-studio-border p-3 rounded-xl">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-studio-muted uppercase font-mono">Musician</span>
                <select 
                  value={m.instrument}
                  onChange={(e) => updateMusician(m.id, 'instrument', e.target.value)}
                  className="bg-studio-bg border border-studio-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-studio-accent"
                >
                  {Object.keys(MUSICIANS_DATA).map(inst => (
                    <option key={inst} value={inst}>{inst}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-studio-muted uppercase font-mono">Type</span>
                <select 
                  value={m.type}
                  onChange={(e) => updateMusician(m.id, 'type', e.target.value)}
                  className="bg-studio-bg border border-studio-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-studio-accent"
                >
                  {MUSICIANS_DATA[m.instrument as keyof typeof MUSICIANS_DATA]?.types?.map(type => (
                    <option key={type} value={type}>{type}</option>
                  )) || []}
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-studio-muted uppercase font-mono">Model / Brand</span>
                <select 
                  value={m.model}
                  onChange={(e) => updateMusician(m.id, 'model', e.target.value)}
                  className="bg-studio-bg border border-studio-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-studio-accent"
                >
                  {(MUSICIANS_DATA[m.instrument as keyof typeof MUSICIANS_DATA]?.models as any)?.[m.type]?.map((model: string) => (
                    <option key={model} value={model}>{model}</option>
                  )) || []}
                </select>
              </div>
              <button 
                onClick={() => removeMusician(m.id)}
                className="self-end sm:self-center p-2 text-red-500/50 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {musicians.length === 0 && (
            <div className="text-center py-4 border border-dashed border-studio-border rounded-xl text-studio-muted text-xs">
              No specific musicians added. Use the general instrument list or add players here.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
            <UserPlus size={14} /> Backing Vocals
          </label>
          <button 
            onClick={addBackingVocal}
            className="text-[10px] uppercase tracking-wider bg-studio-accent/10 text-studio-accent border border-studio-accent/20 px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-studio-accent hover:text-black transition-all"
          >
            <Plus size={12} /> Add Backing Vocal
          </button>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {backingVocals.map((bv) => (
            <div key={bv.id} className="flex flex-col sm:flex-row gap-3 bg-studio-card/50 border border-studio-border p-3 rounded-xl">
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-studio-muted uppercase font-mono">Gender</span>
                <select 
                  value={bv.gender}
                  onChange={(e) => updateBackingVocal(bv.id, 'gender', e.target.value)}
                  className="bg-studio-bg border border-studio-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-studio-accent"
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Non-binary</option>
                  <option>Choir</option>
                </select>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <span className="text-[10px] text-studio-muted uppercase font-mono">Style</span>
                <input 
                  type="text"
                  value={bv.style}
                  onChange={(e) => updateBackingVocal(bv.id, 'style', e.target.value)}
                  placeholder="e.g. Harmonies, Ad-libs, Gospel"
                  className="bg-studio-bg border border-studio-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-studio-accent"
                />
              </div>
              <button 
                onClick={() => removeBackingVocal(bv.id)}
                className="self-end sm:self-center p-2 text-red-500/50 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {backingVocals.length === 0 && (
            <div className="text-center py-4 border border-dashed border-studio-border rounded-xl text-studio-muted text-xs">
              No backing vocals added.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
          <Disc size={14} /> Recording Qualities and Mix
        </label>
        <div className="flex flex-wrap gap-2">
          {RECORDING_QUALITIES.map(r => (
            <button
              key={r}
              onClick={() => toggleItem(r, selectedRecordings, setSelectedRecordings)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                selectedRecordings.includes(r) 
                  ? 'bg-studio-accent border-studio-accent text-black' 
                  : 'border-studio-border text-studio-muted hover:border-studio-muted'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 sticky bottom-0 z-10">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 bg-studio-accent hover:bg-opacity-90 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-2xl"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Layout size={20} />}
          {loading ? t('lyrics.btn.generating') : t('arrangement.btn.generate')}
        </button>
        <button
          onClick={onSaveProject}
          disabled={isSaving}
          className="flex-1 bg-studio-border hover:bg-studio-accent hover:text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-2xl"
        >
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
          {isSaving ? t('btn.saving') || 'Saving...' : t('btn.save') || 'Save Project'}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 text-center font-mono">{error}</p>}

      <div 
        className={`bg-studio-card border border-studio-border rounded-xl p-6 relative overflow-y-auto ${isMaximized ? 'fixed inset-4 z-[100] h-auto shadow-2xl ring-1 ring-studio-accent/20' : ''}`}
        style={isMaximized ? {} : { height: `${resultHeight}px` }}
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
        <div className="flex justify-between items-center mb-4">
          <label className="text-xs uppercase tracking-widest text-studio-muted font-mono block">{t('arrangement.result.label')}</label>
          <button 
            onClick={() => setIsMaximized(!isMaximized)}
            className="bg-studio-border hover:bg-studio-accent hover:text-black p-1.5 rounded-lg transition-all flex items-center gap-2 text-[10px]"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            <Layout size={12} />
            {isMaximized ? "Minimize" : "Maximize"}
          </button>
        </div>
        {!arrangementResult && !loading && (
          <div className="h-40 flex flex-col items-center justify-center text-studio-muted text-center p-8">
            <Music size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Configure your studio setup and click generate.</p>
          </div>
        )}
        
        {arrangementResult && (
          <div className="prose prose-invert max-w-none">
            <div className="flex justify-end mb-4">
              <button 
                onClick={copyToClipboard}
                className="bg-studio-border hover:bg-studio-accent hover:text-black p-2 rounded-lg transition-all flex items-center gap-2 text-xs"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Plan'}
              </button>
            </div>
            <ReactMarkdown>{arrangementResult}</ReactMarkdown>
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
  );
}
