import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { SongData, Feedback, YouTubeSearchResult } from "../types";

const getEnv = (key: string): string => {
  try {
    // Direct access to import.meta.env (Vite will replace these at build time)
    if (key === 'API_KEY' || key === 'GEMINI_API_KEY') {
      // @ts-ignore - Vite will replace this
      return import.meta.env.GEMINI_API_KEY || '';
    }
    if (key === 'SUPABASE_URL') {
      // @ts-ignore - Vite will replace this
      return import.meta.env.SUPABASE_URL || '';
    }
    if (key === 'SUPABASE_ANON_KEY') {
      // @ts-ignore - Vite will replace this
      return import.meta.env.SUPABASE_ANON_KEY || '';
    }
    return '';
  } catch {
    return '';
  }
};

const supabaseUrl = getEnv("SUPABASE_URL");
const supabaseAnonKey = getEnv("SUPABASE_ANON_KEY");

// Initialize Supabase only if keys exist
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("LETKWET: Supabase connection not established. Check SUPABASE_URL and SUPABASE_ANON_KEY.", {
    url: supabaseUrl ? "✓ configured" : "✗ missing",
    key: supabaseAnonKey ? "✓ configured" : "✗ missing"
  });
} else {
  console.log("LETKWET: Supabase connected successfully.");
}

const getAI = () => {
  const apiKey = getEnv("API_KEY");
  if (!apiKey) throw new Error("API_KEY is not configured.");
  return new GoogleGenAI({ apiKey });
};

const extractJson = (text: string) => {
  if (!text) throw new Error("Empty AI response.");
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {}
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        return JSON.parse(trimmed.substring(start, end + 1));
      } catch (e) {}
    }
    throw new Error("Invalid format returned by AI.");
  }
};

const generateMetaKey = (title: string, artist: string, releaseDate?: string): string => {
  const slugify = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return `${slugify(artist)}:${slugify(title)}:${slugify(releaseDate || 'unknown')}`;
};

const normalizeInputKey = (input: string): string => {
  const trimmedInput = input.trim();
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmedInput.match(ytRegex);
  return match && match[1] ? `yt:${match[1]}` : `query:${trimmedInput.toLowerCase()}`;
};

// Validate if input is a valid YouTube URL
export const isValidYoutubeUrl = (input: string): boolean => {
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  return ytRegex.test(input.trim());
};

// Extract YouTube video ID from URL
const getYoutubeVideoId = (input: string): string | null => {
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = input.trim().match(ytRegex);
  return match && match[1] ? match[1] : null;
};

export const logSearch = async (query: string, isCached: boolean = false) => {
  if (!supabase) return;
  try {
    await supabase.from('search_logs').insert([{
      query,
      ip_address: 'web-client',
      user_agent: navigator.userAgent,
      is_cached: isCached
    }]);
  } catch (err) {
    // Non-blocking
    console.debug("Analytics log failed");
  }
};

