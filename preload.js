const { contextBridge } = require('electron');
const { config } = require("./index.json");

if (config?.EXPERIMENTAL_SENTRY_BLOCK ?? false) {
   contextBridge.exposeInMainWorld("__NO_SENTRY__", { config });
}