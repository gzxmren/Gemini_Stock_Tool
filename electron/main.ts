import { app, BrowserWindow } from 'electron';
import * as path from 'path';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Intercept the redirect to the callback URL
  win.webContents.on('will-redirect', (event, url) => {
    handleAuthCallback(url, win);
  });

  win.webContents.on('will-navigate', (event, url) => {
    handleAuthCallback(url, win);
  });

  // check if we are in development mode (which starts the vite server)
  const isDev = process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

function handleAuthCallback(url: string, win: BrowserWindow) {
  if (url.startsWith('http://localhost:8030/api/auth/callback')) {
    // When the callback is hit, we can wait for the page to load and then grab the JSON response
    win.webContents.once('did-finish-load', async () => {
      try {
        const content = await win.webContents.executeJavaScript('document.body.innerText');
        const authData = JSON.parse(content);
        if (authData.access_token) {
          // Pass the token to the renderer process
          win.webContents.send('auth-success', authData);
          // Redirect back to the main app page
          const isDev = process.defaultApp || /[\\/]electron-prebuilt[\\/]/.test(process.execPath) || /[\\/]electron[\\/]/.test(process.execPath);
          if (isDev) {
            win.loadURL('http://localhost:5173');
          } else {
            win.loadFile(path.join(__dirname, '../dist/index.html'));
          }
        }
      } catch (e) {
        console.error('Failed to parse auth data:', e);
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
