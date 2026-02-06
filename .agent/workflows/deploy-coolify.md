---
description: How to deploy this application using Coolify
---

# Deploying to Coolify (Detailed Guide)

This application is containerized using Docker and is designed to be deployed as a **Docker Compose** project in Coolify.

## 1. Prerequisites
- A Linux server with [Coolify](https://coolify.io/) installed.
- Your code must be pushed to a Git repository (GitHub, GitLab, Bitbucket, or a self-hosted instance).

## 2. Setting Up the Git Source in Coolify
Coolify needs to know where your code is. You have two main options:

### Option A: GitHub App (Recommended)
1. Go to **Sources** in Coolify.
2. Connect your GitHub account and install the Coolify GitHub App on your repository.
3. This allows Coolify to:
   - Automatically pull the latest code on every push.
   - Show commit history and deployment status.
   - Handle private repositories securely without manually managing SSH keys.

### Option B: Public/Private Git Repository
1. In the **Add New Resource** flow, select **Public/Private Git Repository**.
2. Paste the Git URL (e.g., `https://github.com/username/tax_auto.git`).
3. For private repos, you'll need to add a **Deploy Key** (SSH key) to your Git provider.

## 3. Creating the Application in Coolify
1. Go to your **Project** and click **+ New Resource**.
2. Select **Docker Compose**.
3. Choose your **Source** (configured in Step 2) and the **Branch** (usually `main`).
4. Coolify will read the `docker-compose.yml` file from your repository.

## 4. Configuration and Environment Variables
Once the resource is created, navigate to the **Environment Variables** tab in Coolify. You must configure the following:

### Backend Service (`backend`)
| Key | Value | Description |
| :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | `https://your-domain.com` | **Crucial**: This is the URL where your frontend will be hosted. It allows the browser to make requests. |
| `ENVIRONMENT` | `production` | Ensures the server runs in production mode (e.g., disables auto-reload). |
| `PORT` | `8000` | The internal port the API runs on. |

### Frontend Service (`frontend`)
| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE` | `/api` | Tells the React app to send requests to the local Nginx proxy. |

## 5. Persistence (Your Data)
The `docker-compose.yml` includes a volume for the backend:
```yaml
volumes:
  - ./users:/app/users
```
Coolify automatically creates a persistent volume on the host server at `/var/lib/docker/volumes/...` (or similar) to match this. This ensures your IBKR reports and user configurations are **not lost** when you redeploy or restart the app.

## 6. How it Works (Architecture)
1. **The Entry Point**: The `frontend` container (Nginx) listens on port 80.
2. **Static Files**: Nginx serves the React application directly.
3. **API Proxying**: Any request sent to `https://your-domain.com/api/*` is caught by Nginx and forwarded internally to the `backend` container at `http://backend:8000/*`.
4. **CORS**: The backend checks the `Origin` header against your `ALLOWED_ORIGINS` to ensure security.

## 7. Troubleshooting
- **Deployment Fails**: Check the **Deploy Logs** in Coolify. Common issues include missing files or Git connection errors.
- **Frontend can't talk to Backend**: Verify that `VITE_API_BASE` is set to `/api` and that `ALLOWED_ORIGINS` in the backend matches your domain perfectly (including `https://`).
- **Data missing after restart**: Check the **Storage** tab in Coolify to ensure the volume is correctly attached.
