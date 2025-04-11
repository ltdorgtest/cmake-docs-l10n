"use strict";

const _is_file_uri = (uri) => uri.startsWith("file:/");
const _IS_LOCAL = _is_file_uri(window.location.href);
const _CURRENT_LANGUAGE = CURRENT_OPTIONS.CURRENT_LANGUAGE;
const _CURRENT_VERSION = CURRENT_OPTIONS.CURRENT_VERSION;
const _CONFIG_LANGUAGES = CONFIG_OPTIONS.CONFIG_LANGUAGES;
const _CONFIG_VERSIONS = CONFIG_OPTIONS.CONFIG_VERSIONS;
const _CONFIG_PROJECTS = CONFIG_OPTIONS.CONFIG_PROJECTS;
const _FLYOUT_JS_FILE = document.currentScript.src;
const _FLYOUT_JS_DIR = _FLYOUT_JS_FILE.substring(0, _FLYOUT_JS_FILE.lastIndexOf('/'));
const _SERVER_ROOT = window.location.origin;

async function getTargetUrl(type, selectedValue) {
  const currentPath = window.location.pathname;
  let targetPath;

  if (type === "language") {
    targetPath = currentPath.replace(`/${_CURRENT_LANGUAGE}/`, `/${selectedValue}/`);
  } else if (type === "version") {
    targetPath = currentPath.replace(`/${_CURRENT_VERSION}/`, `/${selectedValue}/`);
  }

  const targetUrl = _IS_LOCAL
    ? `file://${targetPath}`
    : `${_SERVER_ROOT}${targetPath}`;

  if (_IS_LOCAL) return targetUrl;

  try {
    const response = await fetch(targetUrl, { method: "HEAD" });
    if (response.ok) return targetUrl;
  } catch (error) {
    console.error("Error checking target URL:", error);
  }

  return `${_FLYOUT_JS_DIR}/` +
         `${type === "language" ? selectedValue : _CURRENT_LANGUAGE}/` +
         `${type === "version" ? selectedValue : _CURRENT_VERSION}/index.html`;
}

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
          <img src="${_FLYOUT_JS_DIR}/ltd-icon.svg" alt="icon">
        </span>
        <span class="ltd-flyout-header-label">
          Language: ${_CURRENT_LANGUAGE} | Version: ${_CURRENT_VERSION}
        </span>
      </span>
      <div class="ltd-flyout-divider closed"></div>
      <div class="ltd-flyout-content closed">
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

  // 點 label → toggle content + all dividers
  label.addEventListener("click", (event) => {
    const isHidden = content.classList.toggle("closed");
    dividers.forEach(div => div.classList.toggle("closed", isHidden));
    event.stopPropagation();
  });

  // 點 icon → toggle label & header，並收起所有內容
  icon.addEventListener("click", (event) => {
    const labelHidden = label.classList.toggle("hidden");
    header.classList.toggle("icon-only", labelHidden);
    if (labelHidden) {
      content.classList.add("closed");
      dividers.forEach(div => div.classList.add("closed"));
    }
    event.stopPropagation();
  });

  // 點擊外部 → 收合內容 + divider（不動 label）
  document.addEventListener("click", (event) => {
    if (!flyout.contains(event.target)) {
      content.classList.add("closed");
      dividers.forEach(div => div.classList.add("closed"));
    }
  });
}

async function updateLinks() {
  const languageLinks = document.querySelectorAll("a[data-language]");
  const versionLinks = document.querySelectorAll("a[data-version]");

  for (const link of languageLinks) {
    const code = link.getAttribute("data-language");
    link.href = await getTargetUrl("language", code);
  }

  for (const link of versionLinks) {
    const code = link.getAttribute("data-version");
    link.href = await getTargetUrl("version", code);
  }
}

function addStyles() {
  const css = `
    .ltd-flyout {
      color: #ffffff;
      background-color: #263238;
      box-shadow: 0 4px 10px #000000;
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 20px;
      position: fixed;
      right: 15px;
      bottom: 20px;
      z-index: 5000;
      padding: 5px;
      border-radius: 5px;
      max-width: 350px;
    }

    .ltd-flyout-header {
      display: flex;
      align-items: center;
      font-weight: bold;
      color: #27ae60;
      background-color: #263238;
      cursor: pointer;
    }

    .ltd-flyout-header.icon-only {
      justify-content: center;
      padding: 0;
    }

    .ltd-flyout-header-icon {
      flex-shrink: 0;
    }

    .ltd-flyout-header-icon img {
      padding: 10px;
      width: 25px;
      height: 25px;
      display: block;
      box-sizing: content-box;
    }

    .ltd-flyout-header-label {
      padding: 10px;
      flex-grow: 1;
      text-align: right;
    }

    .ltd-flyout-header-label.hidden {
      display: none;
    }

    .ltd-flyout-divider {
      height: 1px;
      background-color: #808080;
      margin: 5px 10px;
    }

    .ltd-flyout-divider.closed {
      display: none;
    }

    .ltd-flyout-content {
      background-color: #263238;
      padding: 10px;
      max-height: 450px;
      overflow-y: auto;
    }

    .ltd-flyout-content.closed {
      display: none;
    }

    dl {
      display: flex;
      flex-wrap: wrap;
      margin: 0;
      padding: 0;
    }

    dt {
      width: 100%;
      color: #808080;
      font-weight: bold;
      text-align: left;
      padding: 2px 0;
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
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      justify-content: flex-start;
    }

    dd.options a {
      color: #ffffff;
      background-color: #263238;
      text-decoration: none;
      padding: 5px;
      border-radius: 5px;
      transition: background 0.3s;
    }

    dd.options a:hover {
      color: #ffffff;
      background-color: #27ae60;
    }

    dd.options a.selected {
      color: #ffffff;
      background-color: #27ae60;
      font-weight: bold;
    }
  `;

  const styleTag = document.createElement("style");
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);
}

document.addEventListener("DOMContentLoaded", async () => {
  addStyles();
  createFlyout();
  await updateLinks();
});
