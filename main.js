const {app} = require("electron");
const {config: {MAX_ATTEMPTS, DELETE_HEADERS, APPEND_HEADERS}} = require("./index.json");
let sentryRegex = /ignoreErrors.*BetterDiscord/si;
let sentryURL = null;

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
            for (const header in APPEND_HEADERS) {
                responseHeaders[header] ??= APPEND_HEADERS[header];
            }

            for (const header of DELETE_HEADERS) {
                if (responseHeaders[header]) delete responseHeaders[header];
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
        });
    });
});