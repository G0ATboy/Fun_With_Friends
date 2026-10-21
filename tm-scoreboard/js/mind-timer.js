(function() {
	var accumulatedMs = 0;
	var segmentStart = null;
	var running = false;

	var entries = [];

	var elapsedEl = document.getElementById("elapsed");
	var statusEl = document.getElementById("status");
	var targetInput = document.getElementById("target-sec");
	var logBody = document.getElementById("log-body");
	var emptyLogEl = document.getElementById("empty-log");

	var rafId = null;

	function targetSec() {
		var v = parseFloat(targetInput.value);
		if (!isFinite(v) || v < 0) return 0;
		return v;
	}

	function getElapsedMs() {
		if (running && segmentStart != null) {
			return accumulatedMs + (performance.now() - segmentStart);
		}
		return accumulatedMs;
	}

	function pad2(n) {
		return (n < 10 ? "0" : "") + n;
	}

	function formatElapsed(ms) {
		ms = Math.max(0, Math.floor(ms));
		var totalSec = ms / 1000;
		var m = Math.floor(totalSec / 60);
		var s = totalSec % 60;
		var intS = Math.floor(s);
		var frac = Math.floor((s - intS) * 100);
		if (m > 0) {
			return m + ":" + pad2(intS) + "." + pad2(frac);
		}
		return intS + "." + pad2(frac) + " s";
	}

	function formatExactSeconds(ms) {
		return (Math.max(0, ms) / 1000).toFixed(2) + " s";
	}

	function formatDelta(secDelta) {
		var s = secDelta.toFixed(2);
		if (secDelta > 0.005) return { text: "+" + s + " s (late)", cls: "delta-late" };
		if (secDelta < -0.005) return { text: s + " s (early)", cls: "delta-early" };
		return { text: "0.00 s", cls: "delta-zero" };
	}

	function syncStatus() {
		statusEl.textContent = running ? "Running — Space to pause" : "Paused — Space to start";
		statusEl.className = "status " + (running ? "running" : "paused");
	}

	function tick() {
		elapsedEl.textContent = formatElapsed(getElapsedMs());
		if (running) rafId = requestAnimationFrame(tick);
		else rafId = null;
	}

	function scheduleTick() {
		if (rafId != null) cancelAnimationFrame(rafId);
		if (running) rafId = requestAnimationFrame(tick);
		else elapsedEl.textContent = formatElapsed(getElapsedMs());
	}

	function toggleRun() {
		if (running) {
			accumulatedMs = getElapsedMs();
			running = false;
			segmentStart = null;
		} else {
			running = true;
			segmentStart = performance.now();
		}
		syncStatus();
		scheduleTick();
	}

	function resetTimer() {
		if (rafId != null) {
			cancelAnimationFrame(rafId);
			rafId = null;
		}
		accumulatedMs = 0;
		segmentStart = null;
		running = false;
		elapsedEl.textContent = formatElapsed(0);
		syncStatus();
	}

	function logKey(keyLetter) {
		var ms = getElapsedMs();
		entries.push({ key: keyLetter, ms: ms });
		renderLog();
	}

	function renderLog() {
		logBody.innerHTML = "";
		var tgt = targetSec();
		for (var i = 0; i < entries.length; i++) {
			var e = entries[i];
			var tr = document.createElement("tr");
			var elapsedSec = e.ms / 1000;
			var deltaSec = elapsedSec - tgt;
			var d = formatDelta(deltaSec);

			var tdK = document.createElement("td");
			tdK.textContent = e.key;
			var tdE = document.createElement("td");
			tdE.textContent = formatExactSeconds(e.ms);
			var tdD = document.createElement("td");
			tdD.textContent = d.text;
			tdD.className = d.cls;

			tr.appendChild(tdK);
			tr.appendChild(tdE);
			tr.appendChild(tdD);
			logBody.appendChild(tr);
		}
		emptyLogEl.style.display = entries.length ? "none" : "block";
	}

	function clearLog() {
		entries = [];
		renderLog();
	}

	function typingTarget() {
		var el = document.activeElement;
		return el === targetInput || (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT"));
	}

	document.addEventListener("keydown", function(ev) {
		if (typingTarget()) return;

		var k = ev.key;
		if (k === " " || k === "Spacebar") {
			ev.preventDefault();
			if (ev.repeat) return;
			toggleRun();
			return;
		}

		var lower = k.length === 1 ? k.toLowerCase() : "";
		if (lower === "m" || lower === "z" || lower === "d") {
			ev.preventDefault();
			if (ev.repeat) return;
			logKey(lower.toUpperCase());
			return;
		}
	});

	document.getElementById("btn-reset-timer").addEventListener("click", resetTimer);
	document.getElementById("btn-clear-log").addEventListener("click", clearLog);

	targetInput.addEventListener("input", function() {
		renderLog();
	});

	elapsedEl.textContent = formatElapsed(0);
	syncStatus();
	renderLog();
})();
