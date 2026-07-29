/**
 * ReelShift background service worker.
 * Initializes default settings on install and keeps storage ready for the UI.
 */

importScripts("../shared/constants.js");

/**
 * Writes default settings when the key is missing.
 * Existing user settings are left unchanged.
 * @returns {Promise<void>}
 */
function ensureDefaultSettings() {
  return chrome.storage.local.get(REELSHIFT_SETTINGS_KEY).then(function (result) {
    if (result[REELSHIFT_SETTINGS_KEY]) {
      return;
    }

    var payload = {};
    payload[REELSHIFT_SETTINGS_KEY] = {
      enabled: REELSHIFT_DEFAULT_SETTINGS.enabled,
      youtubeEnabled: REELSHIFT_DEFAULT_SETTINGS.youtubeEnabled,
      facebookEnabled: REELSHIFT_DEFAULT_SETTINGS.facebookEnabled,
      delayMs: REELSHIFT_DEFAULT_SETTINGS.delayMs,
      pauseWhenInteracting: REELSHIFT_DEFAULT_SETTINGS.pauseWhenInteracting
    };
    return chrome.storage.local.set(payload);
  });
}

/**
 * Handles extension install and update events.
 * Ensures defaults exist after a fresh install.
 * @param {chrome.runtime.InstalledDetails} details
 */
function onInstalled(details) {
  ensureDefaultSettings().catch(function (error) {
    console.error("ReelShift: failed to initialize settings", error);
  });

  if (details && details.reason) {
    console.log("ReelShift: installed or updated (" + details.reason + ")");
  }
}

chrome.runtime.onInstalled.addListener(onInstalled);

ensureDefaultSettings().catch(function (error) {
  console.error("ReelShift: failed to ensure settings on startup", error);
});
