# Google Cloud Platform Deployment

## Prerequisites

1. Install Google Cloud CLI:
   ```
   https://cloud.google.com/sdk/docs/install
   ```

2. Initialize gcloud and login:
   ```
   gcloud init
   gcloud auth login
   ```

3. Create a new GCP project or select existing:
   ```
   gcloud projects create your-project-id
   gcloud config set project your-project-id
   ```

4. Enable App Engine API:
   ```
   gcloud services enable appengine.googleapis.com
   ```

5. Initialize App Engine:
   ```
   gcloud app create --region=us-central
   ```

## Deploy

1. Deploy to App Engine:
   ```
   npm run deploy
   ```

2. View your app:
   ```
   gcloud app browse
   ```

## Environment Variables

Update the values in `app.yaml` with your actual credentials before deploying.

## Monitoring

- View logs: `gcloud app logs tail -s default`
- View in console: https://console.cloud.google.com/appengine