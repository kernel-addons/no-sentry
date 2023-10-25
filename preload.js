const {contextBridge} = require("electron");
const {config} = require("./index.json");
const Module = require("module");

if (config?.EXPERIMENTAL_SENTRY_BLOCK ?? false) {
   contextBridge.exposeInMainWorld("__NO_SENTRY__", { config });
}

const oLoad = Module._load;
const fakeSentry = {
	init: () => { },
	captureException: console.error,
	setUser: () => void 0,
	setTag: () => void 0,
	setTags: () => void 0,
	addBreadcrumb: () => void 0,
	setExtra: () => void 0
};

Module._load = function (mod) {
	if (mod.indexOf("sentry") > -1) return fakeSentry;

	return oLoad.apply(this, arguments);
};
