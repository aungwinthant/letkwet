<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LETKWET - YouTube to ChordPro

An AI-powered harmonic extractor that converts YouTube songs into perfectly formatted ChordPro files. Uses Gemini 3 reasoning models with Google Search grounding for accurate chord verification, with full support for Myanmar (Burmese) songs and international hits.

## 🎸 Features

- **Advanced AI Reasoning**: Powered by Gemini 3 "Thinking" models to cross-verify chords against multiple professional databases
- **Burmese Native**: Full support for Myanmar songs with perfect Unicode rendering and traditional fingering extraction
- **Verified Library**: Results are cached to global library, saving API tokens and providing instant access for the community
- **Two Search Modes**:
  - 🔍 **Deep Verification** (Accurate): Uses Google Search grounding for comprehensive verification
  - ⚡ **Express Extract** (Fast): Extracts chords from trained model weights in high-speed mode
- **Supabase Integration**: All successful conversions are automatically saved to the database
- **Community Library**: Browse and access verified conversions shared by the community

## 🚀 Quick Start

### Run Locally

**Prerequisites:**
- Node.js 18+ 
- npm or yarn

1. **Clone and install:**
   ```bash
   git clone https://github.com/yourusername/letkwat.git
   cd letkwat
   npm install
   ```

2. **Set up environment variables** in [.env.local](.env.local):
   ```env
   GEMINI_API_KEY=your-gemini-api-key
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`

4. **Build for production:**
   ```bash
   npm run build
   npm run preview
   ```

## 📦 Deployment

### Deploy to Google Cloud Run

LETKWAT includes automated deployment via GitHub Actions to Google Cloud Run.

**Quick Setup:**
1. Follow the detailed guide in [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md)
2. Configure GitHub Secrets (GCP_PROJECT_ID, WIF_PROVIDER, WIF_SERVICE_ACCOUNT, etc.)
3. Push to `main` branch - deployment happens automatically!

**Features:**
- ✅ Workload Identity Federation (no long-lived secrets)
- ✅ Automatic Docker image build and push to Artifact Registry
- ✅ Zero-downtime deployments
- ✅ Auto-scaling with Cloud Run
- ✅ Free tier coverage for modest traffic
- ✅ Health checks and monitoring

**View deployment status:**
```bash
# Check recent deployments
gcloud run services list --region us-central1

# Stream logs
gcloud run services logs read letkwat --region us-central1 --follow
```

### Other Deployment Options

- **Vercel/Netlify**: `npm run build` then deploy the `dist/` folder
- **Docker**: `docker build -t letkwat . && docker run -p 3000:3000 letkwat`
- **Traditional Hosting**: `npm run build` then serve `dist/` with any static server

## 🔧 Development

### Project Structure
```
letkwat/
├── services/
│   └── geminiService.ts       # Gemini API integration + Supabase
├── components/
│   ├── ChordProViewer.tsx     # Displays ChordPro format
│   ├── FeedbackModal.tsx      # User feedback collection
│   └── RecentConversions.tsx  # Library view
├── App.tsx                     # Main application
├── types.ts                    # TypeScript interfaces
├── vite.config.ts             # Vite configuration
├── Dockerfile                  # GCP deployment
└── .github/
    └── workflows/
        └── deploy-gcp.yml     # GitHub Actions workflow
```

### Available Scripts

```bash
npm run dev      # Start dev server on port 3000
npm run build    # Build for production
npm run preview  # Preview production build
```

### Key Technologies

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **AI**: Gemini 3 API with search grounding
- **Database**: Supabase (PostgreSQL)
- **Build**: Vite
- **Deployment**: Google Cloud Run + Docker

## 🗂️ Environment Variables

Create `.env.local` with:

```env
# Gemini API Configuration
GEMINI_API_KEY=your-key-here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 📊 Database Schema

### `song_cache` Table
Stores successful conversions:
- `input_key`: Normalized input (YouTube ID or query)
- `meta_key`: Unique song identifier
- `title`: Song title
- `artist`: Artist name
- `chord_pro_content`: ChordPro formatted chords
- `source_urls`: Array of reference sources
- `updated_at`: Cache timestamp

### `feedbacks` Table
Stores user feedback:
- `email`: User email
- `song_title`: Related song title
- `rating`: 1-5 star rating
- `comment`: Feedback text
- `created_at`: Submission timestamp

### `search_logs` Table
Analytics data:
- `query`: Search query
- `is_cached`: Whether result was cached
- `user_agent`: Browser info
- `ip_address`: Client IP

## 🐛 Troubleshooting

### Supabase Not Saving Results
- ✅ **Fixed**: Update to latest version with Vite env configuration
- Check `.env.local` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Verify Supabase tables exist (`song_cache`, `feedbacks`)

### Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### Development Server Issues
```bash
# Kill existing process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart
npm run dev
```

## 📝 API Reference

### `convertYoutubeToChordPro(input: string, useDeepSearch?: boolean)`
Converts a YouTube URL or song name to ChordPro format.

**Parameters:**
- `input`: YouTube URL or song name (e.g., "Shape of You Ed Sheeran")
- `useDeepSearch`: Enable Google Search verification (default: true)

**Returns:** `SongData` object with chords and metadata

### `fetchRecentSongs(limit?: number)`
Retrieves recent cached conversions.

**Returns:** Array of `SongData` objects

### `submitFeedback(feedback: Feedback)`
Submits user feedback to database.

## 📈 Performance

- **Cache Hit**: <100ms (database lookup)
- **New Conversion**: 5-15s (with Deep Verification)
- **Express Mode**: 2-5s

## 🙏 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📄 License

This project is created with ❤️ for the music community.

View in AI Studio: https://ai.studio/apps/drive/1ILAUwwyzkLRt2GkZpAVq0XgQUlQF_Bwt

## 📞 Support

For issues and questions, please open an issue on GitHub or check [GCP_DEPLOYMENT.md](GCP_DEPLOYMENT.md) for deployment help.
