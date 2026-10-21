(function(global) {
	var CHANNEL_NAME = "tm-scoreboard-sync-v1";
	var STORAGE_KEY = "tm-scoreboard-sync-v1";

	var channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

	function defaultState() {
		var contestants = [];
		for (var i = 0; i < 5; i++) {
			contestants.push({
				image: "./images/blank.jpg",
				score: 0,
				oldScore: 0
			});
		}
		return {
			version: 1,
			viewMode: "scoreboard",
			contestants: contestants,
			projectorMessage: "",
			timer: {
				durationMs: 300000,
				remainingMs: 300000,
				running: false
			}
		};
	}

	function loadPersisted() {
		try {
			var raw = global.localStorage.getItem(STORAGE_KEY);
			if (!raw) return null;
			var parsed = JSON.parse(raw);
			if (!parsed || parsed.version !== 1 || !parsed.contestants || !parsed.timer) return null;
			var tm = parsed.timer;
			if (tm.durationMs == null && tm.durationSec != null) {
				tm.durationMs = Math.round(Number(tm.durationSec) * 1000);
			}
			if (tm.durationMs == null || isNaN(tm.durationMs)) tm.durationMs = 300000;
			if (tm.remainingMs == null && tm.remainingSec != null) {
				tm.remainingMs = Math.round(Number(tm.remainingSec) * 1000);
			}
			if (tm.remainingMs == null || isNaN(tm.remainingMs)) tm.remainingMs = tm.durationMs;
			return parsed;
		} catch (e) {
			return null;
		}
	}

	function savePersisted(state) {
		try {
			global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch (e) {}
	}

	function post(msg) {
		if (channel) channel.postMessage(msg);
	}

	function subscribe(handler) {
		if (channel) {
			channel.onmessage = function(ev) {
				handler(ev.data);
			};
		}
		global.addEventListener("storage", function(ev) {
			if (ev.key !== STORAGE_KEY || !ev.newValue) return;
			try {
				handler({ t: "storageState", state: JSON.parse(ev.newValue) });
			} catch (err) {}
		});
	}

	global.TMSync = {
		STORAGE_KEY: STORAGE_KEY,
		defaultState: defaultState,
		loadPersisted: loadPersisted,
		savePersisted: savePersisted,
		post: post,
		subscribe: subscribe
	};
})(window);
