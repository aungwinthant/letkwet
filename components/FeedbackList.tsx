
import React, { useEffect, useState } from 'react';
import { Feedback } from '../types';
import { fetchFeedbacks } from '../services/geminiService';

interface FeedbackListProps {
  onClose: () => void;
}

const FeedbackList: React.FC<FeedbackListProps> = ({ onClose }) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchFeedbacks();
        setFeedbacks(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Beta Insights: User Feedback</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <p className="text-slate-500">Loading insights...</p>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No feedback received yet.</div>
          ) : (
            feedbacks.map((f, i) => (
              <div key={f.id || i} className="p-4 bg-slate-800/50 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-indigo-300">{f.song_title || 'Unknown Song'}</h4>
                    <p className="text-xs text-slate-500 italic">Query: {f.input_query}</p>
                  </div>
                  <div className="flex text-yellow-400 text-sm">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <span key={idx}>{f.rating > idx ? '★' : '☆'}</span>
                    ))}
                  </div>
                </div>
                <p className="text-slate-300 text-sm">{f.comment}</p>
                <div className="text-[10px] text-slate-600 font-mono">
                  {f.created_at ? new Date(f.created_at).toLocaleString() : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackList;
