/**
 * ReelShift options page script.
 * Provides the full settings form plus product explanation text.
 */

/**
 * Reads a localized message by key.
 * @param {string} key
 * @returns {string}
 */
function getMessage(key) {
  return chrome.i18n.getMessage(key) || key;
}

/**
 * Applies localized strings to the options page.
 */
function applyOptionsI18n() {
  document.title = getMessage("optionsTitle");
  document.getElementById("title").textContent = getMessage("optionsTitle");
  document.getElementById("labelMaster").textContent = getMessage("labelMaster");
  document.getElementById("labelYouTube").textContent = getMessage("labelYouTube");
  document.getElementById("labelFacebook").textContent = getMessage("labelFacebook");
  document.getElementById("labelDelay").textContent = getMessage("labelDelay");
  document.getElementById("labelPauseInteracting").textContent = getMessage("labelPauseInteracting");
  document.getElementById("statusLocal").textContent = getMessage("statusLocal");
  document.getElementById("saveNotice").textContent = getMessage("saveNotice");
  document.getElementById("howItWorksTitle").textContent = getMessage("howItWorksTitle");
  document.getElementById("howItWorksBody").textContent = getMessage("howItWorksBody");
  document.getElementById("privacyTitle").textContent = getMessage("privacyTitle");
  document.getElementById("privacyBody").textContent = getMessage("privacyBody");
}

/**
 * Formats a delay value for display.
 * @param {number} delayMs
 * @returns {string}
 */
function formatDelayLabel(delayMs) {
  var seconds = delayMs / 1000;
  if (seconds === Math.floor(seconds)) {
    return seconds.toFixed(0) + "s";
  }
  return seconds.toFixed(1) + "s";
}

/**
 * Writes settings into the options form.
 * @param {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}} settings
 */
function renderSettings(settings) {
  document.getElementById("enabled").checked = settings.enabled;
  document.getElementById("youtubeEnabled").checked = settings.youtubeEnabled;
  document.getElementById("facebookEnabled").checked = settings.facebookEnabled;
  document.getElementById("delayMs").value = String(settings.delayMs);
  document.getElementById("delayValue").textContent = formatDelayLabel(settings.delayMs);
  document.getElementById("pauseWhenInteracting").checked = settings.pauseWhenInteracting;
}

/**
 * Reads the options form into a settings object.
 * @returns {{enabled: boolean, youtubeEnabled: boolean, facebookEnabled: boolean, delayMs: number, pauseWhenInteracting: boolean}}
 */
function readFormSettings() {
  return {
    enabled: document.getElementById("enabled").checked,
    youtubeEnabled: document.getElementById("youtubeEnabled").checked,
    facebookEnabled: document.getElementById("facebookEnabled").checked,
    delayMs: Number(document.getElementById("delayMs").value),
    pauseWhenInteracting: document.getElementById("pauseWhenInteracting").checked
  };
}

/**
 * Saves the current form values to storage.
 * @returns {Promise<void>}
 */
function saveFormSettings() {
  var settings = readFormSettings();
  document.getElementById("delayValue").textContent = formatDelayLabel(settings.delayMs);
  return setSettings(settings).then(function () {
    return undefined;
  });
}

/**
 * Initializes the options page.
 */
function initOptions() {
  applyOptionsI18n();

  getSettings().then(function (settings) {
    renderSettings(settings);
  }).catch(function (error) {
    console.error("ReelShift: failed to load options settings", error);
  });

  var controlIds = [
    "enabled",
    "youtubeEnabled",
    "facebookEnabled",
    "delayMs",
    "pauseWhenInteracting"
  ];
  var index;

  for (index = 0; index < controlIds.length; index += 1) {
    document.getElementById(controlIds[index]).addEventListener("change", function () {
      saveFormSettings().catch(function (error) {
        console.error("ReelShift: failed to save options settings", error);
      });
    });
  }

  document.getElementById("delayMs").addEventListener("input", function () {
    var delayMs = Number(document.getElementById("delayMs").value);
    document.getElementById("delayValue").textContent = formatDelayLabel(delayMs);
  });
}

document.addEventListener("DOMContentLoaded", initOptions);
