(function() {
	var rowsRoot = document.getElementById("contestant-rows");
	var globalFile = document.getElementById("global-file");
	var fileTargetRow = null;

	var lastState = TMSync.loadPersisted() || TMSync.defaultState();
	if (typeof lastState.projectorMessage !== "string") lastState.projectorMessage = "";

	if (typeof BroadcastChannel === "undefined") {
		var help = document.getElementById("help-storage");
		if (help) help.textContent = "Your browser is missing tab sync; try updating Chrome or Edge.";
	}

	function syncModeRadios() {
		var mode = lastState.viewMode || "scoreboard";
		var radios = document.querySelectorAll('input[name="viewMode"]');
		for (var i = 0; i < radios.length; i++) {
			radios[i].checked = radios[i].value === mode;
		}
	}

	function syncProjectorMessageFromState() {
		var ta = document.getElementById("projector-message-input");
		if (!ta) return;
		ta.value = typeof lastState.projectorMessage === "string" ? lastState.projectorMessage : "";
	}

	function syncTimerInputs() {
		var tm = lastState.timer || {};
		var dMs = tm.durationMs != null ? Number(tm.durationMs) : null;
		if (dMs == null || isNaN(dMs)) {
			var legacy = tm.durationSec != null ? Number(tm.durationSec) : 300;
			dMs = Math.round(legacy * 1000);
		}
		document.getElementById("timer-min").value = Math.floor(dMs / 60000);
		document.getElementById("timer-sec").value = Math.floor((dMs % 60000) / 1000);
	}

	function gatherContestantsFromUI() {
		var rowEls = rowsRoot.querySelectorAll(".contestant-row");
		var list = [];
		for (var i = 0; i < rowEls.length; i++) {
			var row = rowEls[i];
			var inp = row.querySelector(".score-input");
			var rawImg = row.dataset.image || "./images/blank.jpg";
			var sc = inp && inp.value !== "" ? parseFloat(inp.value) : 0;
			if (isNaN(sc)) sc = 0;
			var prev = lastState.contestants[i];
			list.push({
				image: rawImg,
				score: sc,
				oldScore: prev ? prev.oldScore : sc
			});
		}
		return list;
	}

	function pushApplyState() {
		lastState.contestants = gatherContestantsFromUI();
		var taMsg = document.getElementById("projector-message-input");
		lastState.projectorMessage = taMsg ? taMsg.value : "";
		var checked = document.querySelector('input[name="viewMode"]:checked');
		lastState.viewMode = checked ? checked.value : "scoreboard";
		lastState.version = 1;
		if (!lastState.timer) {
			lastState.timer = { durationMs: 300000, remainingMs: 300000, running: false };
		}
		var snapshot = JSON.parse(JSON.stringify(lastState));
		TMSync.savePersisted(snapshot);
		lastState = snapshot;
		TMSync.post({ t: "applyState", state: snapshot });
	}

	function renderRows() {
		rowsRoot.innerHTML = "";
		for (var i = 0; i < lastState.contestants.length; i++) {
			rowsRoot.appendChild(createRowEl(lastState.contestants[i]));
		}
	}

	function createRowEl(con) {
		var row = document.createElement("div");
		row.className = "contestant-row";
		row.dataset.image = con.image || "./images/blank.jpg";

		var img = document.createElement("img");
		img.className = "thumb";
		img.src = row.dataset.image;
		img.alt = "";

		var btnPic = document.createElement("button");
		btnPic.type = "button";
		btnPic.className = "btn secondary";
		btnPic.textContent = "Photo";
		btnPic.style.marginTop = "0";
		btnPic.style.fontSize = "0.8rem";
		btnPic.style.padding = "0.35rem 0.5rem";

		btnPic.addEventListener("click", function() {
			fileTargetRow = row;
			globalFile.value = "";
			globalFile.click();
		});

		var inp = document.createElement("input");
		inp.type = "number";
		inp.className = "score-input";
		inp.step = "any";
		inp.value = String(con.score != null ? con.score : 0);

		var btnRm = document.createElement("button");
		btnRm.type = "button";
		btnRm.className = "btn danger";
		btnRm.textContent = "Remove";
		btnRm.addEventListener("click", function() {
			lastState.contestants = gatherContestantsFromUI();
			var idx = Array.prototype.indexOf.call(rowsRoot.querySelectorAll(".contestant-row"), row);
			if (idx >= 0) lastState.contestants.splice(idx, 1);
			renderRows();
			pushApplyState();
		});

		row.appendChild(img);
		row.appendChild(btnPic);
		row.appendChild(inp);
		row.appendChild(btnRm);

		return row;
	}

	globalFile.addEventListener("change", function() {
		var f = globalFile.files && globalFile.files[0];
		if (!f || !fileTargetRow) return;
		var reader = new FileReader();
		reader.onload = function() {
			fileTargetRow.dataset.image = reader.result;
			var thumb = fileTargetRow.querySelector(".thumb");
			if (thumb) thumb.src = reader.result;
			fileTargetRow = null;
			globalFile.value = "";
			pushApplyState();
		};
		reader.readAsDataURL(f);
	});

	document.getElementById("btn-add").addEventListener("click", function() {
		lastState.contestants = gatherContestantsFromUI();
		lastState.contestants.push({
			image: "./images/blank.jpg",
			score: 0,
			oldScore: 0
		});
		renderRows();
		pushApplyState();
	});

	document.getElementById("btn-commit").addEventListener("click", function() {
		var list = gatherContestantsFromUI().map(function(c) {
			return { image: c.image, score: c.score };
		});
		TMSync.post({ t: "commitScores", contestants: list });
	});

	var modeRadios = document.querySelectorAll('input[name="viewMode"]');
	for (var r = 0; r < modeRadios.length; r++) {
		modeRadios[r].addEventListener("change", pushApplyState);
	}

	var messagePushTimer = null;
	var projectorMsgTa = document.getElementById("projector-message-input");
	if (projectorMsgTa) {
		projectorMsgTa.addEventListener("input", function() {
			if (messagePushTimer) clearTimeout(messagePushTimer);
			messagePushTimer = setTimeout(function() {
				messagePushTimer = null;
				pushApplyState();
			}, 120);
		});
	}

	document.getElementById("btn-timer-length").addEventListener("click", function() {
		var m = parseInt(document.getElementById("timer-min").value, 10) || 0;
		var s = parseInt(document.getElementById("timer-sec").value, 10) || 0;
		var sec = Math.max(1, m * 60 + s);
		var ms = Math.round(sec * 1000);
		lastState.timer = {
			durationMs: ms,
			remainingMs: ms,
			running: false
		};
		var vmRadios = document.querySelectorAll('input[name="viewMode"]');
		for (var vi = 0; vi < vmRadios.length; vi++) {
			vmRadios[vi].checked = vmRadios[vi].value === "timer";
		}
		pushApplyState();
		TMSync.post({ t: "timer", cmd: "startDelayed", delayMs: 500 });
	});

	document.getElementById("btn-timer-start").addEventListener("click", function() {
		TMSync.post({ t: "timer", cmd: "start" });
	});

	document.getElementById("btn-timer-pause").addEventListener("click", function() {
		TMSync.post({ t: "timer", cmd: "pause" });
	});

	document.getElementById("btn-timer-reset").addEventListener("click", function() {
		TMSync.post({ t: "timer", cmd: "reset" });
	});

	window.addEventListener("storage", function(ev) {
		if (ev.key !== TMSync.STORAGE_KEY || !ev.newValue) return;
		try {
			lastState = JSON.parse(ev.newValue);
			if (typeof lastState.projectorMessage !== "string") lastState.projectorMessage = "";
			syncModeRadios();
			syncTimerInputs();
			syncProjectorMessageFromState();
			renderRows();
		} catch (err) {}
	});

	syncModeRadios();
	syncTimerInputs();
	syncProjectorMessageFromState();
	renderRows();

	var boot = JSON.parse(JSON.stringify(lastState));
	TMSync.savePersisted(boot);
	lastState = boot;
	TMSync.post({ t: "applyState", state: boot });
})();
