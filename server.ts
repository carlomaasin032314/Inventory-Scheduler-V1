import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "path";
import { Server } from "socket.io";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(cookieParser());

const PORT = Number(process.env.PORT) || 3000;

// In-memory store for tokens (for prototype purposes)
const tokenStore = new Map();

// Track last known event list hash to detect changes
const lastKnownState = new Map();

const getOAuth2Client = (customRedirectUri?: string) => {
  const clientId = (process.env.OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.OAUTH_CLIENT_SECRET || '').trim();
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing OAUTH_CLIENT_ID or OAUTH_CLIENT_SECRET environment variables');
  }
  
  if (clientId.includes('TODO') || clientSecret.includes('TODO')) {
    throw new Error('Please update OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET with your actual Google Cloud credentials in the AI Studio Settings.');
  }
  
  const redirectUri = customRedirectUri || (process.env.APP_URL || '').replace(/\/$/, '') + '/auth/callback';
  
  console.log(`[OAuth] Creating client with redirectUri: ${redirectUri}`);
  
  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
};

const getProtocol = (req: express.Request) => {
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  if (host?.toString().includes('localhost') || host?.toString().includes('127.0.0.1')) {
    return 'http';
  }
  return (req.headers['x-forwarded-proto'] as string) || 'https';
};

