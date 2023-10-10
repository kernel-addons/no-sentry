async function init() {
	predefine(window, 'webpackChunkdiscord_app', instance => {
		predefine(instance, 'push', orig => {
			const data = {
				blocked: {
					sdk: false,
					logger: false,
					core: false,
					discord: false,
					client: false,
					stack: false
				}
			};

			instance.push = function (payload) {
				if (data.blocked.logger && data.blocked.sdk && data.blocked.core && data.blocked.discord && data.blocked.stack && data.blocked.client) {
					return orig.call(this, payload);
				}

				const chunk = payload[1];

				for (const [_id, mdl] of Object.entries(chunk)) {
					const id = Number(_id);

					if (!data.blocked.sdk && ~mdl.toString().indexOf('__SENTRY__')) {
						chunk[id] = () => { };
						console.log('[Sentry] Blocked SDK.');
						data.blocked.sdk = true;
						continue;
					}

					if (!data.blocked.client && ~mdl.toString().indexOf('_sdkProcessingMetadata')) {
						chunk[id] = () => { };
						console.log('[Sentry] Blocked client.');
						data.blocked.client = true;
						continue;
					}

					if (!data.blocked.core && ~mdl.toString().indexOf('makeXHRTransport') && ~mdl.toString().indexOf('addBreadcrumb')) {
						chunk[id] = () => { };
						console.log('[Sentry] Blocked Core.');
						data.blocked.core = true;
					}

					if (!data.blocked.stack && ~mdl.toString().indexOf('_sendSessionUpdate')) {
						chunk[id] = () => { };
						console.log('[Sentry] Blocked stack.');
						data.blocked.stack = true;
					}

					if (!data.blocked.discord && ~mdl.toString().indexOf('DiscordSentry')) {
						chunk[id] = () => { };
						console.log('[Sentry] Blocked Discord global.');
						data.blocked.discord = true;
					}

					if (!data.blocked.logger && ~mdl.toString().indexOf('Sentry Logger')) {
						chunk[id] = () => { };
						console.log('[Sentry] Blocked logger.');
						data.blocked.logger = true;
					}
				}

				payload[1][712343] = () => { };
				return orig.call(this, payload);
			};

			instance.push([[Symbol()], {}, require => {
				require.d = (target, exports) => {
					for (const key in exports) {
						if (!Reflect.has(exports, key) || target[key]) continue;

						Object.defineProperty(target, key, {
							get: () => exports[key](),
							set: v => exports[key] = () => v,
							enumerable: true,
							configurable: true
						});
					}
				};
			}]);

			instance.pop();
		});
	});
}

function predefine(target, prop, effect) {
	const value = target[prop];

	Object.defineProperty(target, prop, {
		get: () => value,
		set: (newValue) => {
			Object.defineProperty(target, prop, {
				value: newValue,
				configurable: true,
				enumerable: true,
				writable: true
			});

			try {
				effect(newValue);
			} catch (error) {
				console.error(error);
			}

			return newValue;
		},
		configurable: true
	});
};

if (window.__NO_SENTRY__?.config?.EXPERIMENTAL_SENTRY_BLOCK) {
	init();
}
