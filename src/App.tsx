import React, { useState, useEffect, useRef } from 'react';
import { Music, PenTool, Layout, Guitar, Settings, Trash2, PlusCircle, Info, Download, FileText, FileCode, File as FileIcon, LogIn, LogOut, Users, Loader2, Shield, User as UserIcon, Plus, Minus, RotateCcw, Zap } from 'lucide-react';
import LyricsEditor from './components/LyricsEditor';
import ArrangementPanel from './components/ArrangementPanel';
import CompositionPanel from './components/CompositionPanel';
import SettingsModal from './components/SettingsModal';
import { useLanguage } from './contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { auth, db, signInWithGoogle, logout } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, orderBy, getDocs, updateDoc } from 'firebase/firestore';

type Tab = 'lyrics' | 'arrangement' | 'composition';

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

interface Project {
  id: string;
  title: string;
  lyrics: string;
  topic: string;
  language: string;
  arrangementResult: string;
  compositionResult: string;
  arrangementIdea: string;
  compositionIdea: string;
  // New persistent fields
  selectedGenres?: string[];
  selectedInstruments?: string[];
  selectedVocals?: string[];
  selectedEffects?: string[];
  selectedRecordings?: string[];
  selectedCountries?: string[];
  musicians?: Musician[];
  backingVocals?: BackingVocal[];
  updatedAt: any;
}

