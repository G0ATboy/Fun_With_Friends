(function(global) {
	var STAGE_WIDTH = 1400;
	var BASE_SLOT_PX = 205;
	var FRAME_BLOCK_PX = 275;

	function iconScaleForCount(playerCount) {
		var n = Math.max(1, playerCount);
		if (n >= 5) return 1;
		return 1 + (5 - n) * 0.21;
	}

	function winnerScale(isWinner, winnerTieCount) {
		if (!isWinner) return 1;
		return winnerTieCount > 2 ? 1.1 : 1.2;
	}

	function slotWidthForLayout(iconScale) {
		if (iconScale <= 1) return BASE_SLOT_PX;
		return Math.ceil(BASE_SLOT_PX * iconScale * 1.28);
	}

	function slotXsEqualGap(cols, slotW, stageW) {
		var xs = [];
		var n = cols;
		var W = stageW != null ? stageW : STAGE_WIDTH;
		if (n <= 0) return xs;
		if (n === 1) {
			xs.push((W - slotW) / 2);
			return xs;
		}
		var gap = (W - n * slotW) / (n + 1);
		for (var i = 0; i < n; i++) {
			xs.push(gap + i * (slotW + gap));
		}
		return xs;
	}

	function mainHeightPx(iconScale) {
		var base = 460;
		var extra = 320 * Math.max(0, iconScale - 1);
		var maxCombined = iconScale * 1.2;
		var minSafe = Math.ceil(FRAME_BLOCK_PX * maxCombined + 220);
		return Math.max(Math.round(base + extra), minSafe);
	}

	function projectorFitTransform(viewportW, viewportH, stageW, stageH, playerCount) {
		var n = playerCount > 0 ? playerCount : 5;
		var iconScale = iconScaleForCount(n);
		var maxComb = iconScale * winnerScale(true, 1);

		var extraTopPx = Math.ceil(FRAME_BLOCK_PX * Math.max(0, maxComb - iconScale));
		var effH = stageH + extraTopPx;

		var m = Math.min(viewportW / stageW, viewportH / effH);
		var tx = (viewportW - stageW * m) / 2;
		var ty = (viewportH - effH * m) / 2 + extraTopPx * m;
		return { m: m, tx: tx, ty: ty };
	}

	global.TMContestantLayout = {
		STAGE_WIDTH: STAGE_WIDTH,
		BASE_SLOT_PX: BASE_SLOT_PX,
		iconScaleForCount: iconScaleForCount,
		winnerScale: winnerScale,
		slotWidthForLayout: slotWidthForLayout,
		slotXsEqualGap: slotXsEqualGap,
		mainHeightPx: mainHeightPx,
		FRAME_BLOCK_PX: FRAME_BLOCK_PX,
		projectorFitTransform: projectorFitTransform
	};
})(window);
