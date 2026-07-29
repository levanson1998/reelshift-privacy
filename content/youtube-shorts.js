/**
 * ReelShift content script for YouTube Shorts.
 * Watches the active Short video and advances when it ends.
 */

/** Aria-label / title fragments that identify YouTube's next control. */
var YOUTUBE_NEXT_LABEL_HINTS = [
  "next video",
  "next",
  "go to next",
  "next short"
];

/** Ignore long-form player elements when selecting a Shorts video (seconds). */
var YOUTUBE_SHORTS_MAX_DURATION_SECONDS = 600;

/** Shared watcher instance for the current Shorts page. */
var youtubeWatcher = null;

/** Route watcher that detects navigation to or from Shorts on YouTube SPA pages. */
var youtubeRouteSpa = null;

/** Unsubscribe function for settings changes. */
var youtubeSettingsUnsubscribe = null;

/** Latest settings snapshot used by the Shorts controller. */
var youtubeSettings = null;

/** True while the Shorts controller is active. */
var youtubeRunning = false;

/** Timer used to retry finding a video after navigation. */
var youtubeFindTimerId = null;

/**
 * Returns true when the current page is a YouTube Shorts URL.
 * @returns {boolean}
 */
function isYouTubeShortsPage() {
  var path = window.location.pathname || "";
  return path.indexOf("/shorts/") !== -1;
}

/**
 * Returns true when the focused element looks like a comment or text input.
 * @returns {boolean}
 */
function isYouTubeUserInteracting() {
  var active = document.activeElement;
  if (!active) {
    return false;
  }

  var tagName = (active.tagName || "").toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  if (active.isContentEditable) {
    return true;
  }

  var role = active.getAttribute("role") || "";
  if (role === "textbox" || role === "searchbox") {
    return true;
  }

  return false;
}

/**
 * Returns true when a video element looks like the active Shorts player.
 * Rejects homepage leftovers and players that have not loaded metadata yet.
 * @param {HTMLVideoElement} video
 * @returns {boolean}
 */
function isValidYouTubeShortsVideo(video) {
  if (!video || !isElementVisible(video)) {
    return false;
  }

  var duration = video.duration;
  if (typeof duration !== "number" || isNaN(duration) || !isFinite(duration) || duration <= 0) {
    return false;
  }

  if (duration > YOUTUBE_SHORTS_MAX_DURATION_SECONDS) {
    return false;
  }

  // Wait until the player has loaded enough data to report duration reliably.
  if (video.readyState < 2) {
    return false;
  }

  return true;
}

/**
 * Finds the visible Shorts video element, skipping long-form or unloaded players.
 * @returns {HTMLVideoElement|null}
 */
function findYouTubeShortsVideo() {
  var videos = document.querySelectorAll("video");
  var best = null;
  var bestScore = -1;
  var index;

  for (index = 0; index < videos.length; index += 1) {
    var video = videos[index];
    if (!isValidYouTubeShortsVideo(video)) {
      continue;
    }

    var rect = video.getBoundingClientRect();
    var area = rect.width * rect.height;
    var score = area;

    if (!video.paused && !video.ended) {
      score = score + 1000000;
    }

    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }

  return best;
}

/**
 * Clears the delayed video-find timer.
 */
function clearYouTubeFindTimer() {
  if (youtubeFindTimerId !== null) {
    clearTimeout(youtubeFindTimerId);
    youtubeFindTimerId = null;
  }
}

/**
 * Schedules another attempt to attach to the Shorts player.
 * @param {number} delayMs
 */
function scheduleYouTubeAttachRetry(delayMs) {
  clearYouTubeFindTimer();
  youtubeFindTimerId = setTimeout(attachYouTubeWatcher, delayMs);
}

/**
 * Advances to the next Short using a next control or ArrowDown.
 */
function advanceYouTubeShort() {
  if (!youtubeWatcher) {
    return;
  }

  try {
    youtubeWatcher.lock();
    goToNextVideo(document, YOUTUBE_NEXT_LABEL_HINTS);
  } catch (error) {
    console.error("ReelShift: failed to advance YouTube Short", error);
  }

  scheduleYouTubeAttachRetry(400);
}

/**
 * Handles the end of the current Short according to settings.
 */
