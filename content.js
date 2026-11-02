/**
 * QR-Share — кнопка «поделиться через QR» на любой странице.
 *
 * Клик по плавающей кнопке открывает панель с QR-кодом текущего URL
 * (и кнопкой «Копировать ссылку»). Панель живёт при SPA-навигации:
 * при смене URL без перезагрузки QR пересобирается.
 */

(function () {
  "use strict";

  const BTN_ID = "qrshare-btn";
  const PANEL_ID = "qrshare-panel";

  /** Настройки внешнего вида — собраны наверху, чтобы легко переносить проект. */
  const CONFIG = {
    btnSize: 44,
    offset: 24,
    panelWidth: 240,
    qrSize: 200,
    accentColor: "#2b6cb0",
    hoverColor: "#1a365d",
  };

  /** Пиктограмма — простой векторный «QR» из квадратиков, без внешних файлов. */
  function buildIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const px = (x, y) => {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", x); r.setAttribute("y", y);
      r.setAttribute("width", 4); r.setAttribute("height", 4);
      r.setAttribute("fill", "#fff");
      return r;
    };
    // «Найти»-уголки с тремя модулями, как у настоящего QR-кода
    [[0, 0], [16, 0], [0, 16]].forEach(([x, y]) => {
      svg.appendChild(px(x, y));
      svg.appendChild(px(x + 4, y));
      svg.appendChild(px(x, y + 4));
      svg.appendChild(px(x + 4, y + 4));
      svg.appendChild(px(x + 8, y + 8));
    });
    // «Данные» — пара случайных на глаз модулей
    svg.appendChild(px(14, 4));
    svg.appendChild(px(4, 14));
    svg.appendChild(px(16, 16));
    svg.setAttribute("width", 22);
    svg.setAttribute("height", 22);
    svg.setAttribute("viewBox", "0 0 24 24");
    return svg;
  }

  /** Единая точка получения адреса — на случай будущих ограничений URL. */
  function currentUrl() {
    return location.href;
  }

  function ensureButton() {
    if (document.getElementById(BTN_ID)) return;
    const btn = document.createElement("div");
    btn.id = BTN_ID;
    btn.title = "QR-код этой страницы";
    btn.setAttribute("role", "button");
    btn.style.cssText = [
      "position: fixed",
      `right: ${CONFIG.offset}px`,
      "bottom: 24px",
      `width: ${CONFIG.btnSize}px`,
      `height: ${CONFIG.btnSize}px`,
      "border-radius: 50%",
      `background: ${CONFIG.accentColor}`,
      "box-shadow: 0 4px 14px rgba(0,0,0,.35)",
      "display: flex",
      "align-items: center",
      "justify-content: center",
      "cursor: pointer",
      "z-index: 2147483646",
      "transition: transform .12s, background .12s",
      "user-select: none",
    ].join(";");
    btn.appendChild(buildIcon());
    btn.addEventListener("mouseenter", () => {
      btn.style.background = CONFIG.hoverColor;
      btn.style.transform = "scale(1.08)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = CONFIG.accentColor;
      btn.style.transform = "scale(1)";
    });
    btn.addEventListener("click", togglePanel);
    document.body.appendChild(btn);
  }

  function buildPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText = `
      position: fixed;
      right: 24px;
      bottom: 78px;
      width: ${CONFIG.panelWidth}px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, .45);
      padding: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #222b36;
      z-index: 2147483647;
      box-sizing: border-box;
    `;

    const qrHolder = document.createElement("div");
    qrHolder.id = "qrshare-qr";
    qrHolder.style.cssText = `width:${CONFIG.qrSize}px; height:${CONFIG.qrSize}px;`;

    const urlLabel = document.createElement("div");
    urlLabel.id = "qrshare-url";
    urlLabel.style.cssText = `
      max-width: 100%;
      font: 500 10px/1.35 monospace;
      color: #4a5568;
      text-align: center;
      word-break: break-all;
    `;

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex; gap:8px; width:100%;";

    actions.appendChild(makeButton("Копировать ссылку", () => {
      navigator.clipboard.writeText(currentUrl())
        .then(() => {
          actions.querySelector("#qrshare-copy").textContent = "Скопировано ✓";
          setTimeout(() => {
            actions.querySelector("#qrshare-copy").textContent = "Копировать ссылку";
          }, 1500);
        })
        .catch(() => {
          // Фолбэк: на http-страницах clipboard API может быть недоступен
          const ta = document.createElement("textarea");
          ta.value = currentUrl();
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          actions.querySelector("#qrshare-copy").textContent = "Скопировано ✓";
          setTimeout(() => {
            actions.querySelector("#qrshare-copy").textContent = "Копировать ссылку";
          }, 1500);
        });
    }, "qrshare-copy"));

    actions.appendChild(makeButton("Закрыть", closePanel, "qrshare-close", true));

    panel.appendChild(qrHolder);
    panel.appendChild(urlLabel);
    panel.appendChild(actions);
    document.body.appendChild(panel);

    renderQr();
  }

  function makeButton(text, onClick, id, secondary) {
    const b = document.createElement("button");
    b.id = id;
    b.textContent = text;
    b.style.cssText = [
      "flex: 1",
      "padding: 8px 10px",
      "border: none",
      "border-radius: 8px",
      secondary ? "background: #edf2f7" : `background: ${CONFIG.accentColor}`,
      secondary ? "color: #2d3748" : "color: #fff",
      "font: 600 12px/1 'Segoe UI', sans-serif",
      "cursor: pointer",
    ].join(";");

    b.addEventListener("click", onClick);
    return b;
  }

  /** Собирает QR заново (полезно на SPA, где меняется href без перезагрузки). */
  function renderQr() {
    const holder = document.getElementById("qrshare-qr");
    const label = document.getElementById("qrshare-url");
    if (!holder) return;
    holder.innerHTML = "";
    label.textContent = currentUrl();
    if (typeof QRCode !== "undefined") {
      new QRCode(holder, {
        text: currentUrl(),
        width: CONFIG.qrSize,
        height: CONFIG.qrSize,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      holder.textContent = "QR-библиотека не загружена";
      holder.style.color = "#c00";
    }
  }

  function togglePanel() {
    document.getElementById(PANEL_ID) ? closePanel() : buildPanel();
  }

  function closePanel() {
    document.getElementById(PANEL_ID)?.remove();
  }

  /* ===== Инициализация + поддержка SPA-навигации ============================ */
  ensureButton();

  // Обычно URL-changing фреймворки (Next.js, Vue Router и т. п.) меняют href
  // без перезагрузки. Перерисовываем QR, если панель открыта.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      if (document.getElementById(PANEL_ID)) renderQr();
    }
  }, 500);
})();
