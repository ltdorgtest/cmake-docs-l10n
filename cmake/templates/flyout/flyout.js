"use strict";

////////////////////////////////////////////////////////////////////////////////
// Application Logic - Do not modify unless necessary.
////////////////////////////////////////////////////////////////////////////////

const _is_file_uri = (uri) => uri.startsWith("file:/");
const _IS_LOCAL = _is_file_uri(window.location.href);
const _CURRENT_LANGUAGE = CURRENT_OPTIONS.CURRENT_LANGUAGE;   /* Get from current.js */
const _CURRENT_VERSION = CURRENT_OPTIONS.CURRENT_VERSION;     /* Get from current.js */
const _CONFIG_LANGUAGES = CONFIG_OPTIONS.CONFIG_LANGUAGES;    /* Get from config.js */
const _CONFIG_VERSIONS = CONFIG_OPTIONS.CONFIG_VERSIONS;      /* Get from config.js */
const _CONFIG_PROJECTS = CONFIG_OPTIONS.CONFIG_PROJECTS;      /* Get from config.js */
const _FLYOUT_JS_FILE = document.currentScript.src;
const _FLYOUT_JS_DIR = _FLYOUT_JS_FILE.substring(0, _FLYOUT_JS_FILE.lastIndexOf('/') + 1);
const _SERVER_ROOT = window.location.origin;

/**
 * Generates a target URL based on the selected language or version.
 *
 * This function modifies the current page path to reflect the requested language
 * or version and then verifies if the generated URL exists. If the URL is not
 * accessible, it returns a fallback URL to ensure a valid navigation path.
 *
 * @param {string} type - The type of change ('language' or 'version').
 * @param {string} selectedValue - The selected language code or version number.
 * @returns {Promise<string>} The generated target URL or a fallback URL if inaccessible.
 */
async function getTargetUrl(type, selectedValue) {
  // Get the current page path.
  const currentPath = window.location.pathname;
  let   targetPath;

  // Determine the target path based on the type (language or version).
  if (type === "language") {
    targetPath = currentPath.replace(`/${_CURRENT_LANGUAGE}/`, `/${selectedValue}/`);
  } else if (type === "version") {
    targetPath = currentPath.replace(`/${_CURRENT_VERSION}/`, `/${selectedValue}/`);
  }

  // Construct the target URL.
  // If running locally (file:// protocol), use file-based path. Otherwise, use the server root URL.
  const targetUrl = _IS_LOCAL
    ? `file://${targetPath}`
    : `${_SERVER_ROOT}${targetPath}`;

  // If running locally, return the constructed file URL immediately.
  if (_IS_LOCAL) return targetUrl;

  try {
    // Send a HEAD request to check if the target URL exists.
    const response = await fetch(targetUrl, { method: "HEAD" });

    // If the response is OK (status 200), return the valid target URL.
    if (response.ok) {
      return targetUrl;
    } else {
      console.warn("Target URL does not exist, using fallback URL:", targetUrl);
    }
  } catch (error) {
    // Log any network or request errors.
    console.error("Error checking target URL:", error);
  }

  // If the target URL is not accessible, return a fallback URL.
  // The fallback URL ensures the correct language and version are used.
  return `${_FLYOUT_JS_DIR}/` +
    `${type === "language" ? selectedValue : _CURRENT_LANGUAGE}/` +
    `${type === "version" ? selectedValue : _CURRENT_VERSION}/` +
    `index.html`;
}

/**
 * Creates and inserts a floating language and version selector into the page.
 *
 * This function dynamically generates an interactive flyout menu containing
 * selectable language options, version links, and project links. It also
 * manages the visibility state of the flyout using event listeners.
 */
