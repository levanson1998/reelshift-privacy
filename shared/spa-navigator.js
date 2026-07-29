/**
 * SPA navigation helpers for ReelShift.
 * Detects in-page URL changes that do not reload the document.
 */

/**
 * Creates a lightweight SPA navigator that watches location.href.
 * Uses a MutationObserver plus a short poll interval for reliability.
 * @param {function(string, string): void} onNavigate Called with (previousUrl, nextUrl).
 * @returns {{start: function(): void, stop: function(): void, getCurrentUrl: function(): string}}
 */
function createSpaNavigator(onNavigate) {
  var started = false;
  var lastUrl = "";
  var observer = null;
  var pollId = null;

  /**
   * Returns the current page URL.
   * @returns {string}
   */
  function getCurrentUrl() {
    return window.location.href;
  }

  /**
   * Checks whether the URL changed and notifies the callback.
   */
  function checkUrl() {
    var nextUrl = getCurrentUrl();
    if (nextUrl === lastUrl) {
      return;
    }

    var previousUrl = lastUrl;
    lastUrl = nextUrl;

    if (typeof onNavigate === "function") {
      onNavigate(previousUrl, nextUrl);
    }
  }

  /**
   * Starts observing URL changes.
   */
  function start() {
    if (started) {
      return;
    }

    started = true;
    lastUrl = getCurrentUrl();

    observer = new MutationObserver(function () {
      checkUrl();
    });

    if (document.documentElement) {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    pollId = setInterval(checkUrl, REELSHIFT_SPA_POLL_MS);
  }

  /**
   * Stops observing URL changes and clears timers.
   */
  function stop() {
    if (!started) {
      return;
    }

    started = false;

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (pollId !== null) {
      clearInterval(pollId);
      pollId = null;
    }
  }

  return {
    start: start,
    stop: stop,
    getCurrentUrl: getCurrentUrl
  };
}