export const convertYoutubeToChordPro = async (input: string, useDeepSearch: boolean = true): Promise<SongData> => {
  const trimmedInput = input.trim();
  
  // Validate input
  if (!trimmedInput) {
    throw new Error("Please enter a YouTube URL or song name.");
  }

  // If it looks like a YouTube URL, validate it
  if (trimmedInput.includes('youtube') || trimmedInput.includes('youtu.be')) {
    if (!isValidYoutubeUrl(trimmedInput)) {
      throw new Error("Invalid YouTube URL. Please provide a valid YouTube link (youtube.com or youtu.be).");
    }
  }

  const inputKey = normalizeInputKey(trimmedInput);

  // 1. Cache Check
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('song_cache')
        .select('*')
        .eq('input_key', inputKey)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        await logSearch(input, true);
        const d = data as any;
        return {
          title: d.title,
          artist: d.artist,
          releaseDate: d.release_date,
          key: d.musical_key,
          chordProContent: d.chord_pro_content,
          sourceUrls: d.source_urls || [],
          isCached: true
        };
      }
    } catch (err) {
      console.warn("Supabase Lookup Error:", err);
    }
  }

  const ai = getAI();
  
  const systemInstruction = useDeepSearch 
    ? `You are an expert professional music transcriber with 20+ years of experience in chord transcription.
       
       CRITICAL RULES:
       1. CONFIDENCE REQUIREMENT: Only return transcriptions you are confident about. If uncertain, return {"error": "Unable to confidently identify or transcribe this song. Please try another song or provide a clearer source."}
       2. ACCURACY FIRST: Maintain 95%+ accuracy in chord placement and lyrics. Better to decline than to guess.
       3. IDENTITY RULE: If a YouTube URL is provided, search for and identify that EXACT video using Google Search grounding
       4. NO SUBSTITUTIONS: Never substitute with a similar/popular version if it differs from the provided source
       5. SPECIAL VERSIONS: For live versions, acoustic versions, or covers, transcribe THAT specific performance exactly
       6. CHORD VALIDATION: Verify all chord positions align with lyrics/vocals. If you cannot verify, mark uncertain sections as [Unknown]
       7. LYRICS ACCURACY: Transcribe lyrics exactly as performed, with proper capitalization and punctuation
       8. FORMAT: Use standard ChordPro format with proper [CHORD] notation
       9. UNKNOWN HANDLING: If any section is uncertain, mark it as [Unknown] rather than guessing
       10. VERIFICATION: Cross-reference chords with known versions to ensure correctness before returning
       
       Output format: Valid ChordPro JSON with high accuracy standards OR error response if uncertain.`
    : `Fast Mode: Extract chords from your most reliable internal knowledge only. Decline if unsure. If a link is provided, infer the song title from context. Only return results you are confident about. If uncertain, return an error instead of guessing.`;

  const prompt = isValidYoutubeUrl(trimmedInput)
    ? `YOUTUBE VIDEO TRANSCRIPTION TASK:
       URL: ${trimmedInput}
       
       REQUIRED VERIFICATION STEPS:
       1. Search for this exact YouTube video to confirm:
          - Exact video title (must match the video)
          - Artist name
          - Video duration
          - Whether it's original, live, acoustic, or cover
          - That it is actually a MUSIC/SONG video (not talking, podcast, etc.)
       
       2. Only proceed if you can verify this is a legitimate song video
       
       3. Transcribe chords and lyrics ONLY FOR THIS SPECIFIC VIDEO:
          - Extract each chord [C], [G], [Am], etc. in correct position
          - Include all verses, choruses, bridges, and pre-choruses
          - Preserve the exact performance (if live, transcribe live version)
       
       4. VALIDATION: Before returning, verify:
          - Chords sound correct when played mentally
          - Lyrics match the video content
          - Song structure is logical
          - If ANY doubt exists, use [Unknown] for that chord/section
       
       RESPONSE OPTIONS:
       A) If confident (95%+ sure): Return ChordPro JSON with accurate content
       B) If less confident: Return {"error": "Unable to confidently transcribe this video. Try providing a more popular song or clearer source."}
       C) If not a song: Return {"error": "This does not appear to be a music video."}
       
       Return JSON format: {title, artist, key, releaseDate, chordProContent}`
    : `SONG NAME TRANSCRIPTION TASK:
       Song Query: "${trimmedInput}"
       
       VERIFICATION STEPS:
       1. Identify if this is a well-known, established song (not obscure)
       2. Use your most reliable knowledge sources only
       3. Transcribe the MOST WELL-KNOWN/ORIGINAL version ONLY
       4. Transcribe with accuracy:
          - Extract chords in proper [CHORD] notation
          - Include verses, choruses, bridges, and pre-choruses
          - Verify structure makes musical sense
       
       5. VALIDATION BEFORE RETURNING:
          - Confirm chords progression sounds correct
          - Verify lyrics are accurate to known versions
          - If uncertain about any section, mark as [Unknown]
       
       RESPONSE OPTIONS:
       A) If confident (95%+): Return ChordPro JSON
       B) If less confident: Return {"error": "Not familiar enough with this song to provide accurate chords. Try a more well-known song."}
       
       Return JSON: {title, artist, key, releaseDate, chordProContent}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: useDeepSearch ? [{ googleSearch: {} }] : [],
      thinkingConfig: { thinkingBudget: useDeepSearch ? 20000 : 0 },
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          artist: { type: Type.STRING },
          releaseDate: { type: Type.STRING },
          key: { type: Type.STRING },
          chordProContent: { type: Type.STRING },
        },
        required: ["title", "artist", "chordProContent"],
      },
    },
  });

  await logSearch(trimmedInput, false);
  const parsed = extractJson(response.text || "{}");
  
  // Check for error response from model
  if (parsed.error) {
    throw new Error(parsed.error);
  }
  
  // Validate music content
  if (!parsed.chordProContent || parsed.chordProContent.trim() === '') {
    throw new Error("Could not extract chords for this song. Try searching for a more popular song or a clearer YouTube video.");
  }
  
  if (parsed.title === "Unknown Song" && isValidYoutubeUrl(trimmedInput)) {
    throw new Error("Could not identify the song from the YouTube URL. Please ensure the video is of a song and try again.");
  }
  
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const sourceUrls: string[] = groundingChunks
    .map((chunk: any) => chunk.web?.uri)
    .filter((uri: string | undefined): uri is string => !!uri);

  const songData: SongData = {
    title: parsed.title || "Unknown Song",
    artist: parsed.artist || "Unknown Artist",
    releaseDate: parsed.releaseDate,
    key: parsed.key,
    chordProContent: parsed.chordProContent || "",
    sourceUrls: Array.from(new Set(sourceUrls)),
    isCached: false
  };

  // 3. Save to Cache
  if (supabase && songData.chordProContent && songData.title !== "Unknown Song") {
    try {
      const metaKey = generateMetaKey(songData.title, songData.artist, songData.releaseDate);
      
      const { error: upsertError } = await supabase.from('song_cache').upsert({
        input_key: inputKey,
        meta_key: metaKey,
        title: songData.title,
        artist: songData.artist,
        release_date: songData.releaseDate,
        musical_key: songData.key,
        chord_pro_content: songData.chordProContent,
        source_urls: songData.sourceUrls,
        updated_at: new Date().toISOString()
      }, { onConflict: 'meta_key' });

      if (upsertError) {
        console.error("Supabase Persistence Failed:", upsertError.message, upsertError.details);
      } else {
        console.log("LETKWET: Successfully cached generation to Supabase.");
      }
    } catch (err) {
      console.warn("Cache Persistence Exception:", err);
    }
  }

  return songData;
};

export const fetchRecentSongs = async (limit: number = 6): Promise<SongData[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('song_cache')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((d: any) => ({
      title: d.title,
      artist: d.artist,
      releaseDate: d.release_date,
      key: d.musical_key,
      chordProContent: d.chord_pro_content,
      sourceUrls: d.source_urls || [],
      isCached: true
    }));
  } catch (err) {
    console.error("Library Fetch Failed:", err);
    return [];
  }
};

export const submitFeedback = async (feedback: Feedback) => {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('feedbacks').insert([feedback]);
    if (error) throw error;
  } catch (err) {
    console.error("Feedback Submission Failed:", err);
  }
};

export const fetchFeedbacks = async (): Promise<Feedback[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Feedback Fetch Failed:", err);
    return [];
  }
};

// Search cache by song title and artist (full-text search)
export const searchCacheSongs = async (query: string, limit: number = 10): Promise<SongData[]> => {
  if (!supabase) return [];
  try {
    const searchTerm = query.toLowerCase().trim();
    if (!searchTerm) return [];

    const { data, error } = await supabase
      .from('song_cache')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%`)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((d: any) => ({
      title: d.title,
      artist: d.artist,
      releaseDate: d.release_date,
      key: d.musical_key,
      chordProContent: d.chord_pro_content,
      sourceUrls: d.source_urls || [],
      isCached: true
    }));
  } catch (err) {
    console.error("Cache Search Failed:", err);
    return [];
  }
};

// Search YouTube for songs (using Gemini with Google Search)
export const searchYoutubeSongs = async (query: string, limit: number = 8): Promise<YouTubeSearchResult[]> => {
  try {
    const ai = getAI();
    
    const searchPrompt = `Search YouTube for the song: "${query}"
    
    Return the top ${limit} results as a JSON array. For each result, include:
    - id: YouTube video ID (extract from the URL)
    - title: Video title
    - artist: Artist name (extract if possible)
    - duration: Duration if available
    - url: Full YouTube URL
    
    Format: [{"id": "...", "title": "...", "artist": "...", "duration": "...", "url": "https://www.youtube.com/watch?v=..."}]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const parsed = extractJson(response.text || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("YouTube Search Failed:", err);
    return [];
  }
};