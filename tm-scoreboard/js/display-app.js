(function() {
	var contestants = [];

	var main = document.querySelector("main");
	var scoreboardEl = document.getElementById("view-scoreboard");
	var timerEl = document.getElementById("view-timer");
	var timerDigitsEl = document.getElementById("timer-digits");
	var timerDigitsWrapEl = document.getElementById("timer-digits-wrap");
	var messageEl = document.getElementById("view-message");
	var messageWrapEl = document.getElementById("projector-message-wrap");
	var messageTextEl = document.getElementById("projector-message-text");

	var projectorMessage = "";

	var timerRafId = null;
	var timerStartTimeoutId = null;

	var timer = {
		durationMs: 300000,
		remainingMs: 300000,
		running: false,
		endsAt: null
	};

	function ingestTimerFromState(tm) {
		tm = tm || {};
		var dMs = Number(tm.durationMs);
		if (!dMs || isNaN(dMs)) dMs = Math.round((Number(tm.durationSec) || 300) * 1000);
		timer.durationMs = dMs;
		var rMs = tm.remainingMs != null ? Number(tm.remainingMs) : null;
		if (rMs == null || isNaN(rMs)) {
			rMs = tm.remainingSec != null ? Math.round(Number(tm.remainingSec) * 1000) : dMs;
		}
		timer.remainingMs = Math.max(0, Math.floor(rMs));
		timer.running = !!tm.running;
		timer.endsAt = null;
	}

	function buildState() {
		var mode = "scoreboard";
		if (messageEl && messageEl.classList.contains("active")) mode = "message";
		else if (timerEl.classList.contains("active")) mode = "timer";
		return {
			version: 1,
			viewMode: mode,
			projectorMessage: projectorMessage,
			contestants: contestants.map(function(c) {
				return {
					image: c.image,
					score: c.score,
					oldScore: c.oldScore
				};
			}),
			timer: {
				durationMs: timer.durationMs,
				remainingMs: Math.round(timer.remainingMs),
				running: timer.running
			}
		};
	}

	function pad2(n) {
		return (n < 10 ? "0" : "") + n;
	}

	function formatTimeCs(ms) {
		ms = Math.max(0, Math.floor(ms));
		var m = Math.floor(ms / 60000);
		var s = Math.floor((ms % 60000) / 1000);
		var cs = Math.floor((ms % 1000) / 10);
		return pad2(m) + ":" + pad2(s) + "." + pad2(cs);
	}

	function updateTimerDigits() {
		if (timerDigitsEl) timerDigitsEl.textContent = formatTimeCs(timer.remainingMs);
	}

	function scheduleFitScores() {
		requestAnimationFrame(function() {
			requestAnimationFrame(function() {
				TMScoreFit.fitAllScores(main);
			});
		});
	}

	function scheduleTimerFit() {
		if (!timerEl.classList.contains("active")) return;
		requestAnimationFrame(function() {
			if (!timerEl.classList.contains("active") || !timerDigitsEl || !timerDigitsWrapEl) return;
			TMScoreFit.fitTimerDigits(timerDigitsEl, timerDigitsWrapEl);
		});
	}

	function scheduleMessageFit() {
		if (!messageEl || !messageEl.classList.contains("active")) return;
		requestAnimationFrame(function() {
			requestAnimationFrame(function() {
				if (!messageEl.classList.contains("active") || !messageTextEl || !messageWrapEl) return;
				TMScoreFit.fitWrappedProjectorText(messageTextEl, messageWrapEl);
			});
		});
	}

	function hideAllViews() {
		scoreboardEl.classList.remove("active");
		timerEl.classList.remove("active");
		if (messageEl) messageEl.classList.remove("active");
	}

	function stopTimerLoop() {
		if (timerRafId !== null) {
			cancelAnimationFrame(timerRafId);
			timerRafId = null;
		}
	}

	function clearDelayedTimerStart() {
		if (timerStartTimeoutId !== null) {
			clearTimeout(timerStartTimeoutId);
			timerStartTimeoutId = null;
		}
	}

	function timerTick() {
		if (!timer.running || timer.endsAt == null) return;

		timer.remainingMs = Math.max(0, timer.endsAt - Date.now());
		updateTimerDigits();
		if (timer.remainingMs <= 0) {
			timer.remainingMs = 0;
			timer.running = false;
			timer.endsAt = null;
			stopTimerLoop();
			TMSync.savePersisted(buildState());
			scheduleTimerFit();
			return;
		}

		timerRafId = requestAnimationFrame(timerTick);
	}

	function startTimerLoop() {
		stopTimerLoop();
		if (!timer.running) return;

		if (timer.remainingMs <= 0) timer.remainingMs = timer.durationMs;

		timer.endsAt = Date.now() + timer.remainingMs;
		updateTimerDigits();
		scheduleTimerFit();

		timerRafId = requestAnimationFrame(timerTick);
	}

	function showScoreboardView() {
		hideAllViews();
		scoreboardEl.classList.add("active");
		scheduleFitScores();
	}

	function showTimerView() {
		hideAllViews();
		timerEl.classList.add("active");
		updateTimerDigits();
		scheduleTimerFit();
	}

	function showMessageView() {
		hideAllViews();
		if (!messageEl || !messageTextEl) return;
		messageEl.classList.add("active");
		messageTextEl.textContent = projectorMessage;
		scheduleMessageFit();
	}

	function applyTimerCmd(cmd, durationSec, delayMs) {
		clearDelayedTimerStart();

		if (cmd === "setDuration" && typeof durationSec === "number" && durationSec > 0) {
			var ms = Math.round(durationSec * 1000);
			timer.durationMs = ms;
			if (!timer.running) {
				timer.remainingMs = ms;
				timer.endsAt = null;
				stopTimerLoop();
			}
			updateTimerDigits();
		} else if (cmd === "reset") {
			timer.running = false;
			timer.endsAt = null;
			stopTimerLoop();
			timer.remainingMs = timer.durationMs;
			updateTimerDigits();
		} else if (cmd === "pause") {
			if (timer.running && timer.endsAt != null) {
				timer.remainingMs = Math.max(0, timer.endsAt - Date.now());
			}
			timer.running = false;
			timer.endsAt = null;
			stopTimerLoop();
			updateTimerDigits();
		} else if (cmd === "startDelayed") {
			stopTimerLoop();
			timer.running = false;
			timer.endsAt = null;
			updateTimerDigits();
			scheduleTimerFit();
			TMSync.savePersisted(buildState());
			var d = typeof delayMs === "number" ? delayMs : 500;
			timerStartTimeoutId = setTimeout(function() {
				timerStartTimeoutId = null;
				if (timer.remainingMs <= 0) timer.remainingMs = timer.durationMs;
				timer.running = true;
				timer.endsAt = Date.now() + timer.remainingMs;
				timerRafId = requestAnimationFrame(timerTick);
				TMSync.savePersisted(buildState());
			}, d);
			return;
		} else if (cmd === "start") {
			if (timer.remainingMs <= 0) timer.remainingMs = timer.durationMs;
			timer.running = true;
			updateTimerDigits();
			startTimerLoop();
		}

		TMSync.savePersisted(buildState());
		scheduleTimerFit();
	}

	function addContestant(image) {
		var contestant = {};
		contestant.image = image ? image : "./images/blank.jpg";
		contestant.score = 0;
		contestant.oldScore = 0;
		contestants.push(contestant);
		return contestants.length;
	}

	function removeContestant(idx) {
		contestants.splice(idx, 1);
	}

	function createContestantEl(con, id) {
		var el = document.createElement("div");
		el.classList.add("contestant");

		var frameScaler = document.createElement("div");
		frameScaler.classList.add("frame-scaler");

		var frameContainer = document.createElement("div");
		frameContainer.classList.add("frame-container");
		frameContainer.style.webkitAnimationDelay = -id * 1.25 + "s";
		frameContainer.style.animationDelay = -id * 1.25 + "s";

		var fill = document.createElement("div");
		fill.classList.add("fill");
		fill.style.backgroundImage = "url(" + con.image + ")";

		var shadow = document.createElement("div");
		shadow.classList.add("shadow");

		var frame = document.createElement("img");
		frame.src = "./images/frame.png";
		frame.classList.add("frame");
		frame.removeAttribute("width");
		frame.removeAttribute("height");

		fill.appendChild(shadow);
		frameContainer.appendChild(fill);
		frameContainer.appendChild(frame);

		frameScaler.appendChild(frameContainer);

		var mid = document.createElement("div");
		mid.className = "contestant-mid";
		mid.appendChild(frameScaler);

		var scoreContainer = document.createElement("div");
		scoreContainer.classList.add("score-container");

		var seal = document.createElement("img");
		seal.classList.add("seal");
		seal.src = "./images/seal.png";
		seal.removeAttribute("width");
		seal.removeAttribute("height");
		seal.addEventListener("load", scheduleFitScores);

		var score = document.createElement("h1");
		score.classList.add("score");
		score.innerText = con.oldScore;

		scoreContainer.appendChild(seal);
		scoreContainer.appendChild(score);

		el.appendChild(mid);
		el.appendChild(scoreContainer);

		return el;
	}

	function transformContestants() {
		contestants.sort(function(first, second) {
			if (first.score < second.score) return -1;
			if (first.score > second.score) return 1;
			return 0;
		});

		var maxScore = contestants[contestants.length - 1].score;
		var maxCount = 1;

		for (var i = contestants.length - 1; i > 0; --i) {
			if (contestants[i - 1].score == maxScore) ++maxCount;
		}

		var iconScale = TMContestantLayout.iconScaleForCount(contestants.length);
		var slotW = TMContestantLayout.slotWidthForLayout(iconScale);
		var xs = TMContestantLayout.slotXsEqualGap(contestants.length, slotW, TMContestantLayout.STAGE_WIDTH);

		var mainH = TMContestantLayout.mainHeightPx(iconScale);
		main.style.height = mainH + "px";

		for (var i = 0, l = contestants.length; i < l; ++i) {
			var con = contestants[i];
			var frameScaler = con.el.querySelector(".frame-scaler");
			var scoreBox = con.el.querySelector(".score-container");

			con.el.style.msTransform = "translateX(" + xs[i] + "px)";
			con.el.style.transform = "translateX(" + xs[i] + "px)";

			var wMul = TMContestantLayout.winnerScale(con.score == maxScore, maxCount);
			var combined = iconScale * wMul;

			frameScaler.classList.remove("larger", "large");
			frameScaler.style.position = "";
			frameScaler.style.left = "";
			frameScaler.style.bottom = "";
			frameScaler.style.top = "";
			frameScaler.style.right = "";
			frameScaler.style.msTransform = "scale(" + combined + ")";
			frameScaler.style.transform = "scale(" + combined + ")";

			if (scoreBox) scoreBox.style.marginTop = "";
		}
	}

	function refreshContestants() {
		main.innerHTML = "";

		for (var i = contestants.length; i > 0; --i) {
			var con = contestants[i - 1];
			var cEl = createContestantEl(con, i);
			con.el = cEl;
		}

		for (var j = contestants.length; j > 0; --j) {
			main.appendChild(contestants[j - 1].el);
		}

		if (contestants.length > 0) transformContestants();

		scheduleFitScores();
	}

	function ease(t, a, b) {
		var eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
		return (b - a) * eased + a;
	}

	function play() {
		document.body.classList.add("locked");

		setTimeout(function() {
			var start = 0;
			var loop = function(dt) {
				if (start == 0) start = dt;

				for (var i = 0, l = contestants.length; i < l; ++i) {
					var con = contestants[i];
					var startRemainder = con.oldScore - Math.floor(con.oldScore);
					var endRemainder = con.score - Math.floor(con.score);
					var scoreEl = con.el.querySelector(".score");
					var score = Math.round(
						ease(Math.min((dt - start) / 2000, 1), Math.floor(con.oldScore), Math.floor(con.score))
					);

					if (dt - start < 1000) score += startRemainder;
					else score += endRemainder;

					scoreEl.innerText = score;
					var scoreWrap = con.el.querySelector(".score-container");
					if (scoreWrap) TMScoreFit.fitOneScore(scoreEl, scoreWrap);
				}

				if (dt - start < 2000) {
					window.requestAnimationFrame(loop);
				} else {
					for (var j = 0, l2 = contestants.length; j < l2; ++j) {
						contestants[j].oldScore = contestants[j].score;
					}
					TMSync.savePersisted(buildState());
					scheduleFitScores();
				}
			};

			window.requestAnimationFrame(loop);
			transformContestants();
			scheduleFitScores();
		}, 1000);
	}

	function resize() {
		var w = window.innerWidth;
		var h = window.innerHeight;

		var wm = TMContestantLayout.STAGE_WIDTH;
		var nScale = contestants.length > 0 ? contestants.length : 5;
		var iconScale = TMContestantLayout.iconScaleForCount(nScale);
		var hm = TMContestantLayout.mainHeightPx(iconScale);

		main.style.height = hm + "px";

		var fit = TMContestantLayout.projectorFitTransform(w, h, wm, hm, nScale);
		var t = "translate(" + fit.tx + "px, " + fit.ty + "px) scale(" + fit.m + ")";
		main.style.msTransform = t;
		main.style.transform = t;

		scheduleFitScores();
		scheduleTimerFit();
		scheduleMessageFit();
	}

	function applyFullState(state) {
		stopTimerLoop();
		clearDelayedTimerStart();
		ingestTimerFromState(state.timer);

		projectorMessage = typeof state.projectorMessage === "string" ? state.projectorMessage : "";

		if (state.viewMode === "timer") showTimerView();
		else if (state.viewMode === "message") showMessageView();
		else showScoreboardView();

		updateTimerDigits();

		if (timer.running) startTimerLoop();
		else scheduleTimerFit();

		contestants = state.contestants.map(function(c) {
			return {
				image: c.image || "./images/blank.jpg",
				score: Number(c.score) || 0,
				oldScore: Number(c.oldScore) || 0
			};
		});

		refreshContestants();
		resize();

		TMSync.savePersisted(buildState());
	}

	function commitScoresFromControl(list) {
		clearDelayedTimerStart();
		showScoreboardView();

		var prev = contestants.slice();
		contestants = list.map(function(item, i) {
			var p = prev[i];
			return {
				image: item.image || (p && p.image) || "./images/blank.jpg",
				score: Number(item.score) || 0,
				oldScore: p ? p.oldScore : 0
			};
		});
		refreshContestants();
		resize();
		play();
	}

	function handleMessage(msg) {
		if (!msg || !msg.t) return;

		if (msg.t === "applyState" && msg.state) {
			stopTimerLoop();
			applyFullState(msg.state);
			return;
		}

		if (msg.t === "commitScores" && msg.contestants) {
			commitScoresFromControl(msg.contestants);
			return;
		}

		if (msg.t === "timer") {
			applyTimerCmd(msg.cmd, msg.durationSec, msg.delayMs);
			return;
		}

		if (msg.t === "storageState" && msg.state) {
			stopTimerLoop();
			applyFullState(msg.state);
		}
	}

	TMSync.subscribe(handleMessage);

	var initial = TMSync.loadPersisted() || TMSync.defaultState();
	applyFullState(initial);

	window.addEventListener("resize", resize);
})();
