/**
 * Next-video action helpers for ReelShift.
 * Tries a semantic next control first, then falls back to ArrowDown.
 */

/**
 * Returns true when a label string matches any of the provided hints.
 * Matching is case-insensitive and checks whether the label contains the hint.
 * @param {string} label
 * @param {Array<string>} labelHints
 * @returns {boolean}
 */
function labelMatchesHints(label, labelHints) {
  if (!label || !labelHints || labelHints.length === 0) {
    return false;
  }

  var normalized = String(label).toLowerCase().trim();
  var index;

  for (index = 0; index < labelHints.length; index += 1) {
    var hint = String(labelHints[index] || "").toLowerCase().trim();
    if (!hint) {
      continue;
    }
    if (normalized.indexOf(hint) !== -1) {
      return true;
    }
  }

  return false;
}

/**
 * Attempts to click a next button or link inside the given root.
 * @param {ParentNode} root Document or element to search within.
 * @param {Array<string>} labelHints Aria-label / title fragments that mean "next".
 * @returns {boolean} True when a control was clicked.
 */
function clickNextButton(root, labelHints) {
  if (!root || !root.querySelectorAll) {
    return false;
  }

  var candidates = root.querySelectorAll("button, a, [role='button']");
  var index;

  for (index = 0; index < candidates.length; index += 1) {
    var element = candidates[index];
    var ariaLabel = element.getAttribute("aria-label") || "";
    var title = element.getAttribute("title") || "";
    var text = element.textContent || "";

    if (
      labelMatchesHints(ariaLabel, labelHints) ||
      labelMatchesHints(title, labelHints) ||
      labelMatchesHints(text, labelHints)
    ) {
      try {
        element.click();
        return true;
      } catch (error) {
        // Continue searching other candidates when a click fails.
      }
    }
  }

  return false;
}

/**
 * Dispatches ArrowDown keydown and keyup events on the document.
 * Host players often treat ArrowDown as "next short / next reel".
 * @returns {boolean} Always true after dispatch attempts complete.
 */
function pressArrowDown() {
  var keydownEvent = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    code: "ArrowDown",
    keyCode: 40,
    which: 40,
    bubbles: true,
    cancelable: true
  });

  var keyupEvent = new KeyboardEvent("keyup", {
    key: "ArrowDown",
    code: "ArrowDown",
    keyCode: 40,
    which: 40,
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(keydownEvent);
  document.dispatchEvent(keyupEvent);
  return true;
}

/**
 * Goes to the next video using label hints first, then ArrowDown.
 * @param {ParentNode} root
 * @param {Array<string>} labelHints
 * @returns {string} "click" when a button was used, otherwise "arrow".
 */
function goToNextVideo(root, labelHints) {
  var clicked = false;

  try {
    clicked = clickNextButton(root, labelHints);
  } catch (error) {
    clicked = false;
  }

  if (clicked) {
    return "click";
  }

  pressArrowDown();
  return "arrow";
}
