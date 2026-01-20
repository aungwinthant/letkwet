# Google Cloud Deployment Guide

This guide helps you set up automated deployment to Google Cloud using GitHub Actions.

## Prerequisites

1. **Google Cloud Project** - Create one at https://console.cloud.google.com
2. **GitHub Repository** - This repository must be on GitHub
3. **gcloud CLI** - Installed locally for initial setup

## Setup Steps

### 1. Enable Required GCP APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudresourcemanager.googleapis.com \
  iap.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create letkwat \
  --repository-format=docker \
  --location=asia-southeast1 \
  --description="Docker repository for LETKWAT"
```

### 3. Set Up Workload Identity Federation (Recommended)

This allows GitHub Actions to authenticate without storing long-lived secrets.

```bash
# Set variables
export PROJECT_ID=$(gcloud config get-value project)
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export GITHUB_REPO="git@github.com:aungwinthant/letkwet.git"

# Create identity pool
gcloud iam workload-identity-pools create github-pool \
  --project=$PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions Pool"

# Get pool resource name
export WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe github-pool \
  --project=$PROJECT_ID \
  --location=global \
  --format='value(name)')

# Create identity provider
gcloud iam workload-identity-pools providers create-oidc github \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,assertion.aud=assertion.aud,assertion.repository_owner=assertion.repository_owner" \
  --issuer-uri=https://token.actions.githubusercontent.com \
  --attribute-condition="assertion.repository_owner == 'your-github-username'"

# Get provider resource name
export PROVIDER=$(gcloud iam workload-identity-pools providers describe github \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github-pool \
  --format='value(name)')

# Create service account
gcloud iam service-accounts create github-actions \
  --project=$PROJECT_ID \
  --display-name="GitHub Actions Service Account"

# Grant permissions to service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Allow GitHub to impersonate service account
gcloud iam service-accounts add-iam-policy-binding github-actions@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository_owner/your-github-username"
```

### 4. Add GitHub Secrets

Go to your repository **Settings → Secrets and Variables → Actions** and add:

```
GCP_PROJECT_ID: gen-lang-client-0484569301
WIF_PROVIDER: <PROVIDER_RESOURCE_NAME_FROM_STEP_3>
WIF_SERVICE_ACCOUNT: github-actions@your-project-id.iam.gserviceaccount.com
GEMINI_API_KEY: your-gemini-api-key
SUPABASE_URL: your-supabase-url
SUPABASE_ANON_KEY: your-supabase-key
```

### 5. Push to Main Branch

The workflow will trigger automatically on push to `main`:

```bash
git add .
git commit -m "Add GCP deployment"
git push origin main
```

## Deployment Options

### Option A: Cloud Run (Recommended for this app)

The workflow uses Cloud Run by default. Benefits:
- No server management
- Auto-scaling
- Pay per request
- Cold start friendly for this app size

### Option B: Cloud Storage + Cloud CDN

For static site deployment, add this step to deploy-gcp.yml:

```yaml
- name: Deploy to Cloud Storage
  run: |
    gsutil -m rsync -r -d dist/ gs://${{ env.GCP_PROJECT_ID }}-letkwat/
    gsutil -m acl ch -u AllUsers:R gs://${{ env.GCP_PROJECT_ID }}-letkwat/**
```

## Monitoring

View deployment logs:

```bash
# Cloud Run logs
gcloud run services describe letkwat --region asia-southeast1

# Streaming logs
gcloud run services logs read letkwat --region asia-southeast1 --follow
```

## Local Testing

Test the Docker image locally:

```bash
docker build -t letkwat-app .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your-key \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_ANON_KEY=your-key \
  letkwat-app
```

Visit `http://localhost:3000`

## Troubleshooting

### Workflow fails with auth error
- Verify all secrets are set correctly
- Ensure WIF configuration is complete
- Check service account permissions

### Build fails
- Verify Node.js version (18+)
- Check `npm ci` and `npm run build` work locally

### Deployment fails
- Verify Artifact Registry repository exists
- Check Cloud Run quota in your region
- Review GCloud logs: `gcloud run services logs read letkwat --region asia-southeast1`

## Cost Estimates

Cloud Run pricing (as of 2024):
- First 2M requests/month: Free
- $0.40 per 1M additional requests
- $0.00001667 per vCPU-second
- $0.0000083 per GiB-second

For this app at modest traffic, expect to stay in the **free tier**.

## Custom Domain

To use a custom domain:

```bash
gcloud run services update letkwat \
  --region asia-southeast1 \
  --update-env-vars="CUSTOM_DOMAIN=yourdomain.com"
```

Add DNS record:
```
CNAME letkwat-xxxxx.run.app
```

Then configure Cloud Armor or Cloud CDN for DDoS protection.