export default function App() {
  const { t, isRTL } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [projectTitleInput, setProjectTitleInput] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('lyrics');
  const [lyrics, setLyrics] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Hebrew');
  const [arrangementResult, setArrangementResult] = useState('');
  const [compositionResult, setCompositionResult] = useState('');
  const [arrangementIdea, setArrangementIdea] = useState('');
  const [compositionIdea, setCompositionIdea] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [selectedVocals, setSelectedVocals] = useState<string[]>([]);
  const [selectedEffects, setSelectedEffects] = useState<string[]>([]);
  const [selectedRecordings, setSelectedRecordings] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [backingVocals, setBackingVocals] = useState<BackingVocal[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [projectKey, setProjectKey] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const isResizingSidebar = useRef(false);

  const startResizingSidebar = (e: React.MouseEvent) => {
    isResizingSidebar.current = true;
    document.addEventListener('mousemove', handleMouseMoveSidebar);
    document.addEventListener('mouseup', stopResizingSidebar);
  };

  const handleMouseMoveSidebar = (e: MouseEvent) => {
    if (!isResizingSidebar.current) return;
    const newWidth = isRTL ? window.innerWidth - e.clientX : e.clientX;
    setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
  };

  const stopResizingSidebar = () => {
    isResizingSidebar.current = false;
    document.removeEventListener('mousemove', handleMouseMoveSidebar);
    document.removeEventListener('mouseup', stopResizingSidebar);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setUserProfile(null);
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      setUserProfile(doc.data());
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!userProfile || userProfile.role !== 'admin') {
      setOnlineUsers([]);
      setAllUsers([]);
      return;
    }
    
    // Admin only: Online users
    const qOnline = query(collection(db, 'users'), where('isOnline', '==', true));
    const unsubOnline = onSnapshot(qOnline, (snapshot) => {
      setOnlineUsers(snapshot.docs.map(doc => doc.data()));
    });

    // Admin only: All users for management
    const qAll = query(collection(db, 'users'));
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data()));
    });

    return () => {
      unsubOnline();
      unsubAll();
    };
  }, [userProfile]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      return;
    }
    const q = query(
      collection(db, 'projects'), 
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projs);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveProject = async () => {
    if (!user) return;
    
    // If it's a new project and we don't have a title yet, show modal
    if (!currentProjectId && !projectTitleInput) {
      setShowSaveModal(true);
      return;
    }

    setIsSaving(true);
    try {
      const projectData = {
        userId: user.uid,
        title: projectTitleInput || topic || 'Untitled Project',
        lyrics,
        topic,
        language,
        arrangementResult,
        compositionResult,
        arrangementIdea,
        compositionIdea,
        selectedGenres,
        selectedInstruments,
        selectedVocals,
        selectedEffects,
        selectedRecordings,
        selectedCountries,
        musicians,
        backingVocals,
        updatedAt: new Date().toISOString()
      };

      if (currentProjectId) {
        await updateDoc(doc(db, 'projects', currentProjectId), projectData);
      } else {
        const docRef = await addDoc(collection(db, 'projects'), projectData);
        setCurrentProjectId(docRef.id);
      }
      setShowSaveModal(false);
    } catch (error) {
      console.error("Error saving project:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setProjectTitleInput(project.title);
    setLyrics(project.lyrics || '');
    setTopic(project.topic || '');
    setLanguage(project.language || 'Hebrew');
    setArrangementResult(project.arrangementResult || '');
    setCompositionResult(project.compositionResult || '');
    setArrangementIdea(project.arrangementIdea || '');
    setCompositionIdea(project.compositionIdea || '');
    setSelectedGenres(project.selectedGenres || []);
    setSelectedInstruments(project.selectedInstruments || []);
    setSelectedVocals(project.selectedVocals || []);
    setSelectedEffects(project.selectedEffects || []);
    setSelectedRecordings(project.selectedRecordings || []);
    setSelectedCountries(project.selectedCountries || []);
    setMusicians(project.musicians || []);
    setBackingVocals(project.backingVocals || []);
    setShowHistory(false);
    setActiveTab('lyrics');
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', id));
      if (currentProjectId === id) {
        setCurrentProjectId(null);
      }
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  const exportProject = (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const content = `MUSEAI PROJECT EXPORT: ${proj.title}\n\nLYRICS:\n${proj.lyrics}\n\nARRANGEMENT:\n${proj.arrangementResult}\n\nCOMPOSITION:\n${proj.compositionResult}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const incrementUsage = async () => {
    if (!user || !userProfile) return;
    if (userProfile.role === 'admin') return; // Admin has no limit
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        usageCount: (userProfile.usageCount || 0) + 1
      });
    } catch (error) {
      console.error("Error incrementing usage:", error);
    }
  };

  const updateUserLimit = async (userId: string, newLimit: number) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        usageLimit: newLimit
      });
    } catch (error) {
      console.error("Error updating user limit:", error);
    }
  };

  const resetUserUsage = async (userId: string, displayName: string) => {
    if (!confirm(`Reset usage for ${displayName}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { usageCount: 0 });
      alert(`Usage reset for ${displayName}`);
    } catch (error) {
      console.error("Error resetting usage:", error);
      alert("Failed to reset usage. Please check console for details.");
    }
  };

  const resetAllUsage = async () => {
    if (!confirm('Are you sure you want to reset usage for ALL users?')) return;
    try {
      const batch = allUsers.filter(u => u.role !== 'admin');
      for (const u of batch) {
        await updateDoc(doc(db, 'users', u.uid), { usageCount: 0 });
      }
      alert("All user usage counts have been reset to 0.");
    } catch (error) {
      console.error("Error resetting all usage:", error);
      alert("Failed to reset all usage. Some users may not have been updated.");
    }
  };

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
    setSelectedGenres([]);
    setSelectedInstruments([]);
    setSelectedVocals([]);
    setSelectedEffects([]);
    setSelectedRecordings([]);
    setSelectedCountries([]);
    setMusicians([]);
    setBackingVocals([]);
    setActiveTab('lyrics');
    setCurrentProjectId(null);
    setProjectTitleInput('');
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-studio-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-studio-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-studio-muted font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Studio...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-studio-bg text-studio-text flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-studio-accent/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-studio-accent/5 blur-[120px] rounded-full"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full studio-glass border border-studio-border p-10 rounded-3xl shadow-2xl relative z-10 flex flex-col items-center text-center"
        >
          <div className="flex flex-col items-center w-full">
            <img 
              src="/logo.png" 
              alt="Super Studio Producer" 
              className="h-32 object-contain mb-6" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('login-fallback-title');
                if (fallback) fallback.style.display = 'flex';
              }} 
            />
            <div id="login-fallback-title" className="hidden flex-col items-center w-full">
              <div className="bg-studio-accent p-4 rounded-2xl mb-6 shadow-lg shadow-studio-accent/20">
                <Music className="text-black" size={48} />
              </div>
              <h1 className="text-3xl font-bold mb-2 tracking-tight">{t('app.title')}</h1>
              <p className="text-xs uppercase tracking-[0.3em] text-studio-muted font-mono mb-8">{t('app.subtitle')}</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-gradient-to-r from-transparent via-studio-border to-transparent mb-8"></div>
          
          <p className="text-studio-muted mb-10 leading-relaxed text-sm">
            Welcome to the future of music production. Please sign in to access your professional studio environment.
          </p>
          
          <button 
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-studio-accent text-black font-bold py-4 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-studio-accent/10"
          >
            <LogIn size={20} />
            {t('btn.login') || 'Sign in with Google'}
          </button>
          
          <p className="mt-8 text-[10px] text-studio-muted uppercase tracking-widest font-mono">
            Secure Enterprise Access
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-bg text-studio-text flex flex-col">
      {/* Header */}
      <header className="border-bottom border-studio-border px-6 py-4 flex items-center justify-between studio-glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-2 hover:bg-studio-border rounded-lg transition-all text-studio-muted hover:text-white"
            title={isSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
          >
            <Layout size={20} />
          </button>
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="Super Studio Producer" 
              className="h-12 object-contain" 
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.getElementById('header-fallback-title');
                if (fallback) fallback.style.display = 'flex';
              }} 
            />
            <div id="header-fallback-title" className="hidden items-center gap-3">
              <div className="bg-studio-accent p-2 rounded-lg">
                <Music className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">{t('app.title')}</h1>
                <p className="text-[10px] uppercase tracking-[0.2em] text-studio-muted font-mono">{t('app.subtitle')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {userProfile?.role === 'admin' && (
            <button 
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all ${showAdminPanel ? 'bg-studio-accent text-black font-bold' : 'bg-studio-border hover:bg-studio-accent hover:text-black'}`}
            >
              <Shield size={16} />
              Admin Panel
            </button>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-xs bg-studio-border hover:bg-studio-accent hover:text-black px-3 py-2 rounded-lg transition-all"
              >
                <FileText size={16} />
                {t('btn.history')}
              </button>
              <button 
                onClick={handleSaveProject}
                disabled={isSaving}
                className="flex items-center gap-2 text-xs bg-studio-accent text-black font-bold px-3 py-2 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                {isSaving ? t('btn.saving') : t('btn.save')}
              </button>
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-4">
              {userProfile && (
                <div className="hidden sm:flex items-center gap-2 bg-studio-accent/10 border border-studio-accent/20 px-3 py-1.5 rounded-full">
                  <Zap size={12} className="text-studio-accent fill-studio-accent" />
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] uppercase text-studio-muted font-bold tracking-wider">Credits</span>
                    <span className="text-xs font-mono font-bold">
                      {userProfile.usageLimit >= 999999 ? '∞' : `${userProfile.usageLimit - userProfile.usageCount} / ${userProfile.usageLimit}`}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold">{user.displayName}</span>
                  <button onClick={logout} className="text-[10px] text-studio-muted hover:text-red-500 flex items-center gap-1">
                    <LogOut size={10} /> {t('btn.logout') || 'Logout'}
                  </button>
                </div>
                <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full border border-studio-border" referrerPolicy="no-referrer" />
              </div>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-2 text-xs bg-studio-accent text-black font-bold px-4 py-2 rounded-lg hover:bg-opacity-90 transition-all"
            >
              <LogIn size={16} />
              {t('btn.login') || 'Login with Google'}
            </button>
          )}

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

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Admin Panel Overlay */}
        <AnimatePresence>
          {showAdminPanel && userProfile?.role === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 bg-studio-bg/95 z-[70] p-8 overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Shield className="text-studio-accent" />
                    User Management Control
                  </h2>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={resetAllUsage}
                      className="flex items-center gap-2 text-xs bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg transition-all font-bold"
                    >
                      <RotateCcw size={14} />
                      Reset All Usage
                    </button>
                    <button onClick={() => setShowAdminPanel(false)} className="text-studio-muted hover:text-white text-2xl">×</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {allUsers.map((u) => (
                    <div key={u.uid} className="bg-studio-card border border-studio-border p-6 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src={u.photoURL} alt="" className="w-12 h-12 rounded-full border border-studio-border" />
                        <div>
                          <p className="font-bold">{u.displayName} {u.uid === user.uid && <span className="text-studio-accent text-[10px] ml-2">(YOU)</span>}</p>
                          <p className="text-xs text-studio-muted">{u.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-green-500' : 'bg-studio-muted'}`}></span>
                            <span className="text-[10px] uppercase font-mono">{u.isOnline ? 'Online' : 'Offline'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center mr-4">
                          <p className="text-[10px] uppercase text-studio-muted mb-1">Usage</p>
                          <p className="font-mono text-sm">{u.usageCount} / {u.usageLimit >= 999999 ? '∞' : u.usageLimit}</p>
                        </div>

                        {u.role !== 'admin' && (
                          <div className="flex items-center gap-2 mr-4">
                            <div className="flex items-center gap-1 bg-studio-bg p-1 rounded-lg border border-studio-border">
                              <button 
                                onClick={() => updateUserLimit(u.uid, Math.max(0, u.usageLimit - 5))}
                                className="p-1 hover:text-studio-accent transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-xs font-bold min-w-[1.5rem] text-center">{u.usageLimit}</span>
                              <button 
                                onClick={() => updateUserLimit(u.uid, u.usageLimit + 5)}
                                className="p-1 hover:text-studio-accent transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button 
                              onClick={() => resetUserUsage(u.uid, u.displayName)}
                              className="p-2 bg-studio-border hover:bg-studio-accent hover:text-black rounded-lg transition-all"
                              title="Reset Usage"
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        )}

                        {u.uid !== user.uid && (
                          <button 
                            onClick={async () => {
                              if (confirm(`Are you sure you want to DELETE user ${u.displayName}? This cannot be undone.`)) {
                                try {
                                  await deleteDoc(doc(db, 'users', u.uid));
                                } catch (err) {
                                  console.error("Error deleting user:", err);
                                }
                              }
                            }}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project History Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 100 : -100 }}
              className={`absolute inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-80 bg-studio-card border-${isRTL ? 'l' : 'r'} border-studio-border z-[60] shadow-2xl flex flex-col`}
            >
              <div className="p-6 border-b border-studio-border flex justify-between items-center bg-studio-bg/50">
                <h2 className="font-bold flex items-center gap-2">
                  <FileText size={18} className="text-studio-accent" />
                  {t('history.title')}
                </h2>
                <button onClick={() => setShowHistory(false)} className="text-studio-muted hover:text-white">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {projects.length === 0 ? (
                  <div className="text-center py-10 text-studio-muted text-xs font-mono opacity-50">
                    {t('history.empty')}
                  </div>
                ) : (
                  projects.map((proj) => (
                    <div 
                      key={proj.id}
                      onClick={() => loadProject(proj)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group ${currentProjectId === proj.id ? 'bg-studio-accent/10 border-studio-accent' : 'bg-studio-bg/30 border-studio-border hover:border-studio-muted'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold truncate flex-1 pr-2">{proj.title}</h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={(e) => exportProject(proj, e)}
                            className="text-studio-muted hover:text-studio-accent opacity-0 group-hover:opacity-100 transition-all"
                            title={t('history.export')}
                          >
                            <Download size={14} />
                          </button>
                          <button 
                            onClick={(e) => deleteProject(proj.id, e)}
                            className="text-studio-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-studio-muted font-mono">
                        <span>{t('history.date')}: {new Date(proj.updatedAt).toLocaleDateString()}</span>
                        <span className="bg-studio-border px-1.5 py-0.5 rounded uppercase">{proj.language}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar Navigation */}
        <nav 
          className={`${isSidebarCollapsed ? 'hidden' : 'hidden md:flex'} flex-col p-4 gap-2 bg-studio-bg relative ${isRTL ? 'border-l' : 'border-r'} border-studio-border transition-[width] duration-300 ease-in-out`}
          style={{ width: `${sidebarWidth}px` }}
        >
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
          
          <div className="mt-auto pt-4 border-t border-studio-border flex flex-col gap-4">
            {userProfile?.role === 'admin' && (
              <div className="bg-studio-card/50 rounded-xl p-4 border border-studio-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-studio-muted font-mono flex items-center gap-2">
                    <Users size={12} /> {t('status.online') || 'Online Users'}
                  </p>
                  <span className="text-[10px] bg-studio-accent text-black px-1.5 rounded-full font-bold">{onlineUsers.length}</span>
                </div>
                <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                  {onlineUsers.map((u, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="truncate">{u.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userProfile && userProfile.role !== 'admin' && (
              <div className="bg-studio-card/30 rounded-xl p-4 border border-studio-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={12} className="text-studio-accent fill-studio-accent" />
                  <p className="text-[10px] uppercase tracking-widest text-studio-muted font-mono">Credits Balance</p>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-xl font-bold font-mono">
                    {userProfile.usageLimit - userProfile.usageCount}
                    <span className="text-studio-muted text-xs font-normal ml-1">remaining</span>
                  </span>
                  <div className="w-24 h-1 bg-studio-border rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-studio-accent transition-all duration-500" 
                      style={{ width: `${Math.max(0, Math.min(100, ((userProfile.usageLimit - userProfile.usageCount) / userProfile.usageLimit) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-studio-card rounded-xl p-4 border border-studio-border">
              <p className="text-[10px] uppercase tracking-widest text-studio-muted mb-2 font-mono">{t('status.project')}</p>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>{t('status.ready')}</span>
              </div>
            </div>
          </div>

          {/* Sidebar Resize Handle */}
          <div 
            className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-studio-accent transition-colors z-20 ${isRTL ? 'left-0' : 'right-0'} group`}
            onMouseDown={startResizingSidebar}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-studio-border group-hover:bg-studio-accent/50 transition-colors" />
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
                  usageCount={userProfile?.usageCount || 0}
                  usageLimit={userProfile?.usageLimit || 0}
                  isAdmin={userProfile?.role === 'admin'}
                  onAction={incrementUsage}
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
                  usageCount={userProfile?.usageCount || 0}
                  usageLimit={userProfile?.usageLimit || 0}
                  isAdmin={userProfile?.role === 'admin'}
                  onAction={incrementUsage}
                  selectedGenres={selectedGenres}
                  setSelectedGenres={setSelectedGenres}
                  selectedInstruments={selectedInstruments}
                  setSelectedInstruments={setSelectedInstruments}
                  selectedVocals={selectedVocals}
                  setSelectedVocals={setSelectedVocals}
                  selectedEffects={selectedEffects}
                  setSelectedEffects={setSelectedEffects}
                  selectedRecordings={selectedRecordings}
                  setSelectedRecordings={setSelectedRecordings}
                  selectedCountries={selectedCountries}
                  setSelectedCountries={setSelectedCountries}
                  musicians={musicians}
                  setMusicians={setMusicians}
                  backingVocals={backingVocals}
                  setBackingVocals={setBackingVocals}
                  onSaveProject={handleSaveProject}
                  isSaving={isSaving}
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
                  usageCount={userProfile?.usageCount || 0}
                  usageLimit={userProfile?.usageLimit || 0}
                  isAdmin={userProfile?.role === 'admin'}
                  onAction={incrementUsage}
                  onSaveProject={handleSaveProject}
                  isSaving={isSaving}
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

      {/* Save Project Modal */}
      <AnimatePresence>
        {showSaveModal && (
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
              <div className="flex items-center gap-4 mb-6 text-studio-accent">
                <Download size={32} />
                <h2 className="text-xl font-bold">{t('modal.save.title')}</h2>
              </div>
              <input 
                autoFocus
                value={projectTitleInput}
                onChange={(e) => setProjectTitleInput(e.target.value)}
                placeholder={t('modal.save.placeholder')}
                className="w-full bg-studio-bg border border-studio-border rounded-xl p-4 mb-8 focus:outline-none focus:border-studio-accent transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
              />
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-studio-border hover:bg-studio-muted/20 transition-all font-medium"
                >
                  {t('modal.new.cancel')}
                </button>
                <button 
                  onClick={handleSaveProject}
                  disabled={!projectTitleInput || isSaving}
                  className="flex-1 px-6 py-3 rounded-xl bg-studio-accent hover:bg-opacity-90 text-black transition-all font-bold disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('btn.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
