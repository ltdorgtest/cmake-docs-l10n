"use strict";

const _is_file_uri = (uri) => uri.startsWith("file:/");
const _IS_LOCAL = _is_file_uri(window.location.href);
const _CURRENT_LANGUAGE = CURRENT_OPTIONS.CURRENT_LANGUAGE;
const _CURRENT_VERSION = CURRENT_OPTIONS.CURRENT_VERSION;
const _CONFIG_LANGUAGES = CONFIG_OPTIONS.CONFIG_LANGUAGES;
const _CONFIG_VERSIONS = CONFIG_OPTIONS.CONFIG_VERSIONS;
const _CONFIG_PROJECTS = CONFIG_OPTIONS.CONFIG_PROJECTS;
const _FLYOUT_JS_FILE = document.currentScript.src;
const _FLYOUT_JS_DIR = _FLYOUT_JS_FILE.substring(0, _FLYOUT_JS_FILE.lastIndexOf('/') + 1);
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
    <div class="rtd-flyout">
      <span class="rtd-flyout-header">
        <span class="rtd-icon">
          <img src="${_FLYOUT_JS_DIR}/icon.svg" alt="icon">
        </span>
        <span class="rtd-label">
          Language: ${_CURRENT_LANGUAGE} | Version: ${_CURRENT_VERSION}
        </span>
      </span>
      <div class="rtd-divider"></div>
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
  const divider = document.querySelector(".rtd-divider");
  const icon = document.querySelector(".rtd-icon");
  const label = document.querySelector(".rtd-label");

  // 初始化：label 隱藏狀態
  if (localStorage.getItem("rtd-label-hidden") === "true") {
    label.classList.add("hidden-label");
    header.classList.add("icon-only");
  }

  // 初始化：content 是否收合
  if (localStorage.getItem("rtd-flyout-collapsed") === "true") {
    content.classList.add("closed");
    divider.classList.add("closed"); // ✅ 修正：收合時 divider 一起隱藏
  }

  // 點 label：只控制 content + divider
  label.addEventListener("click", (event) => {
    const isHidden = content.classList.toggle("closed");
    divider.classList.toggle("closed", isHidden);
    localStorage.setItem("rtd-flyout-collapsed", isHidden);
    event.stopPropagation();
  });

  // 點 icon：同時控制 label + content + divider
  // icon.addEventListener("click", (event) => {
  //   const isHidden = label.classList.toggle("hidden-label");
  //   header.classList.toggle("icon-only", isHidden);
  //   content.classList.toggle("closed", isHidden);
  //   divider.classList.toggle("closed", isHidden);
  //   localStorage.setItem("rtd-label-hidden", isHidden);
  //   localStorage.setItem("rtd-flyout-collapsed", isHidden);
  //   event.stopPropagation();
  // });
  icon.addEventListener("click", (event) => {
    const labelIsHidden = label.classList.contains("hidden-label");

    if (labelIsHidden) {
      // ✅ 若 label 是收起的，只展開 label，不展開 content
      label.classList.remove("hidden-label");
      header.classList.remove("icon-only");
      localStorage.setItem("rtd-label-hidden", "false");
      // 不動 content 和 divider
    } else {
      // ✅ 否則收回所有（label + content + divider）
      label.classList.add("hidden-label");
      header.classList.add("icon-only");
      content.classList.add("closed");
      divider.classList.add("closed");
      localStorage.setItem("rtd-label-hidden", "true");
      localStorage.setItem("rtd-flyout-collapsed", "true");
    }

    event.stopPropagation();
  });


  // 點外部：收合 content + divider
  document.addEventListener("click", (event) => {
    if (!flyout.contains(event.target)) {
      content.classList.add("closed");
      divider.classList.add("closed");
      localStorage.setItem("rtd-flyout-collapsed", "true");
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
    .rtd-flyout {
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

    .rtd-flyout-header {
      color: #27ae60;
      background-color: #263238;
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: bold;
    }

    .rtd-flyout-header.icon-only {
      justify-content: center;
      padding: 0;
    }

    .rtd-icon {
      flex-shrink: 0;
    }

    .rtd-icon img {
      padding: 10px;  /* xxx */
      width: 25px;
      height: 25px;
      display: block;
    }

    .rtd-label {
      padding: 10px;  /* xxx */
      flex-grow: 1;
      text-align: right;
    }

    .rtd-label.hidden-label {
      display: none;
    }

    .rtd-divider {
      height: 1px;
      background-color: #444;
      margin: 0 10px;
      border: none;
    }

    .rtd-divider.closed {
      display: none;
    }

    .rtd-flyout-content {
      background: #263238;
      padding: 10px;
      max-height: 450px;
      overflow-y: auto;
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
