/**
 * Settings helpers for ReelShift.
 * Reads and writes chrome.storage.local and notifies listeners on change.
 */

/**
 * Returns a shallow copy of the default settings object.
 * @returns {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}}
 */
function getDefaultSettings() {
  return {
    enabled: REELSHIFT_DEFAULT_SETTINGS.enabled,
    youtubeEnabled: REELSHIFT_DEFAULT_SETTINGS.youtubeEnabled,
    facebookEnabled: REELSHIFT_DEFAULT_SETTINGS.facebookEnabled,
    delayMs: REELSHIFT_DEFAULT_SETTINGS.delayMs,
    pauseWhenInteracting: REELSHIFT_DEFAULT_SETTINGS.pauseWhenInteracting
  };
}

/**
 * Clamps delayMs into the allowed range and fills missing fields from defaults.
 * @param {Object|null|undefined} raw
 * @returns {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}}
 */
function normalizeSettings(raw) {
  var defaults = getDefaultSettings();
  var source = raw || {};

  var delayMs = defaults.delayMs;
  if (typeof source.delayMs === "number" && !isNaN(source.delayMs)) {
    delayMs = source.delayMs;
  }
  if (delayMs < REELSHIFT_MIN_DELAY_MS) {
    delayMs = REELSHIFT_MIN_DELAY_MS;
  }
  if (delayMs > REELSHIFT_MAX_DELAY_MS) {
    delayMs = REELSHIFT_MAX_DELAY_MS;
  }

  return {
    enabled: source.enabled === undefined ? defaults.enabled : !!source.enabled,
    youtubeEnabled: source.youtubeEnabled === undefined ? defaults.youtubeEnabled : !!source.youtubeEnabled,
    facebookEnabled: source.facebookEnabled === undefined ? defaults.facebookEnabled : !!source.facebookEnabled,
    delayMs: delayMs,
    pauseWhenInteracting: source.pauseWhenInteracting === undefined
      ? defaults.pauseWhenInteracting
      : !!source.pauseWhenInteracting
  };
}

/**
 * Loads settings from chrome.storage.local.
 * @returns {Promise<{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}>}
 */
function getSettings() {
  return chrome.storage.local.get(REELSHIFT_SETTINGS_KEY).then(function (result) {
    return normalizeSettings(result[REELSHIFT_SETTINGS_KEY]);
  });
}

/**
 * Saves settings to chrome.storage.local after normalization.
 * @param {Object} partialOrFull Settings object or partial fields to merge with current values.
 * @returns {Promise<{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}>}
 */
function setSettings(partialOrFull) {
  return getSettings().then(function (current) {
    var merged = {
      enabled: partialOrFull.enabled === undefined ? current.enabled : partialOrFull.enabled,
      youtubeEnabled: partialOrFull.youtubeEnabled === undefined ? current.youtubeEnabled : partialOrFull.youtubeEnabled,
      facebookEnabled: partialOrFull.facebookEnabled === undefined ? current.facebookEnabled : partialOrFull.facebookEnabled,
      delayMs: partialOrFull.delayMs === undefined ? current.delayMs : partialOrFull.delayMs,
      pauseWhenInteracting: partialOrFull.pauseWhenInteracting === undefined
        ? current.pauseWhenInteracting
        : partialOrFull.pauseWhenInteracting
    };
    var normalized = normalizeSettings(merged);
    var payload = {};
    payload[REELSHIFT_SETTINGS_KEY] = normalized;
    return chrome.storage.local.set(payload).then(function () {
      return normalized;
    });
  });
}

/**
 * Subscribes to settings changes in chrome.storage.local.
 * @param {function({enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}): void} callback
 * @returns {function(): void} Unsubscribe function.
 */
function onSettingsChanged(callback) {
  /**
   * Handles chrome.storage.onChanged events and forwards normalized settings.
   * @param {Object} changes
   * @param {string} areaName
   */
  function handleChange(changes, areaName) {
    if (areaName !== "local") {
      return;
    }
    if (!changes[REELSHIFT_SETTINGS_KEY]) {
      return;
    }
    var nextValue = changes[REELSHIFT_SETTINGS_KEY].newValue;
    callback(normalizeSettings(nextValue));
  }

  chrome.storage.onChanged.addListener(handleChange);

  return function unsubscribe() {
    chrome.storage.onChanged.removeListener(handleChange);
  };
}
