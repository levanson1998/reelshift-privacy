/**
 * ReelShift content script for Facebook Reels.
 * Watches the active Reel video and advances when it ends.
 */

/** Aria-label / title fragments that identify Facebook's next control. */
var FACEBOOK_NEXT_LABEL_HINTS = [
  "next reel",
  "next video",
  "next",
  "go to next"
];

/** Ignore long-form player elements when selecting a Reel (seconds). */
var FACEBOOK_REELS_MAX_DURATION_SECONDS = 600;

/** Shared watcher instance for the current Reels page. */
var facebookWatcher = null;

/** Route watcher that detects navigation to or from Reels on Facebook SPA pages. */
var facebookRouteSpa = null;

/** Unsubscribe function for settings changes. */
var facebookSettingsUnsubscribe = null;

/** Latest settings snapshot used by the Reels controller. */
var facebookSettings = null;

/** True while the Reels controller is active. */
var facebookRunning = false;

/** Timer used to retry finding a video after navigation. */
var facebookFindTimerId = null;

/** Debounce timer for route-change reattach. */
var facebookRouteAttachTimerId = null;

/** Last video element the watcher attached to. */
var facebookAttachedVideo = null;

/**
 * Returns true when the current page looks like a Facebook Reel route.
 * @returns {boolean}
 */
function isFacebookReelsPage() {
  var path = window.location.pathname || "";
  if (path.indexOf("/reel/") !== -1) {
    return true;
  }
  if (path === "/reels") {
    return true;
  }
  if (path.indexOf("/reels/") !== -1) {
    return true;
  }
  return false;
}

/**
 * Returns true when the focused element looks like a comment or text input.
 * @returns {boolean}
 */