function onYouTubeShortEnded() {
  if (!youtubeSettings || !youtubeSettings.enabled || !youtubeSettings.youtubeEnabled) {
    return;
  }

  if (youtubeSettings.pauseWhenInteracting && isYouTubeUserInteracting()) {
    return;
  }

  if (!youtubeWatcher) {
    return;
  }

  youtubeWatcher.scheduleNext(function () {
    advanceYouTubeShort();
  }, youtubeSettings.delayMs);
}

/**
 * Waits for the Shorts player to become ready, then re-runs attach.
 * @param {HTMLVideoElement} video
 */
function waitForYouTubeShortsVideoReady(video) {
  if (!video) {
    return;
  }

  function recheckAfterReady() {
    if (!youtubeRunning) {
      return;
    }
    scheduleYouTubeAttachRetry(100);
  }

  if (!video.duration || isNaN(video.duration) || video.readyState < 2) {
    video.addEventListener("loadedmetadata", recheckAfterReady, { once: true });
  }

  if (video.paused) {
    video.addEventListener("playing", recheckAfterReady, { once: true });
  }
}

/**
 * Attaches the watcher to the current active Short video when available.
 */
function attachYouTubeWatcher() {
  if (!youtubeRunning || !youtubeWatcher) {
    return;
  }

  clearYouTubeFindTimer();

  var video = null;
  try {
    video = findYouTubeShortsVideo();
  } catch (error) {
    console.error("ReelShift: failed to find YouTube video", error);
    scheduleYouTubeAttachRetry(500);
    return;
  }

  if (!video) {
    scheduleYouTubeAttachRetry(500);
    return;
  }

  try {
    youtubeWatcher.attach(video, onYouTubeShortEnded);
    waitForYouTubeShortsVideoReady(video);
  } catch (error) {
    console.error("ReelShift: failed to attach YouTube watcher", error);
    scheduleYouTubeAttachRetry(500);
  }
}

/**
 * Stops video watching but keeps the YouTube route watcher alive.
 */
function stopYouTubeShortsAutomation() {
  youtubeRunning = false;
  clearYouTubeFindTimer();

  if (youtubeWatcher) {
    youtubeWatcher.detach();
  }
}

/**
 * Ensures a route watcher is running so SPA navigation from the YouTube home page
 * into Shorts can start automation without a full page reload.
 */
function ensureYouTubeRouteWatcher() {
  if (youtubeRouteSpa) {
    return;
  }

  youtubeRouteSpa = createSpaNavigator(function () {
    var onShortsNow = isYouTubeShortsPage();

    if (onShortsNow) {
      startYouTubeShorts();
      return;
    }

    stopYouTubeShortsAutomation();
  });

  youtubeRouteSpa.start();
}

/**
 * Starts Shorts automation when settings allow it.
 */
function startYouTubeShorts() {
  if (!isYouTubeShortsPage()) {
    stopYouTubeShortsAutomation();
    return;
  }

  if (!youtubeSettings) {
    getSettings().then(function (settings) {
      applyYouTubeSettings(settings);
    }).catch(function (error) {
      console.error("ReelShift: failed to load settings before starting Shorts", error);
    });
    return;
  }

  if (!youtubeSettings.enabled || !youtubeSettings.youtubeEnabled) {
    stopYouTubeShortsAutomation();
    return;
  }

  if (!youtubeWatcher) {
    youtubeWatcher = createVideoWatcher();
  }

  youtubeRunning = true;
  attachYouTubeWatcher();
}

/**
 * Applies a settings snapshot and restarts or stops automation.
 * @param {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}} settings
 */
function applyYouTubeSettings(settings) {
  youtubeSettings = settings;
  startYouTubeShorts();
}

/**
 * Initializes the YouTube Shorts controller on any YouTube page.
 * Route watching stays active so navigation into Shorts from the home page works.
 */
function initYouTubeShorts() {
  ensureYouTubeRouteWatcher();

  getSettings().then(function (settings) {
    applyYouTubeSettings(settings);
  }).catch(function (error) {
    console.error("ReelShift: failed to load settings on YouTube", error);
  });

  if (!youtubeSettingsUnsubscribe) {
    youtubeSettingsUnsubscribe = onSettingsChanged(function (settings) {
      applyYouTubeSettings(settings);
    });
  }
}

try {
  initYouTubeShorts();
} catch (error) {
  console.error("ReelShift: YouTube Shorts init failed", error);
}
