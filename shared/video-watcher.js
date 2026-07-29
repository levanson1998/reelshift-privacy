/**
 * Video watching helpers for ReelShift.
 * Finds the active video element and schedules the next-video action when it ends.
 */

/**
 * Returns true when an element has a visible non-zero layout box.
 * @param {Element|null} element
 * @returns {boolean}
 */
function isElementVisible(element) {
  if (!element || !element.getBoundingClientRect) {
    return false;
  }

  var rect = element.getBoundingClientRect();
  if (rect.width < 40 || rect.height < 40) {
    return false;
  }

  var style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }

  return true;
}

/**
 * Finds the main visible video element on the page.
 * Prefers a playing video with the largest visible area.
 * @returns {HTMLVideoElement|null}
 */
function findActiveVideo() {
  var videos = document.querySelectorAll("video");
  var best = null;
  var bestScore = -1;
  var index;

  for (index = 0; index < videos.length; index += 1) {
    var video = videos[index];
    if (!isElementVisible(video)) {
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
 * Creates a controller that watches one video and fires when it ends.
 * @returns {{attach: function(HTMLVideoElement, function(): void): void, detach: function(): void, scheduleNext: function(function(): void, number): void, cancelScheduledNext: function(): void, isLocked: function(): boolean, lock: function(): void, unlock: function(): void}}
 */
function createVideoWatcher() {
  var currentVideo = null;
  var onEndedCallback = null;
  var pendingTimerId = null;
  var lockUntil = 0;
  var endedFallbackFired = false;
  var onVideoEnded = null;

  /**
   * Clears any pending delayed next callback.
   */
  function cancelScheduledNext() {
    if (pendingTimerId !== null) {
      clearTimeout(pendingTimerId);
      pendingTimerId = null;
    }
  }

  /**
   * Returns true while the short lock after a next action is active.
   * @returns {boolean}
   */
  function isLocked() {
    return Date.now() < lockUntil;
  }

  /**
   * Starts a short lock window to prevent double advances.
   */
  function lock() {
    lockUntil = Date.now() + REELSHIFT_NEXT_LOCK_MS;
  }

  /**
   * Clears the advance lock so a new reel can be watched after navigation.
   */
  function unlock() {
    lockUntil = 0;
    endedFallbackFired = false;
  }

  /**
   * Schedules a callback after delayMs. Only one pending timer is kept.
   * @param {function(): void} callback
   * @param {number} delayMs
   */
  function scheduleNext(callback, delayMs) {
    cancelScheduledNext();

    var wait = delayMs;
    if (typeof wait !== "number" || isNaN(wait) || wait < 0) {
      wait = 0;
    }

    pendingTimerId = setTimeout(function () {
      pendingTimerId = null;
      callback();
    }, wait);
  }

  /**
   * Handles a native ended event or a near-end timeupdate fallback.
   */
  function handleEnded() {
    if (!onEndedCallback) {
      return;
    }
    if (isLocked()) {
      return;
    }
    if (endedFallbackFired) {
      return;
    }

    endedFallbackFired = true;
    onEndedCallback();
  }

  /**
   * timeupdate backup when the ended event is missed by the host player.
   */
  function handleTimeUpdate() {
    if (!currentVideo) {
      return;
    }
    if (!currentVideo.duration || isNaN(currentVideo.duration)) {
      return;
    }

    var remaining = currentVideo.duration - currentVideo.currentTime;
    if (remaining <= REELSHIFT_ENDED_NEAR_SECONDS) {
      handleEnded();
    }
  }

  /**
   * Detaches listeners from the current video and clears timers.
   */
  function detach() {
    cancelScheduledNext();

    if (currentVideo) {
      if (onVideoEnded) {
        currentVideo.removeEventListener("ended", onVideoEnded);
      }
      currentVideo.removeEventListener("timeupdate", handleTimeUpdate);
    }

    currentVideo = null;
    onEndedCallback = null;
    onVideoEnded = null;
    endedFallbackFired = false;
  }

  /**
   * Attaches ended/timeupdate listeners to a video element.
   * @param {HTMLVideoElement} video
   * @param {function(): void} onEnded
   */
  function attach(video, onEnded) {
    detach();

    if (!video) {
      return;
    }

    currentVideo = video;
    onEndedCallback = onEnded;
    endedFallbackFired = false;
    onVideoEnded = function () {
      handleEnded();
    };

    currentVideo.addEventListener("ended", onVideoEnded);
    currentVideo.addEventListener("timeupdate", handleTimeUpdate);
  }

  return {
    attach: attach,
    detach: detach,
    scheduleNext: scheduleNext,
    cancelScheduledNext: cancelScheduledNext,
    isLocked: isLocked,
    lock: lock,
    unlock: unlock
  };
}
