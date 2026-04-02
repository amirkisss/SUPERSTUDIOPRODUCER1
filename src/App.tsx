import React, { useState } from 'react';
import { Music, PenTool, Layout, Guitar, Settings, Trash2, PlusCircle, Info, Download, FileText, FileCode, File as FileIcon } from 'lucide-react';
import LyricsEditor from './components/LyricsEditor';
import ArrangementPanel from './components/ArrangementPanel';
import CompositionPanel from './components/CompositionPanel';
import SettingsModal from './components/SettingsModal';
import { useLanguage } from './contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

type Tab = 'lyrics' | 'arrangement' | 'composition';

export default function App() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('lyrics');
  const [lyrics, setLyrics] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Hebrew');
  const [arrangementResult, setArrangementResult] = useState('');
  const [compositionResult, setCompositionResult] = useState('');
  const [arrangementIdea, setArrangementIdea] = useState('');
  const [compositionIdea, setCompositionIdea] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectKey, setProjectKey] = useState(0);

  const tabs = [
    { id: 'lyrics', label: t('tab.lyrics'), icon: PenTool },
    { id: 'arrangement', label: t('tab.arrangement'), icon: Layout },
    { id: 'composition', label: t('tab.composition'), icon: Guitar },
  ];

  const handleNewProject = () => {
    setLyrics('');
    setTopic('');
    setLanguage('Hebrew');
    setArrangementResult('');
    setCompositionResult('');
    setArrangementIdea('');
    setCompositionIdea('');
    setActiveTab('lyrics');
    setShowNewProjectConfirm(false);
    setProjectKey(prev => prev + 1);
  };

  const exportToTxt = () => {
    const content = `MUSEAI PROJECT EXPORT\n\nLYRICS:\n${lyrics}\n\nARRANGEMENT:\n${arrangementResult}\n\nCOMPOSITION:\n${compositionResult}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'museai-project.txt';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToDoc = () => {
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>MuseAI Project</title></head>
      <body>
        <h1>MuseAI Project Export</h1>
        <h2>Lyrics</h2>
        <pre>${lyrics}</pre>
        <h2>Arrangement</h2>
        <pre>${arrangementResult}</pre>
        <h2>Composition</h2>
        <pre>${compositionResult}</pre>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'museai-project.doc';
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("MuseAI Project Export", 10, 20);
    
    doc.setFontSize(14);
    doc.text("Lyrics", 10, 40);
    doc.setFontSize(10);
    const splitLyrics = doc.splitTextToSize(lyrics, 180);
    doc.text(splitLyrics, 10, 50);
    
    let y = 50 + (splitLyrics.length * 5) + 10;
    if (y > 270) { doc.addPage(); y = 20; }
    
    doc.setFontSize(14);
    doc.text("Arrangement", 10, y);
    doc.setFontSize(10);
    const splitArr = doc.splitTextToSize(arrangementResult, 180);
    doc.text(splitArr, 10, y + 10);
    
    y = y + 10 + (splitArr.length * 5) + 10;
    if (y > 270) { doc.addPage(); y = 20; }
    
    doc.setFontSize(14);
    doc.text("Composition", 10, y);
    doc.setFontSize(10);
    const splitComp = doc.splitTextToSize(compositionResult, 180);
    doc.text(splitComp, 10, y + 10);
    
    doc.save("museai-project.pdf");
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-studio-bg text-studio-text flex flex-col">
      {/* Header */}
      <header className="border-bottom border-studio-border px-6 py-4 flex items-center justify-between studio-glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-studio-accent p-2 rounded-lg">
            <Music className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('app.title')}</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-studio-muted font-mono">{t('app.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 text-xs bg-studio-border hover:bg-studio-accent hover:text-black px-3 py-2 rounded-lg transition-all"
            >
              <Download size={16} />
              {t('btn.export')}
            </button>
            
            {showExportMenu && (
              <div className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-48 bg-studio-card border border-studio-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200`}>
                <button onClick={exportToTxt} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-studio-accent hover:text-black transition-colors">
                  <FileText size={16} /> {t('export.txt')}
                </button>
                <button onClick={exportToDoc} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-studio-accent hover:text-black transition-colors">
                  <FileIcon size={16} /> {t('export.doc')}
                </button>
                <button onClick={exportToPdf} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-studio-accent hover:text-black transition-colors">
                  <FileCode size={16} /> {t('export.pdf')}
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setShowNewProjectConfirm(true)}
            className="flex items-center gap-2 text-xs bg-studio-border hover:bg-red-500/20 hover:text-red-500 px-3 py-2 rounded-lg transition-all"
          >
            <PlusCircle size={16} />
            {t('btn.new')}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-studio-muted hover:text-white transition-colors"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className={`w-full md:w-64 ${isRTL ? 'border-l' : 'border-r'} border-studio-border flex flex-col p-4 gap-2 bg-studio-bg`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id 
                  ? 'bg-studio-accent text-black font-bold shadow-lg shadow-studio-accent/20' 
                  : 'text-studio-muted hover:bg-studio-card hover:text-white'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
          
          <div className="mt-auto pt-4 border-t border-studio-border">
            <div className="bg-studio-card rounded-xl p-4 border border-studio-border">
              <p className="text-[10px] uppercase tracking-widest text-studio-muted mb-2 font-mono">{t('status.project')}</p>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>{t('status.ready')}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Content Area */}
        <section className="flex-1 overflow-hidden p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'lyrics' && (
                <LyricsEditor 
                  key={`lyrics-${projectKey}`}
                  lyrics={lyrics} 
                  setLyrics={setLyrics} 
                  topic={topic} 
                  setTopic={setTopic} 
                  language={language} 
                  setLanguage={setLanguage} 
                />
              )}
              {activeTab === 'arrangement' && (
                <ArrangementPanel 
                  key={`arrangement-${projectKey}`}
                  lyrics={lyrics} 
                  arrangementResult={arrangementResult} 
                  setArrangementResult={setArrangementResult} 
                  arrangementIdea={arrangementIdea}
                  setArrangementIdea={setArrangementIdea}
                />
              )}
              {activeTab === 'composition' && (
                <CompositionPanel 
                  key={`composition-${projectKey}`}
                  lyrics={lyrics} 
                  compositionResult={compositionResult} 
                  setCompositionResult={setCompositionResult} 
                  compositionIdea={compositionIdea}
                  setCompositionIdea={setCompositionIdea}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      {/* New Project Confirmation Modal */}
      <AnimatePresence>
        {showNewProjectConfirm && (
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
              className="bg-studio-card border border-studio-border p-8 rounded-2xl max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6 text-red-500">
                <Trash2 size={32} />
                <h2 className="text-xl font-bold">{t('modal.new.title')}</h2>
              </div>
              <p className="text-studio-muted mb-8 leading-relaxed">
                {t('modal.new.desc')}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowNewProjectConfirm(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-studio-border hover:bg-studio-muted/20 transition-all font-medium"
                >
                  {t('modal.new.cancel')}
                </button>
                <button 
                  onClick={handleNewProject}
                  className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all font-bold"
                >
                  {t('modal.new.confirm')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Footer / Status Bar */}
      <footer className="border-t border-studio-border px-6 py-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-studio-muted font-mono bg-studio-bg">
        <div className="flex gap-4">
          <span>Model: Gemini 3 Flash</span>
          <span>Latency: Optimal</span>
        </div>
        <div>
          © 2026 MuseAI Studio
        </div>
      </footer>
    </div>
  );
}
