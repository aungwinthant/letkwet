import React, { useState } from 'react';
import { SongData } from '../types';

interface ChordProViewerProps {
  data: SongData;
}

const ChordProViewer: React.FC<ChordProViewerProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const content = data.chordProContent || '';
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = data.chordProContent || '';
    if (!content) return;
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${(data.title || 'song').replace(/\s+/g, '_')}.cho`;
    document.body.appendChild(element);
    element.click();
  };

  const handleFacebookShare = () => {
    const currentUrl = new URL(window.location.href);
    const shareUrl = encodeURIComponent(currentUrl.toString());
    const quote = encodeURIComponent(`I just converted "${data.title}" by ${data.artist} to ChordPro using LETKWET! Check out these chords.`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${quote}`, 'facebook-share-dialog', 'width=626,height=436');
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-4 md:mt-8 bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 font-results">
      {/* Header Info */}
      <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl md:text-2xl font-bold text-white leading-tight">{data.title || 'Untitled'}</h2>
            {data.isCached && (
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[8px] md:text-[10px] font-bold uppercase tracking-wider">
                Cached
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-400 font-medium">
            <span>{data.artist || 'Unknown Artist'}</span>
            {data.releaseDate && <span className="text-slate-600">•</span>}
            {data.releaseDate && <span>{data.releaseDate}</span>}
            {data.key && (
              <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px] uppercase tracking-wider font-bold">
                {data.key}
              </span>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button 
            onClick={handleFacebookShare}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg text-xs font-bold transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Share
          </button>
          <button 
            onClick={handleCopy}
            className="flex-1 md:flex-none px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button 
            onClick={handleDownload}
            className="flex-1 md:flex-none px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
          >
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download
          </button>
        </div>
      </div>
      
      {/* Viewer Content - ChordPro Source Only */}
      <div className="p-4 md:p-8 bg-slate-50 overflow-x-auto">
        <h3 className="text-xs md:text-sm font-bold text-slate-700 uppercase tracking-widest mb-4 px-2">ChordPro Format</h3>
        <div className="bg-slate-900 rounded-lg p-4 md:p-6 overflow-auto max-h-[600px]">
          <pre className="mono text-[11px] md:text-[13px] text-indigo-300/80 leading-relaxed whitespace-pre-wrap font-mono">
            {data.chordProContent || '# No content available'}
          </pre>
        </div>
      </div>

      {/* Grounding Sources */}
      {(data.sourceUrls || []).length > 0 && (
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <h4 className="text-[8px] md:text-[10px] font-bold text-slate-500 mb-2 px-1 uppercase tracking-wider">Identity Verification Sources:</h4>
          <div className="flex flex-wrap gap-2 px-1">
            {data.sourceUrls.map((url, i) => (
              <a 
                key={i} 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[8px] md:text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded transition-colors truncate max-w-[140px] border border-slate-700/50"
              >
                {new URL(url).hostname.replace('www.', '')}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChordProViewer;