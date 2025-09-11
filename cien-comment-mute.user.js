// ==UserScript==
// @name         Ci-en Comment Mute
// @namespace    http://tampermonkey.net/
// @version      1.1
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

  let cachedMuted = new Set();
  let showMuted = false;

  function getMutedUsers() {
    return GM_listValues().filter(k => k.startsWith("mute_")).map(k => GM_getValue(k));
  }
  function updateCache() { cachedMuted = new Set(getMutedUsers()); }

  function muteUser(id) { GM_setValue("mute_" + id, id); updateCache(); }
  function unmuteUser(id) { GM_deleteValue("mute_" + id); updateCache(); }

  // コメント処理
  function processComment(li) {
    if (li.dataset.muteProcessed) return;
    li.dataset.muteProcessed = "1";

    const userLink = li.querySelector("a[href*='/profile/']");
    if (!userLink) return;
    const match = userLink.href.match(/\/profile\/(\d+)/);
    if (!match) return;
    const userId = match[1];
    li.dataset.userid = userId;

    // ミュート済みなら非表示
    if (cachedMuted.has(userId)) {
      li.dataset.muted = "1";
      if (!showMuted) li.style.display = "none";
    }

    // ミュートボタン追加
    attachMuteBtnToLi(li, userId, userLink);
  }

  function scanComments() {
    const commentList = document.querySelector("#comment > div:nth-child(3) > div > ul");
    if (!commentList) return;
    commentList.querySelectorAll("li").forEach(processComment);
  }

  function attachMuteBtnToLi(li, userId, userLink) {
    if (li.querySelector(".ci-mute-btn")) return;
    const btn = document.createElement("button");
    btn.className = "ci-mute-btn";
    btn.dataset.userid = userId;
    btn.title = "ミュート";
    btn.style.marginLeft = "6px";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.cursor = "pointer";
    btn.innerHTML = '<i class="fa-solid fa-ban"></i>';
    btn.onclick = () => {
      muteUser(userId);
      li.dataset.muted = "1";
      if (!showMuted) li.style.display = "none";
      renderPanel();
    };
    userLink.insertAdjacentElement("afterend", btn);
  }

  // ウィジェット作成
  function buildWidget() {
    if (document.getElementById("ciMuteWidget")) return;
    const w = document.createElement("div");
    w.id = "ciMuteWidget";
    w.style.position = "fixed";
    w.style.bottom = "10px";
    w.style.right = "10px";
    w.style.zIndex = "9999";
    w.style.fontSize = "13px";
    w.style.background = "#fff";
    w.style.border = "1px solid #ccc";
    w.style.padding = "6px";
    w.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    w.innerHTML = `
      <div id="ciWidgetHeader" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <button id="ci-toggle-muted" class="ci-btn">ミュート再表示</button>
        <button id="ci-open-panel" class="ci-btn">管理</button>
      </div>
      <div id="ci-panel" style="display:none;max-height:220px;overflow:auto;"></div>
    `;
    document.body.appendChild(w);
  }

  // パネル描画
  function renderPanel() {
    const panel = document.getElementById("ci-panel");
    if (!panel) return;
    panel.innerHTML = "";

    const arr = Array.from(cachedMuted);
    if (arr.length === 0) {
      panel.textContent = "ミュート中のユーザーはいません";
      return;
    }
    arr.forEach(uid => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.marginBottom = "6px";

      const link = document.createElement("a");
      link.href = `https://ci-en.dlsite.com/profile/${uid}`;
      link.textContent = `ユーザー ${uid}`;
      link.target = "_blank";

      const btn = document.createElement("button");
      btn.className = "ci-unmute-btn";
      btn.dataset.userid = uid;
      btn.title = "アンミュート";
      btn.textContent = "解除";
      btn.style.marginLeft = "8px";

      btn.onclick = () => {
        unmuteUser(uid);
        renderPanel();
        // コメント再スキャン
        scanComments();
      };

      row.appendChild(link);
      row.appendChild(btn);
      panel.appendChild(row);
    });
  }

  function toggleMutedView() {
    showMuted = !showMuted;
    const t = document.getElementById("ci-toggle-muted");
    t.textContent = showMuted ? "ミュート再非表示" : "ミュート再表示";
    document.querySelectorAll("li[data-muted='1']").forEach(li => {
      li.style.display = showMuted ? "" : "none";
    });
  }

  // ヘッダーボタンイベント
  function bindWidgetEvents() {
    document.addEventListener("click", (ev) => {
      if (ev.target.closest("#ci-toggle-muted")) {
        toggleMutedView();
        return;
      }
      if (ev.target.closest("#ci-open-panel")) {
        const panel = document.getElementById("ci-panel");
        panel.style.display = panel.style.display === "none" ? "block" : "none";
        if (panel.style.display === "block") renderPanel();
        return;
      }
    });
  }

  // 初期化
  updateCache();
  buildWidget();
  bindWidgetEvents();
  scanComments();

  // コメント欄の変化を監視
  const observer = new MutationObserver(() => { scanComments(); });
  observer.observe(document.body, { childList: true, subtree: true });
})();
