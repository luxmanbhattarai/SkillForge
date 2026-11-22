// main.js
const { app, autoUpdater } = require("electron");

autoUpdater.setFeedURL({
  url: "https://update.example.com/darwin/1.0.0",
});
autoUpdater.on("update-downloaded", () => {
  autoUpdater.quitAndInstall();
});
app.whenReady().then(() => autoUpdater.checkForUpdates());
