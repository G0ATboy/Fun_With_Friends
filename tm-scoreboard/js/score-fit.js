(function(global) {
	function fitScoreToContainer(scoreEl, containerEl, opts) {
		if (!scoreEl || !containerEl) return;
		opts = opts || {};
		var padX = opts.padX != null ? opts.padX : 14;
		var padY = opts.padY != null ? opts.padY : 12;
		var minPx = opts.minPx != null ? opts.minPx : 28;
		var maxPx = opts.maxPx != null ? opts.maxPx : 560;

		var cw = containerEl.clientWidth;
		var ch = containerEl.clientHeight;
		if (cw < 56 || ch < 56) {
			scoreEl.style.fontSize = Math.min(72, Math.max(minPx, cw * 0.35)) + "px";
			return;
		}

		var maxW = Math.max(1, cw - padX);
		var maxH = Math.max(1, ch - padY);

		scoreEl.style.whiteSpace = "nowrap";
		scoreEl.style.lineHeight = "1";
		scoreEl.style.margin = "0";
		scoreEl.style.marginLeft = "0";
		scoreEl.style.padding = "0";
		scoreEl.style.boxSizing = "border-box";
		scoreEl.style.position = "absolute";
		scoreEl.style.left = "50%";
		scoreEl.style.top = "50%";
		scoreEl.style.transform = "translate(-50%, -50%)";
		scoreEl.style.width = "auto";
		scoreEl.style.height = "auto";
		scoreEl.style.maxWidth = maxW + "px";

		var low = minPx;
		var high = maxPx;
		var best = minPx;

		while (low <= high) {
			var mid = (low + high) >> 1;
			scoreEl.style.fontSize = mid + "px";
			var w = scoreEl.scrollWidth;
			var h = scoreEl.scrollHeight;
			if (w <= maxW && h <= maxH) {
				best = mid;
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		scoreEl.style.fontSize = best + "px";
		scoreEl.style.maxWidth = "";
	}

	function fitAllScores(scope) {
		scope = scope || document;
		var containers = scope.querySelectorAll(".score-container");
		for (var i = 0; i < containers.length; i++) {
			var scoreEl = containers[i].querySelector(".score");
			if (scoreEl) fitScoreToContainer(scoreEl, containers[i]);
		}
	}

	function fitTimerDigits(timerDigitsEl, wrapEl, opts) {
		if (!timerDigitsEl || !wrapEl || wrapEl.clientWidth < 4 || wrapEl.clientHeight < 4) return;

		opts = opts || {};
		var pad = opts.pad != null ? opts.pad : 8;
		var minPx = opts.minPx != null ? opts.minPx : 12;
		var maxPx = opts.maxPx != null ? opts.maxPx : 3200;

		var maxW = Math.max(1, wrapEl.clientWidth - pad * 2);
		var maxH = Math.max(1, wrapEl.clientHeight - pad * 2);

		timerDigitsEl.style.whiteSpace = "nowrap";
		timerDigitsEl.style.lineHeight = "1";
		timerDigitsEl.style.margin = "0";
		timerDigitsEl.style.width = "auto";
		timerDigitsEl.style.maxWidth = maxW + "px";

		var low = minPx;
		var high = Math.min(maxPx, Math.floor(Math.max(maxW, maxH) * 2));
		var best = minPx;

		while (low <= high) {
			var mid = (low + high) >> 1;
			timerDigitsEl.style.fontSize = mid + "px";
			var w = timerDigitsEl.scrollWidth;
			var h = timerDigitsEl.scrollHeight;
			if (w <= maxW && h <= maxH) {
				best = mid;
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		timerDigitsEl.style.fontSize = best + "px";
		timerDigitsEl.style.maxWidth = "";
	}

	function fitWrappedProjectorText(textEl, wrapEl, opts) {
		if (!textEl || !wrapEl || wrapEl.clientWidth < 8 || wrapEl.clientHeight < 8) return;

		opts = opts || {};
		var pad = opts.pad != null ? opts.pad : 22;
		var minPx = opts.minPx != null ? opts.minPx : 28;
		var maxPx = opts.maxPx != null ? opts.maxPx : 156;
		var lineHeight = opts.lineHeight != null ? opts.lineHeight : 1.22;

		var maxW = Math.max(1, wrapEl.clientWidth - pad * 2);
		var maxH = Math.max(1, wrapEl.clientHeight - pad * 2);

		textEl.style.boxSizing = "border-box";
		textEl.style.display = "block";
		textEl.style.width = maxW + "px";
		textEl.style.maxWidth = maxW + "px";
		textEl.style.margin = "0 auto";
		textEl.style.whiteSpace = "pre-wrap";
		textEl.style.overflowWrap = "anywhere";
		textEl.style.wordBreak = "break-word";
		textEl.style.lineHeight = String(lineHeight);

		var txt = textEl.textContent || "";
		if (!txt.trim()) {
			textEl.style.fontSize = minPx + "px";
			return;
		}

		var low = minPx;
		var high = maxPx;
		var best = minPx;

		while (low <= high) {
			var mid = (low + high) >> 1;
			textEl.style.fontSize = mid + "px";
			var th = textEl.scrollHeight;
			if (th <= maxH + 1) {
				best = mid;
				low = mid + 1;
			} else {
				high = mid - 1;
			}
		}

		textEl.style.fontSize = best + "px";
	}

	global.TMScoreFit = {
		fitOneScore: fitScoreToContainer,
		fitAllScores: fitAllScores,
		fitTimerDigits: fitTimerDigits,
		fitWrappedProjectorText: fitWrappedProjectorText
	};
})(window);
