// ==UserScript==
// @name         Ci-en Comment Mute
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  特定ユーザーのコメントを非表示にする
// @updateURL   https://github.com/riyonasan/ci-en-mute/raw/main/cien-comment-mute.user.js
// @downloadURL https://github.com/riyonasan/ci-en-mute/raw/main/cien-comment-mute.user.js
// @match        https://ci-en.dlsite.com/creator/*/article/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/js/all.min.js
// ==/UserScript==

(function () {
  "use strict";
  const mutedUsers = new Set(GM_listValues().map(k => GM_getValue(k)));
  let showMuted = false; // 再表示状態
  function getMutedUsers() {
    return GM_listValues()
      .filter((k) => k.startsWith("mute_"))
      .map((k) => GM_getValue(k));
  }

  function muteUser(userId) {
    GM_setValue("mute_" + userId, userId);
  }

  function unmuteUser(userId) {
    GM_deleteValue("mute_" + userId);
  }

  function processComment(li) {
    if (li.dataset.muteProcessed) return;
    li.dataset.muteProcessed = "1";

    const userLink = li.querySelector("a[href*='/profile/']");
    if (!userLink) return;

    const match = userLink.href.match(/\/profile\/(\d+)/);
    if (!match) return;

    const userId = match[1];
    const mutedUsers = new Set(getMutedUsers());
    // ミュート済みなら非表示
    if (mutedUsers.has(userId)) {
      li.dataset.muted = "1";
      li.style.display = "none";
    }

    const btn = document.createElement("button");
    btn.innerHTML = '<i class="fa-solid fa-ban"></i>';
    btn.style.marginLeft = "8px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.cursor = "pointer";
    btn.title = "ミュート";

    btn.onclick = () => {
      muteUser(userId);
      li.dataset.muted = "1";
      if (!showMuted) li.style.display = "none";
      refreshPanel();
    };

    userLink.insertAdjacentElement("afterend", btn);
  }

  function scanComments() {
    const commentList = document.querySelector(
      "#comment > div:nth-child(3) > div > ul"
    );
    if (!commentList) return;
    commentList.querySelectorAll("li").forEach(processComment);
  }
  function toggleMuted() {
    showMuted = !showMuted;
    const btn = document.getElementById("toggle-muted-btn");
    btn.textContent = showMuted ? "ミュート再非表示" : "ミュート再表示";

    document.querySelectorAll("li[data-muted='1']").forEach(li => {
      li.style.display = showMuted ? "" : "none";
    });
  }

  // トグルボタンをページ上部に追加
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toggle-muted-btn";
  toggleBtn.textContent = "ミュート再表示";
  toggleBtn.style.marginBottom = "8px";
  toggleBtn.style.position = "fixed";
  toggleBtn.style.bottom = "50px";
  toggleBtn.style.right = "10px";
  toggleBtn.style.zIndex = "9999";
  toggleBtn.style.background = "#fff";
  toggleBtn.style.border = "1px solid #ccc";
  toggleBtn.style.padding = "5px 10px";
  toggleBtn.style.cursor = "pointer";
  toggleBtn.onclick = toggleMuted;
  document.body.prepend(toggleBtn);

  // パネル作成（トグル仕様）
  function createPanel() {
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = "ミュート管理";
    toggleBtn.style.position = "fixed";
    toggleBtn.style.bottom = "10px";
    toggleBtn.style.right = "10px";
    toggleBtn.style.zIndex = "9999";
    toggleBtn.style.background = "#fff";
    toggleBtn.style.border = "1px solid #ccc";
    toggleBtn.style.padding = "5px 10px";
    toggleBtn.style.cursor = "pointer";

    const panel = document.createElement("div");
    panel.id = "mutePanel";
    panel.style.position = "fixed";
    panel.style.bottom = "40px";
    panel.style.right = "10px";
    panel.style.zIndex = "9999";
    panel.style.background = "white";
    panel.style.border = "1px solid #ccc";
    panel.style.padding = "10px";
    panel.style.fontSize = "12px";
    panel.style.maxHeight = "200px";
    panel.style.overflowY = "auto";
    panel.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    panel.style.display = "none"; // 初期は非表示

    const title = document.createElement("div");
    title.textContent = "ミュート管理";
    title.style.fontWeight = "bold";
    title.style.marginBottom = "5px";
    panel.appendChild(title);

    const list = document.createElement("div");
    list.id = "muteList";
    panel.appendChild(list);

    toggleBtn.onclick = () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
      if (panel.style.display === "block") refreshPanel();
    };

    document.body.appendChild(toggleBtn);
    document.body.appendChild(panel);
  }

  function refreshPanel() {
    const list = document.getElementById("muteList");
    if (!list) return;
    list.innerHTML = "";

    const muted = getMutedUsers();
    if (muted.length === 0) {
      list.textContent = "ミュート中のユーザーはいません";
      return;
    }

    muted.forEach((uid) => {
      const container = document.createElement("div");

      const link = document.createElement("a");
      link.href = `https://ci-en.dlsite.com/profile/${uid}`;
      link.textContent = `ユーザーID ${uid}`;
      link.target = "_blank";
      link.style.marginRight = "6px";

      const btn = document.createElement("button");
      btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
      btn.title = "アンミュート";
      btn.style.border = "none";
      btn.style.background = "transparent";
      btn.style.cursor = "pointer";

      btn.onclick = () => {
        unmuteUser(uid);
        refreshPanel();
        scanComments();
      };

      container.appendChild(link);
      container.appendChild(btn);
      list.appendChild(container);
    });
  }

  scanComments();
  createPanel();

  const observer = new MutationObserver(() => {
    scanComments();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