function isFacebookUserInteracting() {
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
 * Returns true when a video element looks like the active Reel player.
 * @param {HTMLVideoElement} video
 * @returns {boolean}
 */
function isValidFacebookReelsVideo(video) {
  if (!video || !isElementVisible(video)) {
    return false;
  }

  var duration = video.duration;
  if (typeof duration !== "number" || isNaN(duration) || !isFinite(duration) || duration <= 0) {
    return false;
  }

  if (duration > FACEBOOK_REELS_MAX_DURATION_SECONDS) {
    return false;
  }

  if (video.readyState < 1) {
    return false;
  }

  var remaining = duration - video.currentTime;
  if (remaining <= REELSHIFT_ENDED_NEAR_SECONDS) {
    return false;
  }

  return true;
}

/**
 * Finds the visible Reel video element, skipping long-form or unloaded players.
 * @returns {HTMLVideoElement|null}
 */
function findFacebookReelsVideo() {
  var videos = document.querySelectorAll("video");
  var best = null;
  var bestScore = -1;
  var index;

  for (index = 0; index < videos.length; index += 1) {
    var video = videos[index];
    if (!isValidFacebookReelsVideo(video)) {
      continue;
    }

    var rect = video.getBoundingClientRect();
    var area = rect.width * rect.height;
    var score = area;

    // Prefer the fresh reel: playing and near the start of playback.
    if (!video.paused && !video.ended) {
      score = score + 1000000;
    }

    score = score - (video.currentTime * 1000);

    if (score > bestScore) {
      bestScore = score;
      best = video;
    }
  }

  return best;
}

/**
 * Clears the route debounce timer.
 */
function clearFacebookRouteAttachTimer() {
  if (facebookRouteAttachTimerId !== null) {
    clearTimeout(facebookRouteAttachTimerId);
    facebookRouteAttachTimerId = null;
  }
}

/**
 * Schedules a debounced attach after Facebook SPA navigation.
 * @param {number} delayMs
 */
function scheduleFacebookRouteAttach(delayMs) {
  clearFacebookRouteAttachTimer();
  facebookRouteAttachTimerId = setTimeout(function () {
    facebookRouteAttachTimerId = null;
    if (facebookWatcher && facebookWatcher.unlock) {
      facebookWatcher.unlock();
    }
    attachFacebookWatcher();
  }, delayMs);
}

/**
 * Clears the delayed video-find timer.
 */
function clearFacebookFindTimer() {
  if (facebookFindTimerId !== null) {
    clearTimeout(facebookFindTimerId);
    facebookFindTimerId = null;
  }
}

/**
 * Schedules another attempt to attach to the Reels player.
 * @param {number} delayMs
 */
function scheduleFacebookAttachRetry(delayMs) {
  clearFacebookFindTimer();
  facebookFindTimerId = setTimeout(attachFacebookWatcher, delayMs);
}

/**
 * Scrolls the Reels feed container as a fallback when buttons and keys fail.
 * @returns {boolean}
 */
function scrollFacebookReelsFeed() {
  var scrollers = document.querySelectorAll("div");
  var index;
  var best = null;
  var bestHeight = 0;

  for (index = 0; index < scrollers.length; index += 1) {
    var element = scrollers[index];
    var style = window.getComputedStyle(element);
    if (style.overflowY !== "auto" && style.overflowY !== "scroll") {
      continue;
    }

    var rect = element.getBoundingClientRect();
    if (rect.height > bestHeight && rect.height > 200) {
      bestHeight = rect.height;
      best = element;
    }
  }

  if (best) {
    best.scrollBy({ top: best.clientHeight, behavior: "smooth" });
    return true;
  }

  window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
  return true;
}

/**
 * Advances to the next Reel using a next control, ArrowDown, or scroll.
 */
function advanceFacebookReel() {
  if (!facebookWatcher) {
    return;
  }

  try {
    facebookWatcher.lock();
    var mode = goToNextVideo(document, FACEBOOK_NEXT_LABEL_HINTS);
    if (mode === "arrow") {
      scrollFacebookReelsFeed();
    }
  } catch (error) {
    console.error("ReelShift: failed to advance Facebook Reel", error);
  }

  scheduleFacebookAttachRetry(800);
}

/**
 * Handles the end of the current Reel according to settings.
 */
function onFacebookReelEnded() {
  if (!facebookSettings || !facebookSettings.enabled || !facebookSettings.facebookEnabled) {
    return;
  }

  if (facebookSettings.pauseWhenInteracting && isFacebookUserInteracting()) {
    return;
  }

  if (!facebookWatcher) {
    return;
  }

  facebookWatcher.scheduleNext(function () {
    advanceFacebookReel();
  }, facebookSettings.delayMs);
}

/**
 * Waits for the Reels player to become ready, then re-runs attach.
 * @param {HTMLVideoElement} video
 */
function waitForFacebookReelsVideoReady(video) {
  if (!video) {
    return;
  }

  function recheckAfterReady() {
    if (!facebookRunning) {
      return;
    }
    scheduleFacebookAttachRetry(100);
  }

  if (!video.duration || isNaN(video.duration) || video.readyState < 1) {
    video.addEventListener("loadedmetadata", recheckAfterReady, { once: true });
  }

  if (video.paused) {
    video.addEventListener("playing", recheckAfterReady, { once: true });
  }
}

/**
 * Attaches the watcher to the current active Reel video when available.
 */
function attachFacebookWatcher() {
  if (!facebookRunning || !facebookWatcher) {
    return;
  }

  clearFacebookFindTimer();

  var video = null;
  try {
    video = findFacebookReelsVideo();
  } catch (error) {
    console.error("ReelShift: failed to find Facebook video", error);
    scheduleFacebookAttachRetry(500);
    return;
  }

  if (!video) {
    scheduleFacebookAttachRetry(500);
    return;
  }

  if (facebookAttachedVideo === video) {
    var remaining = video.duration - video.currentTime;
    if (remaining <= REELSHIFT_ENDED_NEAR_SECONDS) {
      scheduleFacebookAttachRetry(500);
      return;
    }
  }

  try {
    facebookWatcher.attach(video, onFacebookReelEnded);
    facebookAttachedVideo = video;
    waitForFacebookReelsVideoReady(video);
  } catch (error) {
    console.error("ReelShift: failed to attach Facebook watcher", error);
    scheduleFacebookAttachRetry(500);
  }
}

/**
 * Stops video watching but keeps the Facebook route watcher alive.
 */
function stopFacebookReelsAutomation() {
  facebookRunning = false;
  clearFacebookFindTimer();
  clearFacebookRouteAttachTimer();
  facebookAttachedVideo = null;

  if (facebookWatcher) {
    try {
      facebookWatcher.detach();
    } catch (error) {
      console.error("ReelShift: failed to detach Facebook watcher", error);
    }
  }
}

/**
 * Prepares automation state, then attaches after Facebook finishes swapping reels.
 */
function prepareFacebookReelsAutomation() {
  if (!isFacebookReelsPage()) {
    stopFacebookReelsAutomation();
    return;
  }

  if (!facebookSettings) {
    getSettings().then(function (settings) {
      applyFacebookSettings(settings);
    }).catch(function (error) {
      console.error("ReelShift: failed to load settings before starting Reels", error);
    });
    return;
  }

  if (!facebookSettings.enabled || !facebookSettings.facebookEnabled) {
    stopFacebookReelsAutomation();
    return;
  }

  if (!facebookWatcher) {
    facebookWatcher = createVideoWatcher();
  }

  facebookRunning = true;
}

/**
 * Ensures a route watcher is running so SPA navigation into Reels works.
 */
function ensureFacebookRouteWatcher() {
  if (facebookRouteSpa) {
    return;
  }

  facebookRouteSpa = createSpaNavigator(function () {
    var onReelsNow = isFacebookReelsPage();

    if (onReelsNow) {
      prepareFacebookReelsAutomation();
      scheduleFacebookRouteAttach(350);
      return;
    }

    stopFacebookReelsAutomation();
  });

  facebookRouteSpa.start();
}

/**
 * Starts Reels automation when settings allow it.
 */
function startFacebookReels() {
  prepareFacebookReelsAutomation();
  if (!facebookRunning) {
    return;
  }
  attachFacebookWatcher();
}

/**
 * Applies a settings snapshot and restarts or stops automation.
 * @param {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}} settings
 */
function applyFacebookSettings(settings) {
  facebookSettings = settings;
  startFacebookReels();
}

/**
 * Initializes the Facebook Reels controller on any Facebook page.
 */
function initFacebookReels() {
  ensureFacebookRouteWatcher();

  getSettings().then(function (settings) {
    applyFacebookSettings(settings);
  }).catch(function (error) {
    console.error("ReelShift: failed to load settings on Facebook", error);
  });

  if (!facebookSettingsUnsubscribe) {
    facebookSettingsUnsubscribe = onSettingsChanged(function (settings) {
      applyFacebookSettings(settings);
    });
  }
}

try {
  initFacebookReels();
} catch (error) {
  console.error("ReelShift: Facebook Reels init failed", error);
}
