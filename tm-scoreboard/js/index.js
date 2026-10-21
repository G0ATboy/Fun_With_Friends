/*
 * Yes, this code isn't great, but it's small and works even in IE10.
 * I wasn't configuring babel/webpack for a one off fun project.
 */

(function() {
	var contestants = [];

	var locked = false;

	function requestFullscreenOnFirstGesture() {
		function tryFullscreen() {
			var root = document.documentElement;
			var req = root.requestFullscreen
				|| root.webkitRequestFullscreen
				|| root.msRequestFullscreen;
			if (!document.fullscreenElement && req) {
				req.call(root).catch(function() {});
			}
			document.removeEventListener("click", tryFullscreen, true);
			document.removeEventListener("touchstart", tryFullscreen, true);
			document.removeEventListener("keydown", tryFullscreen, true);
		}

		document.addEventListener("click", tryFullscreen, true);
		document.addEventListener("touchstart", tryFullscreen, true);
		document.addEventListener("keydown", tryFullscreen, true);
	}

	requestFullscreenOnFirstGesture();

	var main = document.querySelector("main");
	var fileInput = document.querySelector("#file-input");
	var playButton = document.querySelector("#play-button");

	function addContestant(image) {
		var contestant = {};

		contestant.image = !!image ? image : "./images/blank.jpg";
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

		frame.addEventListener("click", function() {
			var cb = function(evt) {
				if (fileInput.files && fileInput.files[0]) {
					con.image = URL.createObjectURL(fileInput.files[0]);
					fill.style.backgroundImage = "url(" + con.image + ")";
				}
				fileInput.removeEventListener("change", cb);
				fileInput.value = "";
			};

			fileInput.addEventListener("change", cb);
			fileInput.click();
		});

		var exit = document.createElement("button");
		exit.classList.add("exit-button");
		exit.innerText = "X";
		exit.addEventListener("click", function() {
			removeContestant(id - 1);
			refreshContestants();
			resize();
		});

		fill.appendChild(shadow);
		frameContainer.appendChild(fill);
		frameContainer.appendChild(frame);

		if (!locked) frameContainer.appendChild(exit);

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

		var input = document.createElement("input");
		input.classList.add("score-edit");
		input.type = "number";

		scoreContainer.isOpen = false;
		scoreContainer.addEventListener("mouseup", function(evt) {
			scoreContainer.isOpen = !scoreContainer.isOpen;

			if(scoreContainer.isOpen) {
				scoreContainer.appendChild(input);
				input.value = con.score;
				input.focus();
				input.select();
			} else {
				scoreContainer.removeChild(input);
			}
		});

		var exit = function() {
			scoreContainer.isOpen = false;
			scoreContainer.removeChild(input);

			var score = !!input.value ? parseFloat(input.value) : 0;

			if (con.score != score) {
				con.score = score;
				showPlay();
			}
		};

		input.addEventListener("focusout", exit);
		input.addEventListener("onkeydown", function(evt) {
			if (evt.key === "Enter") {
				exit();
			}
		});

		input.addEventListener("mouseup", function(evt) {
			evt.stopPropagation();
			evt.stopImmediatePropagation();
		});
		
		el.appendChild(mid);
		el.appendChild(scoreContainer);

		return el;
	}

	function addButtonTranslateX(contestantCount, slotW) {
		var addBtn = 72;
		var W = TMContestantLayout.STAGE_WIDTH;
		var n = contestantCount;
		if (n <= 0) return (W - addBtn) / 2;
		var gap = (W - n * slotW) / (n + 1);
		var xs = TMContestantLayout.slotXsEqualGap(n, slotW, W);
		return xs[n - 1] + slotW + gap / 2 - addBtn / 2;
	}

	function transformContestants() {

		contestants.sort(function(first, second) {
			if (first.score < second.score) {
				return -1;
			} else if (first.score > second.score) {
				return 1;
			} else {
				return 0;
			}
		});

		
		var maxScore = contestants[contestants.length - 1].score;
		var maxCount = 1;

		for (var i = contestants.length - 1; i > 0; --i) {
			var con = contestants[i-1];
			if (con.score == maxScore) {
				++maxCount;
			}
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
	
	function createAdd(len) {
		var res = document.createElement("button");

		res.innerText = "+";

		res.classList.add("add-button");

		var iconScale = TMContestantLayout.iconScaleForCount(len);
		var slotW = TMContestantLayout.slotWidthForLayout(iconScale);
		var ax = addButtonTranslateX(len, slotW);

		res.style.msTransform = "translateX(" + ax + "px)";
		res.style.transform = "translateX(" + ax + "px)";

		res.addEventListener("click", function() {
			addContestant();
			refreshContestants();
			resize();
		});

		return res;
	}

	function scheduleFitScores() {
		requestAnimationFrame(function() {
			requestAnimationFrame(function() {
				if (typeof TMScoreFit !== "undefined") TMScoreFit.fitAllScores(main);
			});
		});
	}

	function refreshContestants() {
		main.innerHTML = "";

		for (var i = contestants.length; i > 0; --i) {
			var con = contestants[i-1];

			var cEl = createContestantEl(con, i);
			con.el = cEl;
		}

		for (var i = contestants.length; i > 0; --i) {
			var con = contestants[i-1];
			main.appendChild(con.el);
		}

		if (!locked) {
			main.appendChild(createAdd(contestants.length));
		}

		if (contestants.length > 0) transformContestants();

		scheduleFitScores();
	}

	function ease(t, a, b) {
		var eased = t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
		return (b - a) * eased + a;
	}

	function showPlay() {
		playButton.style.display = "block";
	}

	function play() {
		playButton.style.display = "none";

		if (!locked) {
			locked = true;
			
			document.body.classList.add("locked");

			resize();
		}

		setTimeout(function() {
			var start = 0;
			var loop = function(dt) {
				if (start == 0) {
					start = dt;
				}
	
				for (var i = 0, l = contestants.length; i < l; ++i) {
					var con = contestants[i];
	
					var startRemainder = con.oldScore - Math.floor(con.oldScore);
					var endRemainder = con.score - Math.floor(con.score);
	
					var scoreEl = con.el.querySelector(".score");
	
					var score = Math.round(ease(Math.min((dt - start) / 2000, 1), Math.floor(con.oldScore), Math.floor(con.score)));
	
					if (dt - start < 1000) {
						score += startRemainder;
					} else {
						score += endRemainder;
					}
	
					scoreEl.innerText = score;
					var scoreWrap = con.el.querySelector(".score-container");
					if (scoreWrap && typeof TMScoreFit !== "undefined") {
						TMScoreFit.fitOneScore(scoreEl, scoreWrap);
					}
				}
	
				if (dt - start < 2000) {
					window.requestAnimationFrame(loop);
				} else {
					for (var i = 0, l = contestants.length; i < l; ++i) {
						var con = contestants[i];
						con.oldScore = con.score;
					}
					scheduleFitScores();
				}
			};
	
			window.requestAnimationFrame(loop);
			transformContestants();
		}, 1000);
	}

	playButton.addEventListener("mouseup", play);

	for (var i = 0; i < 5; ++i)
		addContestant();

	refreshContestants();

	function resize(rep) {
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
	}

	window.addEventListener("resize", resize);
	resize();
})();