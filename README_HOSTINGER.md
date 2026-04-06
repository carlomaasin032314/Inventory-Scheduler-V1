# Hostinger Deployment Guide

This application is prepared for deployment to Hostinger (VPS or Node.js Hosting).

## Prerequisites

1.  **Hostinger Plan**: A VPS or a Node.js Hosting plan.
2.  **Node.js**: Version 20 or higher.

## Deployment Steps

1.  **Export Code**: Use the "Export to ZIP" or "Export to GitHub" option in the AI Studio settings.
2.  **Upload Files**: Upload the project files to your Hostinger server (via File Manager, SSH, or SFTP).
3.  **Install Dependencies**:
    ```bash
    npm install
    ```
4.  **Build the Application**:
    ```bash
    npm run build
    ```
    This will create a `dist` folder containing both the frontend and the backend server.
5.  **Configure Environment Variables**:
    Create a `.env` file in the root directory based on `.env.example`:
    ```env
    OAUTH_CLIENT_ID=your_google_client_id
    OAUTH_CLIENT_SECRET=your_google_client_secret
    APP_URL=https://your-domain.com
    CALENDAR_ID=primary
    ```
6.  **Start the Application**:
    It is recommended to use a process manager like **PM2** to keep the app running:
    ```bash
    # Install PM2 if not already installed
    npm install -g pm2

    # Start the app
    pm2 start dist/server.js --name "accreditation-interview-app"

    # Save the PM2 list to restart on reboot
    pm2 save
    ```
7.  **Configure Nginx (VPS only)**:
    If you are using a VPS, configure Nginx as a reverse proxy to forward traffic from port 80/443 to port 3000.

## Google OAuth Configuration

Update your **Authorized Redirect URIs** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- `https://your-domain.com/auth/callback`
