
import React from 'react';
import { SongData } from '../types';

interface RecentConversionsProps {
  songs: SongData[];
  onSelect: (song: SongData) => void;
  isFullPage?: boolean;
}

const RecentConversions: React.FC<RecentConversionsProps> = ({ songs, onSelect, isFullPage = false }) => {
  if (songs.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
        <div className="text-slate-600 mb-2">
          <svg className="w-12 h-12 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">The conversion library is currently empty.</p>
        <p className="text-slate-700 text-sm">Be the first to convert a song!</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${isFullPage ? 'animate-in fade-in duration-500' : 'mt-16 animate-in fade-in slide-in-from-bottom-6 duration-700'}`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className={`font-bold text-white tracking-tight ${isFullPage ? 'text-3xl' : 'text-xl'}`}>
          {isFullPage ? 'Song Library' : 'Recently Converted'}
        </h3>
        {!isFullPage && songs.length >= 6 && (
           <div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Showing Latest</div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {songs.map((song, idx) => (
          <button
            key={`${song.title}-${idx}`}
            onClick={() => onSelect(song)}
            className="group relative text-left p-5 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/60 rounded-2xl transition-all duration-300 flex flex-col gap-3 shadow-sm hover:shadow-indigo-500/10"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-grow">
                <h4 className="font-bold text-white text-lg line-clamp-1 group-hover:text-indigo-300 transition-colors leading-tight">
                  {song.title}
                </h4>
                <p className="text-sm text-slate-500 font-medium line-clamp-1">
                  {song.artist}
                </p>
              </div>
              <div className="p-2 bg-indigo-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                 <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                 </svg>
              </div>
            </div>
            
            <div className="flex items-center gap-2 pt-2 mt-auto border-t border-slate-800/50">
              {song.key && (
                <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-tighter">
                  {song.key}
                </span>
              )}
              {song.releaseDate && (
                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                  {song.releaseDate}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentConversions;
