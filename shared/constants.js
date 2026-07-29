/**
 * Shared constants for ReelShift.
 * Used by the service worker, UI pages, and content scripts.
 */

/** Storage key for the settings object in chrome.storage.local. */
var REELSHIFT_SETTINGS_KEY = "settings";

/**
 * Default settings applied when the user has no saved preferences.
 * @type {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}}
 */
var REELSHIFT_DEFAULT_SETTINGS = {
  enabled: true,
  youtubeEnabled: true,
  facebookEnabled: true,
  delayMs: 500,
  pauseWhenInteracting: true
};

/** Minimum allowed delay in milliseconds. */
var REELSHIFT_MIN_DELAY_MS = 0;

/** Maximum allowed delay in milliseconds. */
var REELSHIFT_MAX_DELAY_MS = 5000;

/** How often the SPA navigator checks for URL changes (milliseconds). */
var REELSHIFT_SPA_POLL_MS = 1000;

/** Lock duration after triggering next to prevent double advances (milliseconds). */
var REELSHIFT_NEXT_LOCK_MS = 1500;

/** Remaining media time under which timeupdate may treat the video as ended (seconds). */
var REELSHIFT_ENDED_NEAR_SECONDS = 0.35;
