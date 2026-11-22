# Secure main window, preload bridge, and IPC handler

A secure main window, preload bridge, and IPC handler:

```js
// main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadFile("index.html");
}

ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
  });
  if (canceled) return null;
  return filePaths[0];
});

app.whenReady().then(createWindow);
```

```js
// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
});
```

```js
// renderer.js — the only Electron surface the page can see
const filePath = await window.electronAPI.openFile();
```