app.get('/api/auth/config', (req, res) => {
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const protocol = getProtocol(req);
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/auth/callback`;
  res.json({ redirectUri });
});

app.get('/api/auth/url', (req, res) => {
  try {
    const host = req.headers['x-forwarded-host'] || req.headers['host'];
    const protocol = getProtocol(req);
    const origin = `${protocol}://${host}`;
    const redirectUri = `${origin}/auth/callback`;
    
    console.log(`[OAuth] Generating Auth URL with redirectUri: ${redirectUri}`);
    
    const oauth2Client = getOAuth2Client(redirectUri);
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events']
    });
    res.json({ url });
  } catch (error: any) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: error.message || 'Failed to generate auth URL' });
  }
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  try {
    const host = req.headers['x-forwarded-host'] || req.headers['host'];
    const protocol = getProtocol(req);
    const origin = `${protocol}://${host}`;
    const redirectUri = `${origin}/auth/callback`;
    
    console.log(`[OAuth] Handling callback with redirectUri: ${redirectUri}`);
    
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code as string);
    const sessionId = crypto.randomUUID();
    tokenStore.set(sessionId, { tokens, calendarId: 'primary' });
    
    // Log successful connection for debugging
    console.log(`Successfully connected to Google Calendar for session ${sessionId}`);
    
    res.cookie('sessionId', sessionId, {
      secure: true,
      sameSite: 'none',
      httpOnly: true
    });
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    const errorMessage = error.message || 'Authentication failed';
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; padding: 20px; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
          <h3>Authentication Failed</h3>
          <p>${errorMessage}</p>
          <p>Please check your Google Cloud Console settings and ensure the Redirect URI is correctly configured.</p>
          <button onclick="window.close()" style="padding: 8px 16px; background: #721c24; color: white; border: none; border-radius: 4px; cursor: pointer;">Close Window</button>
        </body>
      </html>
    `);
  }
});

app.get('/api/auth/status', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId && tokenStore.has(sessionId)) {
    res.json({ connected: true });
  } else {
    res.json({ connected: false });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (sessionId) {
    tokenStore.delete(sessionId);
  }
  res.clearCookie('sessionId');
  res.json({ success: true });
});

app.get('/api/calendar/events', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !tokenStore.has(sessionId)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    const sessionData = tokenStore.get(sessionId);
    oauth2Client.setCredentials(sessionData.tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = (req.query.calendarId as string) || sessionData.calendarId || process.env.CALENDAR_ID || 'primary';
    
    // Update stored calendarId if provided
    if (req.query.calendarId) {
      sessionData.calendarId = req.query.calendarId as string;
    }

    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    // Update last known state for this session
    const stateKey = `${sessionId}:${calendarId}`;
    lastKnownState.set(stateKey, JSON.stringify(response.data.items));

    res.json(response.data.items);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch events' });
  }
});

app.post('/api/calendar/events', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !tokenStore.has(sessionId)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    const sessionData = tokenStore.get(sessionId);
    oauth2Client.setCredentials(sessionData.tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = (req.query.calendarId as string) || sessionData.calendarId || process.env.CALENDAR_ID || 'primary';

    const { summary, description, start, end, attendees, status } = req.body;

    // We don't use Google's native 'cancelled' status because it strips metadata (summary, description).
    // Instead, we reflect the status in the summary and keep the event 'confirmed'.
    let finalSummary = summary;
    if (status === 'cancelled' && !summary.startsWith('[CANCELLED]')) {
      finalSummary = `[CANCELLED] ${summary}`;
    } else if (status === 'completed' && !summary.startsWith('[COMPLETED]')) {
      finalSummary = `[COMPLETED] ${summary}`;
    }

    const response = await calendar.events.insert({
      calendarId,
      sendUpdates: 'all',
      requestBody: {
        summary: finalSummary,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees,
        status: 'confirmed',
      }
    });
    
    // Notify clients of update
    io.emit('calendar_update');

    res.json(response.data);
  } catch (error: any) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message || 'Failed to create event' });
  }
});

app.delete('/api/calendar/events/:id', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !tokenStore.has(sessionId)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    const sessionData = tokenStore.get(sessionId);
    oauth2Client.setCredentials(sessionData.tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = (req.query.calendarId as string) || sessionData.calendarId || process.env.CALENDAR_ID || 'primary';

    await calendar.events.delete({
      calendarId,
      eventId: req.params.id,
    });
    
    // Notify clients of update
    io.emit('calendar_update');

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: error.message || 'Failed to delete event' });
  }
});

app.put('/api/calendar/events/:id', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  if (!sessionId || !tokenStore.has(sessionId)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    const sessionData = tokenStore.get(sessionId);
    oauth2Client.setCredentials(sessionData.tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = (req.query.calendarId as string) || sessionData.calendarId || process.env.CALENDAR_ID || 'primary';

    const { summary, description, start, end, attendees, status } = req.body;

    // We don't use Google's native 'cancelled' status because it strips metadata (summary, description).
    // Instead, we reflect the status in the summary and keep the event 'confirmed'.
    let finalSummary = summary;
    if (status === 'cancelled' && !summary.startsWith('[CANCELLED]')) {
      finalSummary = `[CANCELLED] ${summary}`;
    } else if (status === 'completed' && !summary.startsWith('[COMPLETED]')) {
      finalSummary = `[COMPLETED] ${summary}`;
    } else if (status === 'scheduled') {
      finalSummary = summary.replace('[CANCELLED] ', '').replace('[COMPLETED] ', '');
    }

    const response = await calendar.events.update({
      calendarId,
      eventId: req.params.id,
      sendUpdates: 'all',
      requestBody: {
        summary: finalSummary,
        description,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees,
        status: 'confirmed',
      }
    });
    
    // Notify clients of update
    io.emit('calendar_update');

    res.json(response.data);
  } catch (error: any) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: error.message || 'Failed to update event' });
  }
});

async function startServer() {
  // Background polling to detect external changes in Google Calendar
  setInterval(async () => {
    for (const [sessionId, data] of tokenStore.entries()) {
      try {
        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials(data.tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarId = data.calendarId || process.env.CALENDAR_ID || 'primary';

        const response = await calendar.events.list({
          calendarId,
          timeMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: 'startTime',
        });

        const stateKey = `${sessionId}:${calendarId}`;
        const newState = JSON.stringify(response.data.items);
        const oldState = lastKnownState.get(stateKey);

        if (newState !== oldState) {
          lastKnownState.set(stateKey, newState);
          io.emit('calendar_update');
          console.log(`Detected external change for session ${sessionId}, notifying clients.`);
        }
      } catch (error) {
        // Silently ignore errors in background poll (e.g. expired tokens)
      }
    }
  }, 10000); // Poll every 10 seconds

  const isProduction = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod";
  
  if (isProduction) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // API 404 fallback - ensures /api/* requests that don't match a route return JSON, not HTML
    app.use('/api', (req, res) => {
      res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
    });

    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    try {
      const oauth2Client = getOAuth2Client();
      const redirectUri = (process.env.APP_URL || '').replace(/\/$/, '') + '/auth/callback';
      console.log(`OAuth Redirect URI: ${redirectUri}`);
    } catch (e) {
      console.warn('OAuth environment variables not fully configured yet.');
    }
  });
}

startServer();
