async function init() {
   await new Promise(resolve => {
      if (window.webpackChunkdiscord_app?.push) {
         resolve();
      }

      Object.defineProperty(window, "webpackChunkdiscord_app", {
         get: () => undefined,
         configurable: true,
         set: (value) => {
            delete window.webpackChunkdiscord_app;
            window.webpackChunkdiscord_app = value;
            resolve();
         }
      });
   });

   const data = {
      push: window.webpackChunkdiscord_app.push,
      blocked: false,
      tries: 0,
   };

   Object.defineProperty(window.webpackChunkdiscord_app, "push", {
      set: (value) => { data.push = value; },
      get: () => function (payload) {
         if (data.blocked) {
            return data.push.apply(this, [payload]);
         }

         if (data.tries < 5) {
            const chunk = payload[1];
            data.tries++;

            if (Object.values(chunk).find(m => ~m.toString().indexOf("BetterDiscord"))) {
               return data.blocked = true;
            }
         }

         return data.push.apply(this, [payload]);
      }
   });
}

if (window.__NO_SENTRY__?.config?.EXPERIMENTAL_SENTRY_BLOCK) {
   init();
}