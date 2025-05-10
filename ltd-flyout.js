"use strict";

const _is_file_uri = (uri) => uri.startsWith("file:/");
const _IS_LOCAL = _is_file_uri(window.location.href);
const _CURRENT_LANGUAGE = CURRENT_OPTIONS.CURRENT_LANGUAGE;   /* Get from current.js */
const _CURRENT_VERSION = CURRENT_OPTIONS.CURRENT_VERSION;     /* Get from current.js */
const _CONFIG_LANGUAGES = CONFIG_OPTIONS.CONFIG_LANGUAGES;    /* Get from config.js */
const _CONFIG_VERSIONS = CONFIG_OPTIONS.CONFIG_VERSIONS;      /* Get from config.js */
const _CONFIG_PROJECTS = CONFIG_OPTIONS.CONFIG_PROJECTS;      /* Get from config.js */
const _FLYOUT_JS_FILE = document.currentScript.src;
const _FLYOUT_JS_DIR = _FLYOUT_JS_FILE.substring(0, _FLYOUT_JS_FILE.lastIndexOf('/'));
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
  const currentPath = window.location.pathname;
  let targetPath;

  /* Determine the target path based on the type (language or version). */
  if (type === "language") {
    targetPath = currentPath.replace(`/${_CURRENT_LANGUAGE}/`, `/${selectedValue}/`);
  } else if (type === "version") {
    targetPath = currentPath.replace(`/${_CURRENT_VERSION}/`, `/${selectedValue}/`);
  }

  /* If running locally (file:// protocol), use file-based path. Otherwise, use the server root URL. */
  const targetUrl = _IS_LOCAL
    ? `file://${targetPath}`
    : `${_SERVER_ROOT}${targetPath}`;

  /* If running locally, return the constructed file URL immediately. */
  if (_IS_LOCAL) return targetUrl;

  try {
    /* Send a HEAD request to check if the target URL exists. */
    const response = await fetch(targetUrl, { method: "HEAD" });
    /* If the response is OK (status 200), return the valid target URL. */
    if (response.ok) {
      return targetUrl;
    } else {
      console.warn("Target URL does not exist, using fallback URL:", targetUrl);
    }
  } catch (error) {
    /* Log any network or request errors. */
    console.error("Error checking target URL:", error);
  }

  /** If the target URL is not accessible, return a fallback URL.
      The fallback URL ensures the correct language and version are used. */
  return `${_FLYOUT_JS_DIR}/` +
         `${type === "language" ? selectedValue : _CURRENT_LANGUAGE}/` +
         `${type === "version" ? selectedValue : _CURRENT_VERSION}/index.html`;
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
    return code === "newline"
      ? `<dd class="newline"></dd>`
      : `<dd class="options"><a href="#" title="${name}" class="${code === _CURRENT_LANGUAGE ? "selected" : ""}" data-language="${code}">${code}</a></dd>`;
  }).join("");

  const sortedVersions = _CONFIG_VERSIONS.map(([code, name]) => {
    return code === "newline"
      ? `<dd class="newline"></dd>`
      : `<dd class="options"><a href="#" title="${name}" class="${code === _CURRENT_VERSION ? "selected" : ""}" data-version="${code}">${code}</a></dd>`;
  }).join("");

  const sortedProjects = _CONFIG_PROJECTS.map(([project, link]) => {
    return project === "newline"
      ? `<dd class="newline"></dd>`
      : `<dd class="options"><a href="${link}">${project}</a></dd>`;
  }).join("");

  const flyoutHTML = `
    <div class="ltd-flyout">
      <span class="ltd-flyout-header">
        <span class="ltd-flyout-header-icon">
          <img class="ltd-flyout-header-icon-img" src="${_FLYOUT_JS_DIR}/ltd-icon.svg" alt="icon">
        </span>
        <span class="ltd-flyout-header-label">
          Language: ${_CURRENT_LANGUAGE} | Version: ${_CURRENT_VERSION}
        </span>
      </span>
      <div class="ltd-flyout-divider ltd-flyout-closed"></div>
      <div class="ltd-flyout-content ltd-flyout-closed">
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

  const flyout = document.querySelector(".ltd-flyout");
  const header = document.querySelector(".ltd-flyout-header");
  const icon = document.querySelector(".ltd-flyout-header-icon");
  const label = document.querySelector(".ltd-flyout-header-label");
  const dividers = document.querySelectorAll(".ltd-flyout-divider");
  const content = document.querySelector(".ltd-flyout-content");

  // Clicking the label toggles content and dividers
  label.addEventListener("click", (event) => {
    const isHidden = content.classList.toggle("ltd-flyout-closed");
    dividers.forEach(div => div.classList.toggle("ltd-flyout-closed", isHidden));
    event.stopPropagation();
  });

  // Clicking the icon toggles label visibility and resets all sections
  icon.addEventListener("click", (event) => {
    const labelHidden = label.classList.toggle("hidden");
    header.classList.toggle("ltd-icon-only", labelHidden);
    if (labelHidden) {
      content.classList.add("ltd-flyout-closed");
      dividers.forEach(div => div.classList.add("ltd-flyout-closed"));
    }
    event.stopPropagation();
  });

  // Clicking outside closes the content and dividers (label stays visible)
  document.addEventListener("click", (event) => {
    if (!flyout.contains(event.target)) {
      content.classList.add("ltd-flyout-closed");
      dividers.forEach(div => div.classList.add("ltd-flyout-closed"));
    }
  });
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

  /* Update language selection links with the correct URLs. */
  for (const link of languageLinks) {
    const code = link.getAttribute("data-language");
    link.href = await getTargetUrl("language", code);
  }

  /* Update version selection links with the correct URLs. */
  for (const link of versionLinks) {
    const code = link.getAttribute("data-version");
    link.href = await getTargetUrl("version", code);
  }
}

/**
 * Injects CSS styles for the floating language and version selector.
 *
 * This function creates a <style> element and appends it to the document head, defining
 * styles for the flyout menu, including its appearance, behavior, and interaction effects.
 */
function addStyles() {
  const css = `
    .ltd-flyout {
      color: #ffffff;             /* Color: Text color */
      background-color: #263238;  /* Color: Background color */
      box-shadow: 0 4px 10px #000000;
      font-family: Arial, sans-serif;
      font-size: 15px;
      line-height: 20px;
      position: fixed;      /* Position: Stays in place on the screen */
      right: 15px;          /* Position: 15px from the right edge */
      bottom: 30px;         /* Position: 30px from the bottom edge */
      z-index: 5000;        /* Position: Ensure flyout appears above other elements */
      padding: 5px;         /* Style: Inner padding */
      border-radius: 5px;   /* Style: Rounded corners */
      max-width: 350px;     /* Style: Maximum width of 400px */
    }

    .ltd-flyout-header {
      color: #27ae60;             /* Color: Text color */
      background-color: #263238;  /* Color: Background color */
      display: flex;
      padding: 5px;
      align-items: center;
      font-weight: bold;
      cursor: pointer;
    }

    .ltd-flyout-header.ltd-icon-only {
      justify-content: center;
      padding: 5px;
    }

    .ltd-flyout-header-icon {
      flex-shrink: 0;
    }

    .ltd-flyout-header-icon-img {
      width: 25px;
      height: 25px;
      padding: 5px;
      display: block;
      box-sizing: content-box;
    }

    .ltd-flyout-header-label {
      padding: 5px;
      flex-grow: 1;
      text-align: right;
    }

    .ltd-flyout-header-label.hidden {
      display: none;
    }

    .ltd-flyout-divider {
      background-color: #808080;
      height: 1px;
      margin: 1px 5px;
    }

    .ltd-flyout-divider.ltd-flyout-closed {
      display: none;
    }

    .ltd-flyout-content {
      color: #ffffff;             /* Color: Text color */
      background-color: #263238;  /* Color: Background color */
      padding: 10px;              /* Style: Inner spacing */
      max-height: 450px;          /* Style: Max height before scrolling */
      overflow-y: auto;           /* Style: Enable vertical scrollbar if needed */
    }

    .ltd-flyout-content.ltd-flyout-closed {
      display: none;
    }

    .ltd-flyout-content dl {
      display: flex;
      flex-wrap: wrap;
      margin: 0;
      padding: 0;
    }

    .ltd-flyout-content dt {
      color: #808080;
      width: 100%;
      font-weight: bold;
      text-align: left;
      padding: 0;
    }

    .ltd-flyout-content dd {
      margin: 0;
      padding: 0;
    }

    .ltd-flyout-content dd.newline {
      flex-basis: 100%;
      height: 0;
    }

    .ltd-flyout-content dd.options {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      justify-content: flex-start;
    }

    .ltd-flyout-content dd.options a {
      color: #ffffff;             /* Color: Text color */
      background-color: #263238;  /* Color: Background color */
      text-decoration: none;
      padding: 5px;
      border-radius: 5px;
      transition: background 0.3s;
    }

    .ltd-flyout-content dd.options a:hover {
      color: #ffffff;             /* Color: Text color */
      background-color: #27ae60;  /* Color: Background color */
    }

    .ltd-flyout-content dd.options a.selected {
      color: #ffffff;             /* Color: Text color */
      background-color: #27ae60;  /* Color: Background color */
      font-weight: bold;
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
  addStyles();          /* Apply CSS styles for the flyout menu. */
  createFlyout();       /* Generate the language and version selector. */
  await updateLinks();  /* Update all <a> hrefs to reflect the correct URLs. */
});
