const {app} = require("electron");
const Module = require("module");
const {config: {
    MAX_ATTEMPTS = 10,
    DELETE_HEADERS = [],
    APPEND_HEADERS = {},
    BLOCKED_DOMAINS = []
}} = require("./index.json");
let sentryRegex = /ignoreErrors.*BetterDiscord/si;
let sentryURL = null;

// TODO: Implement better searching algorithm that works when discord updates the chunk url during runtime.

const oLoad = Module._load;
const fakeSentry = {
    init: () => {},
    captureException: console.error
};

Module._load = function (mod) {
    if (mod.indexOf("sentry") > -1) return fakeSentry;

    return oLoad.apply(this, arguments);
};

const showConsoleLog = (tries, win) => process.nextTick(() => {
    win.webContents.executeJavaScript(`(() => {
        console.log("[SentryBlock] Blocked sentry", {
            url: ${JSON.stringify(sentryURL)},
            attempts: ${JSON.stringify(tries)}
        });
    })()`);
    console.log("[SentryBlock] Blocked sentry", {
        url: sentryURL,
        attempts: tries
    });
});

app.whenReady().then(() => {
    app.on("browser-window-created", (_, win) => {
        let tries = 0;
        let queue = new Set();

        win.webContents.session.webRequest.onHeadersReceived((opts, callback) => {
            const {responseHeaders} = opts;
            const currentHeaders = Object.keys(responseHeaders);

            for (const header in APPEND_HEADERS) {
                // Checking case sensitive for the header, otherwise we run into issues with duplicate headers.
                if (currentHeaders.some(h => h.toLowerCase() === header.toLowerCase())) continue;

                responseHeaders[header] = APPEND_HEADERS[header];
            }

            for (const header of DELETE_HEADERS) {
                const actualName = currentHeaders.find(h => h === header.toLowerCase());
                if (!actualName) continue;

                delete responseHeaders[actualName];
            }

            for (const matcher of BLOCKED_DOMAINS) {
                const regex = new RegExp(matcher);
                
                if (regex.test(opts.url)) {
                    return callback({cancel: true, responseHeaders});
                }
            }

            if (sentryURL) {
                const isSentry = sentryURL === opts.url;
                if (isSentry) showConsoleLog(tries, win);
                
                return callback({cancel: isSentry, responseHeaders});
            }

            if (queue.has(opts.url)) return callback({responseHeaders});
            if (tries > MAX_ATTEMPTS) return callback({responseHeaders});
            if (opts.resourceType !== "script") return callback({responseHeaders});
            if (opts.url.indexOf("discord.com/assets") < 0) return callback({responseHeaders});
            
            require("https").get(opts.url, (res) => {
                const data = [];
                res.on("data", d => data.push(d));
                res.on("end", () => {
                    if (sentryURL) return callback({responseHeaders});
                    const body = data.join("");
                    queue.delete(opts.url);

                    const isSentry = sentryRegex.test(body);
                    if (isSentry) {
                        sentryURL = opts.url;
                        showConsoleLog(tries, win);
                        callback({cancel: true, responseHeaders});
                        queue.clear();
                        
                    } else {
                        callback({responseHeaders});
                    }
                });
            });

            queue.add(opts.url);
            tries++;
            if (tries === MAX_ATTEMPTS) console.warn("Could not find sentry chunk.");
        });
    });
});