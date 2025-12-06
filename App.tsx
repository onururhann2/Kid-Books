import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, ChevronLeft, ChevronRight, BookType, Loader2, RefreshCcw, Moon, Sun, Globe, ShieldCheck, User as UserIcon, LogOut, Crown, X, Check } from 'lucide-react';
import { generateStoryScript, generateIllustration, editIllustration, generateSpeech } from './services/gemini';
import { authService } from './services/auth';
import { playAudio } from './services/audio';
import StoryPage from './components/StoryPage';
import AuthModal from './components/AuthModal';
import SubscriptionModal from './components/SubscriptionModal';
import { AppState, Story, StoryPage as StoryPageType, Language, User } from './types';
import { translations } from './translations';
import confetti from 'canvas-confetti';

const DEFAULT_PAGES = 15;
const MAX_TOPIC_LENGTH = 80;

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [topic, setTopic] = useState("");
  const [character, setCharacter] = useState("");
  const [pageCount, setPageCount] = useState(DEFAULT_PAGES);
  const [story, setStory] = useState<Story | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  // Get current translations
  const t = translations[language];

  // Initialize Auth
  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  // Apply dark mode class to root div
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogin = (data: { username: string, email?: string, provider?: 'google' | 'apple' | 'microsoft' }) => {
    const newUser = authService.login(data);
    setUser(newUser);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    resetApp();
  };

  const handleUpgrade = () => {
    const upgradedUser = authService.upgradeToPremium();
    setUser(upgradedUser);
    setShowSubModal(false);
    alert("Welcome to Premium! You can now generate unlimited stories.");
  };

  const checkAuthAndStart = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (user.tier === 'FREE' && user.dailyGenerationsLeft <= 0) {
      setShowSubModal(true);
      return;
    }

    startGeneration();
  };

  const startGeneration = async () => {
    if (!topic) return;
    if (topic.length > MAX_TOPIC_LENGTH) {
      setError("Topic is too long. Please keep it under 80 characters.");
      setAppState(AppState.ERROR);
      return;
    }

    // Decrement credits in the DB (Localstorage)
    if (user) {
       const updatedUser = authService.decrementCredits();
       setUser(updatedUser);
    }

    setAppState(AppState.GENERATING_SCRIPT);
    setError(null);

    try {
      // 1. Generate Text Script with selected language and character
      const script = await generateStoryScript(topic, character, pageCount, language);
      
      const initialPages: StoryPageType[] = script.pages.map(p => ({
        ...p,
        isGeneratingImage: false
      }));

      const newStory: Story = {
        title: script.title,
        topic: topic,
        character: character,
        pages: initialPages
      };

      setStory(newStory);
      setAppState(AppState.GENERATING_IMAGES);
      setCurrentPageIndex(0); // Start at cover/first page

      // 2. Start Image Generation (One by one to allow progressive loading and avoid rate limits)
      generateImagesSequence(initialPages);

    } catch (err: any) {
      console.error(err);
      if (err.message === "STORY_BLOCKED_SAFETY") {
        setError(t.safetyError);
      } else {
        setError(err.message || "Failed to generate story.");
      }
      setAppState(AppState.ERROR);
    }
  };

  const generateImagesSequence = async (pages: StoryPageType[]) => {
    // Clone pages to local state for processing updates
    let currentPages = [...pages];

    for (let i = 0; i < currentPages.length; i++) {
      // Set status to generating
      setStory(prev => {
        if (!prev) return null;
        const newPages = [...prev.pages];
        newPages[i] = { ...newPages[i], isGeneratingImage: true };
        return { ...prev, pages: newPages };
      });

      try {
        const imageUrl = await generateIllustration(currentPages[i].imagePrompt);
        
        setStory(prev => {
          if (!prev) return null;
          const newPages = [...prev.pages];
          newPages[i] = { 
            ...newPages[i], 
            imageUrl, 
            isGeneratingImage: false 
          };
          return { ...prev, pages: newPages };
        });
      } catch (err) {
        console.error(`Failed to generate image for page ${i + 1}`, err);
        // Turn off loading state even if error
        setStory(prev => {
          if (!prev) return null;
          const newPages = [...prev.pages];
          newPages[i] = { ...newPages[i], isGeneratingImage: false };
          return { ...prev, pages: newPages };
        });
      }

      // Add a significant delay between image generations to avoid Rate Limits (429)
      // Gemini Flash Image can trigger limits if called too rapidly in succession.
      if (i < currentPages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4000));
      }
    }
    
    setAppState(AppState.READING);
  };

  const handleEditImage = async (pageIndex: number, editPrompt: string) => {
    if (!story) return;

    const page = story.pages[pageIndex];
    if (!page.imageUrl) return;

    // Set loading state
    setStory(prev => {
      if (!prev) return null;
      const newPages = [...prev.pages];
      newPages[pageIndex] = { ...newPages[pageIndex], isGeneratingImage: true };
      return { ...prev, pages: newPages };
    });

    try {
      const newImageUrl = await editIllustration(page.imageUrl, editPrompt);
       setStory(prev => {
          if (!prev) return null;
          const newPages = [...prev.pages];
          newPages[pageIndex] = { 
            ...newPages[pageIndex], 
            imageUrl: newImageUrl, 
            isGeneratingImage: false 
          };
          return { ...prev, pages: newPages };
        });
    } catch (err: any) {
      console.error("Failed to edit image", err);
      // Revert loading state
       setStory(prev => {
          if (!prev) return null;
          const newPages = [...prev.pages];
          newPages[pageIndex] = { ...newPages[pageIndex], isGeneratingImage: false };
          return { ...prev, pages: newPages };
        });
      
      if (err.message === "EDIT_BLOCKED_SAFETY") {
        alert(t.safetyError);
      } else {
        alert("Failed to edit image. Please try again.");
      }
    }
  };

  const handlePlayAudio = async (pageIndex: number) => {
    if (!story) return;
    const page = story.pages[pageIndex];

    // Check if we already have the audio data, if so, just play it
    if (page.audioBase64) {
      setStory(prev => {
        if (!prev) return null;
        const newPages = [...prev.pages];
        newPages[pageIndex] = { ...newPages[pageIndex], isGeneratingAudio: true }; // UI state for playing
        return { ...prev, pages: newPages };
      });
      
      await playAudio(page.audioBase64);

      setStory(prev => {
        if (!prev) return null;
        const newPages = [...prev.pages];
        newPages[pageIndex] = { ...newPages[pageIndex], isGeneratingAudio: false };
        return { ...prev, pages: newPages };
      });
      return;
    }

    // Otherwise generate it
    setStory(prev => {
      if (!prev) return null;
      const newPages = [...prev.pages];
      newPages[pageIndex] = { ...newPages[pageIndex], isGeneratingAudio: true };
      return { ...prev, pages: newPages };
    });

    try {
      const audioData = await generateSpeech(page.text, language);
      
      setStory(prev => {
        if (!prev) return null;
        const newPages = [...prev.pages];
        newPages[pageIndex] = { ...newPages[pageIndex], audioBase64: audioData }; // Keep loading state true while playing
        return { ...prev, pages: newPages };
      });

      await playAudio(audioData);

    } catch (err) {
      console.error("Failed to generate/play audio", err);
      alert("Could not generate audio narration.");
    } finally {
      setStory(prev => {
        if (!prev) return null;
        const newPages = [...prev.pages];
        newPages[pageIndex] = { ...newPages[pageIndex], isGeneratingAudio: false };
        return { ...prev, pages: newPages };
      });
    }
  };

  const nextPage = () => {
    if (story && currentPageIndex < story.pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setStory(null);
    setCurrentPageIndex(0);
    setError(null);
    setTopic("");
    setCharacter("");
  };

  const finishStory = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    // Wait a bit then reset
    setTimeout(() => {
        resetApp();
    }, 2000);
  }

  const isStoryMode = appState === AppState.GENERATING_IMAGES || appState === AppState.READING;
  const isLastPage = story && currentPageIndex === story.pages.length - 1;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 safe-top safe-bottom ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 text-gray-800'}`}>
      
      {/* Modals */}
      <AuthModal 
        isOpen={showAuthModal} 
        onLogin={handleLogin} 
        onClose={() => setShowAuthModal(false)}
        translations={t}
      />
      
      <SubscriptionModal 
        isOpen={showSubModal}
        onUpgrade={handleUpgrade}
        onClose={() => setShowSubModal(false)}
        translations={t}
        user={user}
      />

      {/* Header - Hidden in Story Mode */}
      {!isStoryMode && (
        <header className="p-4 md:p-6 flex items-center justify-between sticky top-0 z-30 bg-white/50 dark:bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg shadow-lg">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <h1 className="hidden sm:block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-600 dark:from-purple-400 dark:to-pink-400">
              {t.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* User Profile / Login */}
            {user ? (
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full pl-3 pr-1 py-1 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col text-right mr-2 hidden sm:flex">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{user.username}</span>
                    <span className={`text-[10px] uppercase font-bold ${user.tier === 'PREMIUM' ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500' : 'text-gray-500'}`}>
                      {user.tier === 'PREMIUM' ? t.premiumTier : t.freeTier}
                    </span>
                  </div>
                  
                  {user.tier === 'FREE' ? (
                    <button 
                      onClick={() => setShowSubModal(true)}
                      className="p-1.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white hover:shadow-lg transition-shadow"
                      title={t.upgrade}
                    >
                      <Crown size={14} />
                    </button>
                  ) : (
                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-full text-purple-600 dark:text-purple-300">
                      <UserIcon size={14} />
                    </div>
                  )}
                  
                  <button 
                    onClick={handleLogout}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    title={t.logout}
                  >
                    <LogOut size={14} />
                  </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-white rounded-full text-sm font-bold shadow-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t.login}
              </button>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="text-yellow-400 w-5 h-5" /> : <Moon className="text-gray-600 w-5 h-5" />}
            </button>
          </div>
        </header>
      )}

      {/* Story Mode Navigation (Minimal Top-Left Exit) */}
      {isStoryMode && (
        <div className="fixed top-4 left-4 z-50 safe-top">
          <button 
            onClick={resetApp}
            className="p-2 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-black transition-all shadow-sm group"
            title={t.createAnother}
          >
             <X size={24} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className={`container mx-auto px-4 flex flex-col items-center justify-center ${isStoryMode ? 'pt-4 pb-24 md:pb-8 min-h-screen' : 'py-8 min-h-[80vh]'}`}>
        
        {/* State: IDLE - Input Form */}
        {appState === AppState.IDLE && (
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-white/50 dark:border-gray-700 backdrop-blur-sm transition-colors duration-300 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Security Badge */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <ShieldCheck className="w-24 h-24" />
            </div>

            <div className="text-center mb-8 relative z-10">
              <div className="inline-block p-4 rounded-full bg-purple-100 dark:bg-purple-900/50 mb-4">
                <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t.createStory}</h2>
              <p className="text-gray-500 dark:text-gray-400">{t.desc}</p>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Language Selector */}
               <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Globe size={16} /> Language
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['en', 'tr', 'de', 'it'] as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setLanguage(lang)}
                      className={`py-2 px-1 rounded-lg border text-sm font-medium transition-all ${
                        language === lang
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.topicLabel}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    maxLength={MAX_TOPIC_LENGTH}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none bg-white text-gray-900 pr-16"
                    placeholder={t.topicPlaceholder}
                  />
                  <div className="absolute right-3 top-3 text-xs text-gray-400">
                    {topic.length}/{MAX_TOPIC_LENGTH}
                  </div>
                </div>
              </div>

              {/* Character Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.characterLabel}</label>
                <input
                    type="text"
                    value={character}
                    onChange={(e) => setCharacter(e.target.value)}
                    maxLength={50}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none bg-white text-gray-900"
                    placeholder={t.characterPlaceholder}
                  />
              </div>

              {/* Page Length Slider */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t.lengthLabel}: <span className="text-purple-600 dark:text-purple-400">{pageCount} {t.pages}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  value={pageCount}
                  onChange={(e) => setPageCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>{t.short} (3)</span>
                  <span>{t.long} (20)</span>
                </div>
              </div>

              <button
                onClick={checkAuthAndStart}
                disabled={!topic}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:from-purple-500 hover:to-pink-500"
              >
                <BookType className="w-5 h-5" />
                {t.generate}
              </button>
              
              {user && user.tier === 'FREE' && (
                <div className="space-y-3">
                  <div className="text-center text-xs text-gray-500">
                    {user.dailyGenerationsLeft > 0 
                      ? `${user.dailyGenerationsLeft} free story remaining today.` 
                      : t.limitReached}
                  </div>
                  
                  {/* Distinct Premium Upsell for Free Users */}
                  <button
                    onClick={() => setShowSubModal(true)}
                    className="w-full py-2 bg-gradient-to-r from-amber-200 to-yellow-400 dark:from-amber-600 dark:to-yellow-600 text-amber-900 dark:text-white rounded-lg font-bold text-sm shadow-sm hover:shadow-md transform hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <Crown size={16} />
                    {t.getPremium} ({t.pricePremium})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* State: GENERATING_SCRIPT - Loading Text */}
        {appState === AppState.GENERATING_SCRIPT && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-purple-600 dark:text-purple-400 animate-spin mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t.writing}</h3>
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">{t.drafting} "{topic}"</p>
          </div>
        )}

        {/* State: GENERATING_IMAGES or READING - Book View */}
        {(appState === AppState.GENERATING_IMAGES || appState === AppState.READING) && story && (
          <div className="w-full max-w-6xl flex flex-col items-center animate-in fade-in duration-700">
            
            {/* Story Display */}
            <StoryPage 
              page={story.pages[currentPageIndex]} 
              totalPageCount={story.pages.length} 
              pageIndex={currentPageIndex}
              onEditImage={handleEditImage}
              onPlayAudio={handlePlayAudio}
              translations={t}
            />

            {/* Navigation Controls - Responsive Sticky Bottom on Mobile */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 flex items-center justify-between md:relative md:bg-transparent md:border-0 md:mt-8 md:p-0 w-full max-w-2xl z-40 safe-bottom">
              <button
                onClick={prevPage}
                disabled={currentPageIndex === 0}
                className="p-3 md:p-4 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
              >
                <ChevronLeft size={24} />
              </button>

              <div className="text-center">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest bg-white/50 dark:bg-black/50 px-3 py-1 rounded-full">
                  {currentPageIndex + 1} / {story.pages.length}
                </span>
                {appState === AppState.GENERATING_IMAGES && (
                   <div className="flex items-center justify-center gap-2 mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                     <Loader2 size={12} className="animate-spin" />
                     {t.illustrating}
                   </div>
                )}
              </div>

              {isLastPage ? (
                <button
                    onClick={finishStory}
                    className="p-3 md:p-4 rounded-full bg-green-500 text-white shadow-md hover:bg-green-600 transition-colors transform hover:scale-105"
                >
                    <Check size={24} />
                </button>
              ) : (
                <button
                    onClick={nextPage}
                    disabled={currentPageIndex === story.pages.length - 1}
                    className="p-3 md:p-4 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-700 dark:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                >
                    <ChevronRight size={24} />
                </button>
              )}
            </div>

            {appState === AppState.READING && (
              <button 
                onClick={resetApp}
                className="mt-4 md:mt-12 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-2 text-sm font-medium transition-colors hidden md:flex"
              >
                <RefreshCcw size={16} />
                {t.createAnother}
              </button>
            )}
          </div>
        )}

        {/* State: ERROR */}
        {appState === AppState.ERROR && (
          <div className="text-center max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
            <div className="text-red-500 text-5xl mb-4">:(</div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t.error}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={resetApp}
              className="px-6 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors"
            >
              {t.tryAgain}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}