function createFlyout() {
  const sortedLanguages = _CONFIG_LANGUAGES.map(([code, name]) => {
    if (code === "newline") {
      return `<dd class="newline"></dd>`;
    } else {
      return `
        <dd class="options">
          <a href="#"
            title="${name}"
            class="${code === _CURRENT_LANGUAGE ? "selected" : ""}"
            data-language="${code}">
            ${code}
          </a>
        </dd>
      `;
    }
  }).join("");

  const sortedVersions = _CONFIG_VERSIONS.map(([code, name]) => {
    if (code === "newline") {
      return `<dd class="newline"></dd>`;
    } else {
      return `
        <dd class="options">
          <a href="#"
            title="${name}"
            class="${code === _CURRENT_VERSION ? "selected" : ""}"
            data-version="${code}">
            ${code}
          </a>
        </dd>
      `;
    }
  }).join("");

  const sortedProjects = _CONFIG_PROJECTS.map(([project, link]) => {
    if (project === "newline") {
      return `<dd class="newline"></dd>`;
    } else {
      return `<dd class="options"><a href="${link}">${project}</a></dd>`;
    }
  }).join("");

  const flyoutHTML = `
    <div class="rtd-flyout">
      <span class="rtd-flyout-header">
        Language: ${_CURRENT_LANGUAGE} | Version: ${_CURRENT_VERSION}
      </span>
      <div class="rtd-flyout-content closed">
        <dl>
          <dt>Languages</dt>
          ${sortedLanguages}
        </dl>
        <dl>
          <dt>Versions</dt>
          ${sortedVersions}
        </dl>
        <dl>
          <dt>Project Links</dt>
          ${sortedProjects}
        </dl>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", flyoutHTML);

  const flyout = document.querySelector(".rtd-flyout");
  const header = document.querySelector(".rtd-flyout-header");
  const content = document.querySelector(".rtd-flyout-content");

  content.classList.add("closed");

  function toggleFlyout(event) {
    const isHidden = content.classList.contains("closed");
    content.classList.toggle("closed", !isHidden);
    localStorage.setItem("rtd-flyout-collapsed", !isHidden);
    event.stopPropagation();
  }

  function closeFlyout(event) {
    if (!flyout.contains(event.target)) {
      content.classList.add("closed");
      localStorage.setItem("rtd-flyout-collapsed", "true");
    }
  }

  header.addEventListener("click", toggleFlyout);
  document.addEventListener("click", closeFlyout);
}

/**
 * Updates all language and version links after the page loads.
 *
 * This function selects all <a> elements containing language or version data attributes,
 * generates the appropriate URLs using `getTargetUrl`, and updates their `href` attributes.
 */
async function updateLinks() {
  const languageLinks = document.querySelectorAll("a[data-language]");
  const versionLinks = document.querySelectorAll("a[data-version]");

  // Update language selection links with the correct URLs.
  for (const link of languageLinks) {
    const langCode = link.getAttribute("data-language");
    link.href = await getTargetUrl("language", langCode);
  }

  // Update version selection links with the correct URLs.
  for (const link of versionLinks) {
    const versionCode = link.getAttribute("data-version");
    link.href = await getTargetUrl("version", versionCode);
  }
}

/**
 * Injects CSS styles for the floating language and version selector.
 *
 * This function creates a <style> element and appends it to the document head,
 * defining styles for the flyout menu, including its appearance, behavior,
 * and interaction effects.
 */
function addStyles() {
  const css = `
    .rtd-flyout {
      color: #ffffff;                 /* Color: */
      background-color: #263238;      /* Color: */
      box-shadow: 0 4px 10px #000000; /* Color: */
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 20px;
      position: fixed;      /* Position: Stays in place on the screen */
      right: 20px;          /* Position: 20px from the right edge */
      bottom: 40px;         /* Position: 40px from the bottom edge */
      z-index: 5000;        /* Position: Ensure flyout appears above other elements */
      padding: 5px;         /* Spacing: Inner padding */
      border-radius: 5px;   /* Style: Rounded corners */
      width: auto;          /* Size: Auto width based on content */
      min-width: 200px;     /* Size: Minimum width of 200px */
      max-width: 350px;     /* Size: Maximum width of 350px */
    }

    .rtd-flyout-header {
      color: #27ae60;
      background-color: #263238;
      position: relative;   /* Position: For absolutely positioned children */
      display: block;
      padding: 10px;        /* Spacing: Inner padding */
      cursor: pointer;
      text-align: right;    /* Text: Align text to the right */
      font-weight: bold;    /* Text: Bold font */
    }

    .rtd-flyout-header .fa-caret-down {
      color: #27ae60;
      background-color: #263238;
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
    }

    .rtd-flyout-content {
      background: #263238;
      padding: 10px;        /* Spacing: Inner padding */
      max-height: 450px;    /* Size: Max height before scrolling */
      overflow-y: auto;     /* Scroll: Enable vertical scrollbar if needed */
    }

    .rtd-flyout-content.closed {
      display: none;
    }

    dl {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      margin: 0;
      padding: 0;
    }

    dt {
      // font-size: 1.0rem;
      color: #808080;
      width: 100%;
      font-weight: bold;
      text-align: left;
      padding: 2px 0px;
    }

    dd {
      margin: 0;
      padding: 0;
    }

    dd.newline {
      flex-basis: 100%;
      height: 0;
    }

    dd.options {
      margin: 0 !important;
      padding: 0 !important;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      justify-content: flex-start;
    }

    dd.options a {
      color: #ffffff;
      background-color: #263238;
      text-decoration: none;
      padding: 5px 5px;
      display: inline-block;
      border-radius: 3px;
      transition: background 0.3s;
      // font-size: 1.0rem;
    }

    dd.options a:hover {
      background-color: #27ae60;
    }

    dd.options a.selected {
      background-color: #27ae60;
      font-weight: bold;
      color: white;
    }
  `;

  const styleTag = document.createElement("style");
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);
}

/**
 * Initializes the flyout menu and updates links when the page loads.
 *
 * This event listener waits for the DOM to be fully loaded before:
 * - Injecting the necessary CSS styles.
 * - Creating the floating language and version selector.
 * - Updating all language and version links with the correct URLs.
 */
document.addEventListener("DOMContentLoaded", async () => {
  addStyles();          // Apply CSS styles for the flyout menu.
  createFlyout();       // Generate the language and version selector.
  await updateLinks();  // Update all <a> hrefs to reflect the correct URLs.
});
