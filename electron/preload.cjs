const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("eventgo", {
  platform: process.platform,
});
