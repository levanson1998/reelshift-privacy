/**
 * ReelShift popup page script.
 * Binds UI controls to chrome.storage.local settings.
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
 * Applies localized strings to static labels in the popup.
 */
function applyPopupI18n() {
  document.getElementById("title").textContent = getMessage("popupTitle");
  document.getElementById("labelMaster").textContent = getMessage("labelMaster");
  document.getElementById("labelYouTube").textContent = getMessage("labelYouTube");
  document.getElementById("labelFacebook").textContent = getMessage("labelFacebook");
  document.getElementById("labelDelay").textContent = getMessage("labelDelay");
  document.getElementById("labelPauseInteracting").textContent = getMessage("labelPauseInteracting");
  document.getElementById("statusLocal").textContent = getMessage("statusLocal");
  document.getElementById("saveNotice").textContent = getMessage("saveNotice");
  document.getElementById("openOptions").textContent = getMessage("linkOptions");
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
 * Writes the current control values into the settings form.
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
 * Reads the settings form into an object.
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
 * Opens the options page from the popup link.
 * @param {MouseEvent} event
 */
function onOpenOptionsClick(event) {
  event.preventDefault();
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
}

/**
 * Initializes the popup page.
 */
function initPopup() {
  applyPopupI18n();

  getSettings().then(function (settings) {
    renderSettings(settings);
  }).catch(function (error) {
    console.error("ReelShift: failed to load popup settings", error);
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
        console.error("ReelShift: failed to save popup settings", error);
      });
    });
  }

  document.getElementById("delayMs").addEventListener("input", function () {
    var delayMs = Number(document.getElementById("delayMs").value);
    document.getElementById("delayValue").textContent = formatDelayLabel(delayMs);
  });

  document.getElementById("openOptions").addEventListener("click", onOpenOptionsClick);
}

document.addEventListener("DOMContentLoaded", initPopup);
