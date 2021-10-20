export default new class NoSentry {
    async start() {
        while (typeof (DiscordSentry) === "undefined")
            await new Promise(res => setTimeout(res, 0));

        DiscordSentry.getCurrentHub().getClient().close(0);

        this.unpatchConsole();
    }

    unpatchConsole() {
        const methods = ["__sentry_original__", "__REACT_DEVTOOLS_ORIGINAL_METHOD__"]; 
        const rdtOverride = "__REACT_DEVTOOLS_OVERRIDE_METHOD__";

        const getOriginalMethod = (thing, ranKeys = []) => {
            if (rdtOverride in thing) delete thing[rdtOverride];
            
            for (const method of methods) {
                if (typeof (thing[method]) !== "function") continue;
                if (ranKeys.includes(method)) continue;

                return getOriginalMethod(thing[method], ranKeys.concat(method));
            }
            
            return thing;
        }

        for (const method in console) {
            console[method] = getOriginalMethod(console[method]);
        }
    }
}