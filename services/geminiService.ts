import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { SongData, Feedback } from "../types";

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
       1. ACCURACY FIRST: Ensure 90%+ accuracy in chord placement and lyrics
       2. IDENTITY RULE: If a YouTube URL is provided, identify that EXACT video from metadata using Google Search grounding
       3. NO SUBSTITUTIONS: Never substitute with a popular version if it differs from the video provided
       4. SPECIAL VERSIONS: For live versions, acoustic versions, or covers, transcribe THAT specific performance
       5. CHORD VALIDATION: Double-check all chord positions align with lyrics/vocals
       6. LYRICS ACCURACY: Ensure lyrics are transcribed correctly with proper capitalization and punctuation
       7. FORMAT: Use standard ChordPro format with proper [CHORD] notation
       
       Output format: Valid ChordPro JSON with high accuracy standards.`
    : `Fast Mode: Extract chords from your internal knowledge. If a link is provided, infer the song title from the link text. Prioritize speed over exhaustive accuracy.`;

  const prompt = isValidYoutubeUrl(trimmedInput)
    ? `YOUTUBE VIDEO TRANSCRIPTION TASK:
       URL: ${trimmedInput}
       
       STEP 1: Search for this exact YouTube video using Google Search to get:
       - Exact video title
       - Artist name
       - Video duration
       - Whether it's original, live, acoustic, or cover version
       
       STEP 2: Transcribe the chords and lyrics for THIS SPECIFIC VIDEO with 90%+ accuracy:
       - Extract each chord [C], [G], [Am], etc. in the correct position above the lyrics
       - Include all verses, choruses, and sections
       - Maintain the structure: Title, Artist, Key, ChordPro format
       
       STEP 3: Return properly formatted ChordPro:
       {title: "Exact Video Title", artist: "Artist Name", key: "Key (if known)", releaseDate: "Year if available", chordProContent: "full ChordPro content"}
       
       CRITICAL: Match THIS video exactly, not a similar song by the same artist.`
    : `SONG NAME TRANSCRIPTION TASK:
       Song Query: "${trimmedInput}"
       
       Transcribe the most well-known version of this song with accurate chords and lyrics:
       - Extract chords in proper [CHORD] notation
       - Include verses, choruses, and sections
       - Return ChordPro format with title, artist, key, and content
       
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
  
  // Validate music content
  if (!parsed.chordProContent || parsed.chordProContent.trim() === '') {
    throw new Error("This doesn't appear to be a music/song. Please provide a valid YouTube video of a song or a song name.");
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