import React, { useState, useEffect, useRef } from 'react';
import { AppStatus, SongData, SearchResults } from './types';
import { convertYoutubeToChordPro, fetchRecentSongs, searchCacheSongs } from './services/geminiService';
import ChordProViewer from './components/ChordProViewer';
import FeedbackModal from './components/FeedbackModal';
import RecentConversions from './components/RecentConversions';

type ViewMode = 'HOME' | 'RESULT' | 'RECENT' | 'SEARCH_RESULTS';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [result, setResult] = useState<SongData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentSongs, setRecentSongs] = useState<SongData[]>([]);
  const [useDeepSearch, setUseDeepSearch] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Feedback States
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackContext, setFeedbackContext] = useState<{song: SongData | null, query: string}>({ song: null, query: '' });
  const [lastProcessedQuery, setLastProcessedQuery] = useState('');

  const hasLoadedUrlParam = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query && !hasLoadedUrlParam.current) {
      hasLoadedUrlParam.current = true;
      setInput(query);
      handleConversion(query);
    }
  }, []);

  useEffect(() => {
    if (status === AppStatus.SUCCESS && lastProcessedQuery) {
      const url = new URL(window.location.href);
      url.searchParams.set('q', lastProcessedQuery);
      window.history.pushState({}, '', url.toString());
    }
  }, [status, lastProcessedQuery]);

  useEffect(() => {
    const loadRecent = async () => {
      try {
        if (viewMode === 'RECENT' || status === AppStatus.SUCCESS || status === AppStatus.IDLE) {
          const songs = await fetchRecentSongs(viewMode === 'RECENT' ? 24 : 6);
          setRecentSongs(songs);
        }
      } catch (err) {
        console.warn("Failed to load recent library items", err);
      }
    };
    loadRecent();
  }, [status, viewMode]);

  const handleConversion = async (val: string) => {
    setStatus(AppStatus.LOADING);
    setViewMode('RESULT');
    setError(null);
    try {
      const data = await convertYoutubeToChordPro(val, useDeepSearch);
      setResult(data);
      setLastProcessedQuery(val);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error("Conversion error details:", err);
      setError(err?.message || 'Failed to extract chords. Make sure the input is a valid YouTube URL or song name.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleSearchInput = (val: string) => {
    setInput(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleConversion(input);
  };

  const handleRecentSelect = (song: SongData) => {
    setResult(song);
    const query = `${song.title} ${song.artist}`;
    setLastProcessedQuery(query);
    setViewMode('RESULT');
    setStatus(AppStatus.SUCCESS);
  };

  const resetToHome = () => {
    setStatus(AppStatus.IDLE);
    setViewMode('HOME');
    setResult(null);
    setError(null);
    setInput('');
    setSearchResults(null);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    window.history.pushState({}, '', url.toString());
  };

  const showRecentPage = () => {
    setViewMode('RECENT');
    setStatus(AppStatus.IDLE);
    setResult(null);
    setError(null);
  };

  const openConversionFeedback = () => {
    setFeedbackContext({ song: result, query: lastProcessedQuery });
    setIsFeedbackOpen(true);
  };

  const openGeneralFeedback = () => {
    setFeedbackContext({ song: null, query: 'General Footer Link' });
    setIsFeedbackOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Navbar / Header */}
      <header className="w-full max-w-6xl flex flex-col items-center mb-8 md:mb-12 text-center">
        <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 md:mb-12">
           <button onClick={resetToHome} className="flex items-center gap-3 group">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 group-hover:bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg transition-all">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter text-white group-hover:text-indigo-400 transition-colors uppercase">LETKWET</span>
           </button>

           <div className="flex gap-2 md:gap-4 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={resetToHome}
                className={`text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 md:px-5 py-2 rounded-lg transition-all ${viewMode === 'HOME' ? 'text-white bg-indigo-600' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Converter
              </button>
              <button 
                onClick={showRecentPage}
                className={`text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 md:px-5 py-2 rounded-lg transition-all ${viewMode === 'RECENT' ? 'text-white bg-indigo-600' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Library
              </button>
           </div>
        </div>

        {viewMode === 'HOME' && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500 px-2">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-tight">YouTube to ChordPro</h2>
            <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-lg mb-8">
              AI-powered harmonic extractor for Myanmar and International songs.
            </p>
          </div>
        )}

        {viewMode === 'RECENT' && (
           <div className="w-full text-left animate-in fade-in slide-in-from-left-4 duration-500 px-2">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 uppercase">Library</h2>
              <p className="text-slate-500 text-sm md:text-base font-medium">Browse verified conversions shared by the community.</p>
           </div>
        )}
      </header>

      {/* Main Search/Error/Loading Section */}
      {status !== AppStatus.SUCCESS && viewMode !== 'RECENT' && (
        <section className="w-full max-w-3xl mb-8 md:mb-12">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000 pointer-events-none"></div>
            
            <div className="relative bg-slate-900 border border-slate-700 p-1.5 md:p-2 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-2 z-10">
              <div className="flex items-center flex-grow pl-3">
                <div className="text-slate-500 hidden md:block mr-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="Paste URL or Song Title..."
                  className="bg-transparent border-none outline-none flex-grow text-white placeholder-slate-500 py-3 text-base md:text-lg w-full"
                  disabled={status === AppStatus.LOADING}
                />
              </div>
              <button 
                type="submit"
                disabled={status === AppStatus.LOADING || !input.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 px-6 md:px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              >
                {status === AppStatus.LOADING ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Generate'}
              </button>
            </div>
            
            <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 relative z-10 px-2">
               <button 
                type="button"
                onClick={() => setUseDeepSearch(true)}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                  useDeepSearch 
                  ? 'bg-indigo-600/30 border-indigo-400 text-indigo-100 shadow-lg shadow-indigo-500/20' 
                  : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                }`}
               >
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                 Deep Verification (Accurate)
               </button>
               <button 
                type="button"
                onClick={() => setUseDeepSearch(false)}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all border cursor-pointer active:scale-95 ${
                  !useDeepSearch 
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-500/20' 
                  : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                }`}
               >
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 Express Extract (Fast)
               </button>
            </div>
          </form>

          {status === AppStatus.LOADING && (
            <div className="mt-12 space-y-8 animate-pulse text-center px-4">
              <div className="space-y-3">
                <div className="h-2 bg-slate-800 rounded-full w-32 md:w-48 mx-auto"></div>
                <div className="h-6 bg-slate-800 rounded-lg w-full max-w-xs md:max-w-sm mx-auto"></div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-indigo-400 text-xs md:text-sm font-bold uppercase tracking-widest animate-pulse">
                  Thinking......
                </p>
                <p className="text-slate-500 text-[10px] md:text-xs font-mono max-w-xs mx-auto">
                  {useDeepSearch 
                    ? "Searching global databases and verifying harmonic structure..." 
                    : "Extracting chords from trained model weights (High Speed Mode)..."}
                </p>
              </div>
            </div>
          )}

          {status === AppStatus.ERROR && (
            <div className="mt-8 p-4 md:p-6 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-4 text-red-200 animate-in slide-in-from-top-2 mx-2">
              <div className="bg-red-500/20 p-2 rounded-lg hidden sm:block">
                <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-red-400 mb-1 text-sm md:text-base">Conversion Error</h4>
                <p className="text-xs md:text-sm opacity-90">{error}</p>
                <button 
                  onClick={() => setStatus(AppStatus.IDLE)}
                  className="mt-3 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:text-white transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* View Logic */}
      <main className="w-full max-w-6xl px-2">
        {viewMode === 'HOME' && status === AppStatus.IDLE && (
          <div className="space-y-16">
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-slate-800/50 pt-16">
              <div className="space-y-4 text-center md:text-left px-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto md:mx-0">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white">Advanced Reasoning</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Powered by Gemini 3 "Thinking" models to cross-verify chords against multiple professional databases.</p>
              </div>
              <div className="space-y-4 text-center md:text-left px-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto md:mx-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 9.188 16.524 5 20" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white">Burmese Native</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Full support for Myanmar songs with perfect Unicode rendering and traditional fingering extraction.</p>
              </div>
              <div className="space-y-4 text-center md:text-left px-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 mx-auto md:mx-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white">Verified Library</h3>
                <p className="text-slate-500 text-sm leading-relaxed">Results are cached to global library, saving API tokens and providing instant access for the community.</p>
              </div>
            </section>
          </div>
        )}

        {viewMode === 'SEARCH_RESULTS' && searchResults && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <button 
              onClick={() => setSearchResults(null)}
              className="mb-4 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors px-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Search
            </button>

            {/* Cache Results */}
            {searchResults.cacheResults.length > 0 && (
              <section>
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2 px-2">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  From Your Library
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.cacheResults.map((song, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setResult(song);
                        setViewMode('RESULT');
                        setStatus(AppStatus.SUCCESS);
                        setSearchResults(null);
                      }}
                      className="text-left p-4 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-emerald-500/50 hover:bg-slate-900/80 transition-all group"
                    >
                      <p className="font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-2">{song.title}</p>
                      <p className="text-slate-400 text-sm mb-2">{song.artist}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg>
                        From Cache
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!isSearching && searchResults.cacheResults.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">No songs found in library for "{searchResults.query}"</p>
                <p className="text-xs mt-2 text-slate-500">Try pasting a YouTube URL or searching for a different song.</p>
              </div>
            )}
          </div>
        )}

        {viewMode === 'RECENT' && (
           <RecentConversions 
             songs={recentSongs} 
             onSelect={handleRecentSelect} 
             isFullPage={true} 
           />
        )}

        {viewMode === 'RESULT' && status === AppStatus.SUCCESS && result && (
          <div className="animate-in fade-in duration-500">
            <button 
              onClick={() => setViewMode('HOME')}
              className="mb-4 text-slate-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors px-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Search
            </button>
            <ChordProViewer data={result} />
            <div className="mt-8 flex justify-center px-4">
               <button 
                onClick={openConversionFeedback}
                className="w-full sm:w-auto text-indigo-400 hover:text-indigo-300 text-xs md:text-sm font-bold flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition-all border border-indigo-500/20"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                 Report Issue
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto pt-16 pb-8 text-slate-600 text-[10px] md:text-xs flex flex-col items-center gap-4 w-full">
        <div className="flex gap-4 md:gap-8">
          <button onClick={resetToHome} className="hover:text-slate-400 transition-colors uppercase tracking-widest font-bold">Search</button>
          <button onClick={showRecentPage} className="hover:text-slate-400 transition-colors uppercase tracking-widest font-bold">Library</button>
          <button onClick={openGeneralFeedback} className="hover:text-indigo-400 transition-colors uppercase tracking-widest font-bold">Feedback</button>
        </div>
        <div className="opacity-50 font-mono tracking-tighter text-center px-4">LETKWET &bull; HARMONIC_EXTRACT_v4.0 &bull; GEMINI_3_REASONING</div>
      </footer>

      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
        songData={feedbackContext.song}
        inputQuery={feedbackContext.query}
      />
    </div>
  );
};

export default App;