/* App interactions for 老王研究所 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  // 授权逻辑（与文档 genLicense 规则一致）
  function getParam(key) {
    try { return new URLSearchParams(window.location.search).get(key) || ''; } catch { return ''; }
  }
  function computeMachineCode() {
    try {
      // 1) 若 URL 直接提供 mc=xxxx-xxxx，则直接使用
      const mcParam = getParam('mc');
      if (/^\d{1,5}-\d{1,5}$/.test(mcParam)) return mcParam;

      // 2) 若 URL 提供 home 与 ver，则严格按宏规则计算
      const homeParam = getParam('home');
      const verParam = getParam('ver');
      let qualityID;
      if (homeParam || verParam) {
        qualityID = (homeParam || '') + (verParam || '');
      } else {
        // 3) 回退：使用 UA 与 appVersion 近似
        const systemPath = navigator.userAgent || '';
        const versionInfo = navigator.appVersion || '';
        qualityID = systemPath + versionInfo;
      }

      // qualityHash1: 逐字符累加，超过 99999 则减去 99999
      let qualityHash1 = 0;
      for (let i = 0; i < qualityID.length; i++) {
        const pixelValue = qualityID.charCodeAt(i);
        qualityHash1 = qualityHash1 + pixelValue;
        if (qualityHash1 > 99999) qualityHash1 = qualityHash1 - 99999;
      }

      // qualityHash2: 反转后逐字符累加*3，超过 99999 则减去 99999
      let qualityHash2 = 0;
      const reversedID = qualityID.split('').reverse().join('');
      for (let i = 0; i < reversedID.length; i++) {
        const pixelValue = reversedID.charCodeAt(i);
        qualityHash2 = qualityHash2 + pixelValue * 3;
        if (qualityHash2 > 99999) qualityHash2 = qualityHash2 - 99999;
      }

      return `${qualityHash1}-${qualityHash2}`;
    } catch { return '10000-10000'; }
  }
  function reverseDigits(n) {
    return parseInt(String(Math.abs(n)).split('').reverse().join(''), 10) || 0;
  }
  function digitSum(n) {
    return String(Math.abs(n)).split('').reduce((s, d) => s + (parseInt(d, 10) || 0), 0);
  }
  function parseMachineCode(machineCode) {
    if (typeof machineCode !== 'string') return null;
    const parts = machineCode.trim().split('-');
    if (parts.length !== 2) return null;
    const a = parseInt(parts[0], 10);
    const b = parseInt(parts[1], 10);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return { a, b };
  }
  function genLicenseComplex(machineCode) {
    const parsed = parseMachineCode(machineCode);
    if (!parsed) return 'ERROR';
    const { a, b } = parsed;
    const revA = reverseDigits(a);
    const revB = reverseDigits(b);
    const sumA = digitSum(a);
    const sumB = digitSum(b);
    const p1 = (a * 7 + 12345 + revB * 3 + sumA * 97) % 1000000;
    const p2 = (b * 11 + 67890 + revA * 5 + sumB * 89) % 1000000;
    const p3 = ((p1 ^ p2) + (a ^ b)) % 100000;
    const pad = (n, w) => String(Math.abs(n)).padStart(w, '0');
    return `${pad(p1, 6)}-${pad(p2, 6)}-${pad(p3, 5)}`;
  }
  function isAuthorized() {
    return sessionStorage.getItem('lw_license_ok') === 'true';
  }
  function setAuthorized(machineCode, license) {
    sessionStorage.setItem('lw_license_ok', 'true');
    sessionStorage.setItem('lw_license_mc', machineCode || '');
    sessionStorage.setItem('lw_license_code', license || '');
  }

  // Year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Gate modal logic (用于需要授权的页面按钮)
  const gateModal = $('#gate-modal');
  function openGate() {
    if (gateModal) {
      const mcInput = document.getElementById('auth-mc');
      if (mcInput && mcInput instanceof HTMLInputElement) {
        mcInput.value = computeMachineCode();
        mcInput.readOnly = true;
      }
      gateModal.setAttribute('aria-hidden', 'false');
    }
  }
  function closeGate() { gateModal?.setAttribute('aria-hidden', 'true'); }
  gateModal?.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action === 'close' || target.classList.contains('modal-backdrop')) {
      closeGate();
    }
  });
  $$('[data-action="contact"]').forEach(btn => btn.addEventListener('click', openGate));
  // 统一事件委托：任何 .gated-link 点击 → 若已授权则跳转 data-href，否则弹窗
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const gated = t.closest('.gated-link');
    if (gated) {
      e.preventDefault();
      if (isAuthorized() && gated.getAttribute('data-href')) {
        window.location.href = gated.getAttribute('data-href');
      } else {
        openGate();
      }
    }
  });

  // 授权校验
  const authVerifyBtn = document.getElementById('auth-verify');
  authVerifyBtn?.addEventListener('click', () => {
    const mc = (document.getElementById('auth-mc') || {}).value || '';
    const lic = (document.getElementById('auth-lic') || {}).value || '';
    const expected = genLicenseComplex(mc);
    if (expected !== 'ERROR' && expected === lic) {
      setAuthorized(mc, lic);
      closeGate();
      alert('授权成功');
      // 不刷新页面，直接更新受限链接与代码中心按钮
      updateAuthorizedUI();
      // 重新渲染代码中心
      if (codeList) {
        codeList.innerHTML = '';
        loadMacros().then(items => {
          const frag = document.createDocumentFragment();
          items.forEach(item => frag.appendChild(createCodeCard(item)));
          codeList.appendChild(frag);
        });
      }
    } else {
      alert('授权码无效，请检查机器码与授权码');
    }
  });

  // 已移除互动栏目与本地发帖逻辑

  // 简易轮播
  const track = document.querySelector('.carousel-track');
  if (track) {
    const slides = Array.from(track.children);
    let idx = 0;
    setInterval(() => {
      if (slides.length === 0) return;
      idx = (idx + 1) % slides.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
    }, 3000);
  }

  // 代码中心：从 JSON 生成卡片
  const codeList = $('#code-list');
  async function loadMacros() {
    try {
      const res = await fetch('assets/macros.json');
      if (!res.ok) throw new Error('fail');
      return await res.json();
    } catch {
      return [];
    }
  }

  function createCodeCard(item) {
    const card = document.createElement('div');
    card.className = 'card code-card';
    let actionsHtml = '';
    if (isAuthorized()) {
      const docLink = item.docPath ? `<a class="btn" href="${item.docPath}" target="_blank" rel="noopener">使用说明</a>` : '';
      const dlLink = '<button class="btn" disabled title="稍后提供">下载</button>';
      actionsHtml = `${docLink}${dlLink}`;
    } else {
      const docBtn = '<button class="btn gated-link" type="button" title="需授权">使用说明（已上锁）</button>';
      const dlBtn = '<button class="btn gated-link" type="button" title="需授权">下载（已上锁）</button>';
      actionsHtml = `${docBtn}${dlBtn}`;
    }
    card.innerHTML = `
      <h4>${item.name}</h4>
      <div class="desc">${item.description || ''}</div>
      <div class="meta"><span class="tag">版本 ${item.version || 'N/A'}</span><span class="tag">${item.category || '宏代码'}</span></div>
      <div class="actions">${actionsHtml}</div>
    `;
    return card;
  }

  function renderCodeList(items) {
    if (!codeList) return;
    if (!Array.isArray(items) || items.length === 0) {
      codeList.innerHTML = '<div class="muted">尚无可显示的条目。</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(item => frag.appendChild(createCodeCard(item)));
    codeList.appendChild(frag);
  }
  loadMacros().then(renderCodeList);
  
  // 页面加载后，如已授权：更新导航受限链接
  function updateAuthorizedUI() {
    if (!isAuthorized()) return;
    $$('.site-nav .gated-link').forEach(a => {
      const href = a.getAttribute('data-href');
      if (href) {
        a.classList.remove('gated-link');
        a.setAttribute('href', href);
      }
    });
    $$('.gated-section .gate-banner').forEach(b => b.innerHTML = '<strong>已授权</strong>');
  }
  // 刷新时要求重新输入：如为 reload 则清理会话授权
  try {
    const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'reload') {
      sessionStorage.removeItem('lw_license_ok');
      sessionStorage.removeItem('lw_license_mc');
      sessionStorage.removeItem('lw_license_code');
    }
  } catch {}
  // 首次加载更新 UI，并预填机器码
  updateAuthorizedUI();
  const mcPrefill = document.getElementById('auth-mc');
  if (mcPrefill && mcPrefill instanceof HTMLInputElement) {
    mcPrefill.value = computeMachineCode();
    mcPrefill.readOnly = true;
  }
})();


