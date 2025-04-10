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
    if (response.ok) {
      return targetUrl;
    } else {
      console.warn("Target URL does not exist, using fallback URL:", targetUrl);
    }
  } catch (error) {
    console.error("Error checking target URL:", error);
  }

  return `${_FLYOUT_JS_DIR}/` +
    `${type === "language" ? selectedValue : _CURRENT_LANGUAGE}/` +
    `${type === "version" ? selectedValue : _CURRENT_VERSION}/` +
    `index.html`;
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
        <span class="ltd-flyout-icon">
          <img src="${_FLYOUT_JS_DIR}/ltd-icon.svg" alt="icon">
        </span>
        <span class="ltd-flyout-label">
          Language: ${_CURRENT_LANGUAGE} | Version: ${_CURRENT_VERSION}
        </span>
      </span>
      <div class="ltd-flyout-divider"></div>
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
  const content = document.querySelector(".ltd-flyout-content");
  const divider = document.querySelector(".ltd-flyout-divider");
  const icon = document.querySelector(".ltd-flyout-icon");
  const label = document.querySelector(".ltd-flyout-label");

  // 初始化：label 隱藏狀態
  if (localStorage.getItem("ltd-flyout-label-hidden") === "true") {
    label.classList.add("hidden-label");
    header.classList.add("icon-only");
  }

  // 初始化：content 是否收合
  if (localStorage.getItem("ltd-flyout-collapsed") === "true") {
    content.classList.add("closed");
    divider.classList.add("closed"); // ✅ 修正：收合時 divider 一起隱藏
  }

  // 點 label：只控制 content + divider
  label.addEventListener("click", (event) => {
    const isHidden = content.classList.toggle("closed");
    divider.classList.toggle("closed", isHidden);
    localStorage.setItem("ltd-flyout-collapsed", isHidden);
    event.stopPropagation();
  });

  // Click icon：同時控制 label + content + divider
  icon.addEventListener("click", (event) => {
    const labelIsHidden = label.classList.contains("hidden-label");

    if (labelIsHidden) {
      // ✅ 若 label 是收起的，只展開 label，不展開 content
      label.classList.remove("hidden-label");
      header.classList.remove("icon-only");
      localStorage.setItem("ltd-flyout-label-hidden", "false");
      // 不動 content 和 divider
    } else {
      // ✅ 否則收回所有（label + content + divider）
      label.classList.add("hidden-label");
      header.classList.add("icon-only");
      content.classList.add("closed");
      divider.classList.add("closed");
      localStorage.setItem("ltd-flyout-label-hidden", "true");
      localStorage.setItem("ltd-flyout-collapsed", "true");
    }

    event.stopPropagation();
  });


  // 點外部：收合 content + divider
  document.addEventListener("click", (event) => {
    if (!flyout.contains(event.target)) {
      content.classList.add("closed");
      divider.classList.add("closed");
      localStorage.setItem("ltd-flyout-collapsed", "true");
    }
  });
}

async function updateLinks() {
  const languageLinks = document.querySelectorAll("a[data-language]");
  const versionLinks = document.querySelectorAll("a[data-version]");

  for (const link of languageLinks) {
    const langCode = link.getAttribute("data-language");
    link.href = await getTargetUrl("language", langCode);
  }

  for (const link of versionLinks) {
    const versionCode = link.getAttribute("data-version");
    link.href = await getTargetUrl("version", versionCode);
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
      right: 20px;
      bottom: 40px;
      z-index: 5000;
      padding: 5px;
      border-radius: 5px;
      width: auto;
      max-width: 350px;
    }

    .ltd-flyout-header {
      color: #27ae60;
      background-color: #263238;
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: bold;
    }

    .ltd-flyout-header.icon-only {
      justify-content: center;
      padding: 0;
    }

    .ltd-flyout-icon {
      flex-shrink: 0;
    }

    .ltd-flyout-icon img {
      padding: 10px;  /* xxx */
      width: 25px;
      height: 25px;
      display: block;
    }

    .ltd-flyout-label {
      padding: 10px;  /* xxx */
      flex-grow: 1;
      text-align: right;
    }

    .ltd-flyout-label.hidden-label {
      display: none;
    }

    .ltd-flyout-divider {
      height: 1px;
      background-color: #808080;
      margin: 0 10px;
      border: none;
    }

    .ltd-flyout-divider.closed {
      display: none;
    }

    .ltd-flyout-content {
      background: #263238;
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
      align-items: flex-start;
      margin: 0;
      padding: 0;
    }

    dt {
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

document.addEventListener("DOMContentLoaded", async () => {
  addStyles();
  createFlyout();
  await updateLinks();
});
