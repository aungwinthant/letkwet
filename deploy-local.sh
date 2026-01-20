#!/bin/bash

# Local deployment script for LETKWAT to Google Cloud Run
# Usage: ./deploy-local.sh

set -e

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '#' | xargs)
  echo "✓ Loaded environment from .env.local"
else
  echo "❌ Error: .env.local file not found!"
  echo "Please create .env.local with:"
  echo "  GEMINI_API_KEY=your-key"
  echo "  SUPABASE_URL=your-url"
  echo "  SUPABASE_ANON_KEY=your-key"
  exit 1
fi

# Configuration
PROJECT_ID=$(gcloud config get-value project)
GCP_REGION="asia-southeast1"
SERVICE_NAME="letkwat"
IMAGE_NAME="letkwat-app"
GAR_LOCATION="asia-southeast1"

echo "🚀 Starting LETKWAT deployment to Google Cloud Run"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project: $PROJECT_ID"
echo "Region: $GCP_REGION"
echo "Service: $SERVICE_NAME"
echo ""

# Step 1: Build the application
echo "📦 Building application..."
yarn install --frozen-lockfile
yarn build
echo "✓ Application built successfully"
echo ""

# Step 2: Authenticate with GCP
echo "🔐 Authenticating with Google Cloud..."
gcloud auth application-default login
echo "✓ Authenticated"
echo ""

# Step 3: Configure Docker for Artifact Registry
echo "🐳 Configuring Docker for Artifact Registry..."
gcloud auth configure-docker "${{ GAR_LOCATION }}-docker.pkg.dev"
echo "✓ Docker configured"
echo ""

# Step 4: Build Docker image
IMAGE_TAG="${GAR_LOCATION}-docker.pkg.dev/${PROJECT_ID}/${SERVICE_NAME}/${IMAGE_NAME}"
echo "🔨 Building Docker image..."
echo "Image: $IMAGE_TAG:latest"
docker build -t "$IMAGE_TAG:latest" .
echo "✓ Docker image built"
echo ""

# Step 5: Push to Artifact Registry
echo "📤 Pushing image to Artifact Registry..."
docker push "$IMAGE_TAG:latest"
echo "✓ Image pushed"
echo ""

# Step 6: Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG:latest" \
  --region "$GCP_REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars="GEMINI_API_KEY=${GEMINI_API_KEY},SUPABASE_URL=${SUPABASE_URL},SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10

echo "✓ Deployment complete"
echo ""

# Step 7: Get service URL
echo "📍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$GCP_REGION" \
  --format 'value(status.url)')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ DEPLOYMENT SUCCESSFUL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📊 View logs:"
echo "   gcloud run services logs read $SERVICE_NAME --region $GCP_REGION --follow"
echo ""
echo "🔄 To redeploy, just run: ./deploy-local.sh"
