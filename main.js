const {app} = require("electron");
const {config: {MAX_ATTEMPTS}} = require("./index.json");

let sentryRegex = /ignoreErrors.*BetterDiscord/si;
let sentryURL = null;
app.whenReady().then(() => {
    app.on("browser-window-created", (_, win) => {
        let tries = 0;
        let queue = new Set();
        win.webContents.session.webRequest.onHeadersReceived((opts, callback) => {
            if (sentryURL) return callback({cancel: sentryURL === opts.url});
            if (queue.has(opts.url)) return callback({});
            if (tries > MAX_ATTEMPTS) return callback({});
            if (opts.resourceType !== "script") return callback({});
            if (opts.url.indexOf("discord.com/assets") < 0) return callback({});
            
            require("https").get(opts.url, (res) => {
                const data = [];
                res.on("data", d => data.push(d));
                res.on("end", () => {
                    if (sentryURL) return callback({});
                    const body = data.join("");
                    queue.delete(opts.url);

                    const isSentry = sentryRegex.test(body);
                    if (isSentry) {
                        sentryURL = opts.url;
                        callback({cancel: true});
                        queue.clear();
                        process.nextTick(() => {
                            win.webContents.executeJavaScript(`(() => {
                                console.log("[SentryBlock] Found sentry", {
                                    url: ${JSON.stringify(opts.url)},
                                    attempts: ${JSON.stringify(tries)}
                                });
                            })()`);
                            console.log("[SentryBlock] Found sentry", {
                                url: opts.url,
                                attempts: tries
                            });
                        });
                    } else {
                        callback({});
                    }
                });
            });

            queue.add(opts.url);
            tries++;
        });
    });
});