/* ============================================================
   미적분·최적화, 눈으로 보기 — 공통 헬퍼 (전역 VZ).
   코어 + linePlot + VZ.LA(board/arrow/animateTo) + VZ.CA(calculus).
   모든 수치는 페이지에서 실시간 계산. 외부 출처 인용 없음.
   ============================================================ */
(function (global) {
  'use strict';

  const fmt = (n, d = 2) => {
    if (!isFinite(n)) return n > 0 ? '∞' : '−∞';
    const r = Number(n).toFixed(d);
    return Object.is(parseFloat(r), -0) ? (0).toFixed(d) : r;
  };
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const PALETTE = ['#60a5fa', '#fbbf24', '#94a3b8', '#34d399', '#f472b6', '#c084fc', '#fb7185', '#37bdf8'];

  function setupStepper(stepperSel = '#stepper', panelSel = '[data-panel]') {
    const stepper = document.querySelector(stepperSel);
    if (!stepper) return;
    const panels = [...document.querySelectorAll(panelSel)];
    stepper.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const s = b.dataset.s;
      stepper.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      panels.forEach(p => p.classList.toggle('show', p.dataset.panel === s));
      const top = stepper.getBoundingClientRect().top + window.scrollY - 10;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  }

  function setupViewToggle(toggleSel, views, onShow) {
    const toggle = document.querySelector(toggleSel);
    if (!toggle) return;
    const shown = {};
    toggle.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      toggle.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (onShow && !shown[v]) { onShow(v); shown[v] = true; }
      Object.keys(views).forEach(key => {
        const el = document.querySelector(views[key]);
        if (el) el.style.display = (key === v) ? '' : 'none';
      });
    });
  }

  function mountTopnav(sel, badge) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.innerHTML = `<a class="home" href="index.html">← 목차로</a><span class="chapbadge">${badge}</span>`;
  }

  function barRow(label, frac, { win = false, color = null, pctText = null } = {}) {
    const c = color || (win ? 'var(--hot)' : 'var(--q)');
    return `<div class="barrow ${win ? 'win' : ''}">
      <div class="bw">${label}${win ? ' 🏆' : ''}</div>
      <div class="track"><div class="fill" style="width:${(clamp(frac, 0, 1) * 100).toFixed(1)}%;background:${c}"></div></div>
      <div class="pct">${pctText != null ? pctText : (frac * 100).toFixed(1) + '%'}</div>
    </div>`;
  }

  global.VZ = { fmt, clamp, PALETTE, setupStepper, setupViewToggle, mountTopnav, barRow };
})(window);

/* ============================================================
   꺾은선 차트 (VZ.linePlot) — 수렴/손실/1변수 곡선용
   series:[{pts:[[x,y]],color,label,dash}], opts:{W,H,xlab,ylab,xmin..ymax,legend,hline,aria}
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function linePlot(series, opts = {}) {
    const W = opts.W || 460, H = opts.H || 230, padL = 44, padR = 14, padT = opts.legend === false ? 14 : 30, padB = 34;
    const all = series.filter(s => s.pts && s.pts.length);
    let xmin = opts.xmin, xmax = opts.xmax, ymin = opts.ymin, ymax = opts.ymax;
    if (xmin == null) xmin = Math.min(...all.flatMap(s => s.pts.map(p => p[0])), 0);
    if (xmax == null) xmax = Math.max(...all.flatMap(s => s.pts.map(p => p[0])), 1);
    if (ymin == null) ymin = Math.min(...all.flatMap(s => s.pts.map(p => p[1])), 0);
    if (ymax == null) ymax = Math.max(...all.flatMap(s => s.pts.map(p => p[1])), 1);
    if (ymax === ymin) ymax = ymin + 1;
    if (xmax === xmin) xmax = xmin + 1;
    const px = x => padL + (x - xmin) / (xmax - xmin) * (W - padL - padR);
    const py = y => H - padB - (y - ymin) / (ymax - ymin) * (H - padT - padB);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const yv = ymin + (ymax - ymin) * i / 4, y = py(yv);
      g += `<line class="gridline" x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}"/>`;
      g += `<text class="axislabel" x="${padL - 6}" y="${y + 3}" text-anchor="end">${VZ.fmt(yv, Math.abs(ymax - ymin) >= 10 ? 0 : 1)}</text>`;
    }
    for (let i = 1; i < 4; i++) { const xv = xmin + (xmax - xmin) * i / 4; g += `<line class="gridline" x1="${px(xv)}" y1="${padT}" x2="${px(xv)}" y2="${H - padB}"/>`; }
    g += `<line class="axis" x1="${padL}" y1="${py(ymin)}" x2="${W - padR}" y2="${py(ymin)}"/>`;
    g += `<line class="axis" x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}"/>`;
    g += `<text class="axislabel" x="${padL}" y="${H - padB + 16}" text-anchor="start">${VZ.fmt(xmin, 0)}</text>`;
    g += `<text class="axislabel" x="${W - padR}" y="${H - padB + 16}" text-anchor="end">${VZ.fmt(xmax, 0)}</text>`;
    if (opts.xlab) g += `<text class="axislabel" x="${(padL + W - padR) / 2}" y="${H - padB + 16}" text-anchor="middle">${opts.xlab}</text>`;
    if (opts.ylab) g += `<text class="axislabel" x="${padL - 30}" y="${(padT + H - padB) / 2}" text-anchor="middle" transform="rotate(-90 ${padL - 30} ${(padT + H - padB) / 2})">${opts.ylab}</text>`;
    if (opts.hline) {
      const y = py(opts.hline.y);
      g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="var(--faint)" stroke-width="1" stroke-dasharray="4 3"/>`;
      if (opts.hline.label) g += `<text class="axislabel" x="${W - padR}" y="${y - 4}" text-anchor="end" fill="var(--faint)">${opts.hline.label}</text>`;
    }
    all.forEach(s => {
      const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ');
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round"/>`;
    });
    if (opts.legend !== false) {
      let lx = padL;
      all.forEach(s => { if (!s.label) return;
        g += `<line x1="${lx}" y1="10" x2="${lx + 16}" y2="10" stroke="${s.color}" stroke-width="3" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''}/>`;
        g += `<text x="${lx + 20}" y="13" font-size="11" font-family="JetBrains Mono" fill="var(--muted)">${s.label}</text>`;
        lx += 26 + (s.label.length * 7.2); });
    }
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${opts.aria || '꺾은선 차트'}" style="max-width:100%;display:block">${g}</svg>`;
  }
  VZ.linePlot = linePlot;
})(window);

/* ============================================================
   2D 보드/벡터/애니메이션 (VZ.LA) — 벡터장·등방 좌표용
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;
  function arrowDefsAndLine(x1, y1, x2, y2, color, lw) {
    const id = 'ah' + Math.round(Math.abs(x1 * 7 + y1 * 13 + x2 * 17 + y2 * 23)) + color.replace(/[^a-z0-9]/gi, '');
    let s = `<defs><marker id="${id}" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 Z" fill="${color}"/></marker></defs>`;
    s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${lw}" marker-end="url(#${id})"/>`;
    return s;
  }
  // 두 픽셀점 사이 화살표 (범용)
  function arrowPx(x1, y1, x2, y2, color, { lw = 2.5 } = {}) { return arrowDefsAndLine(x1, y1, x2, y2, color, lw); }
  // 보간 애니메이션(스칼라 t): cb(t∈0..1) 반복 호출. 취소함수 반환.
  function tween(cb, dur = 800, done) {
    const t0 = performance.now(); let cancelled = false, raf = 0;
    function frame(now) {
      if (cancelled) return;
      let t = Math.min(1, (now - t0) / dur);
      t = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cb(t);
      if (t < 1) raf = requestAnimationFrame(frame); else if (done) done();
    }
    raf = requestAnimationFrame(frame);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }
  VZ.LA = { arrowPx, tween };
})(window);

/* ============================================================
   미적분·최적화 엔진 (VZ.CA)
   - board2(opts): 독립 x/y 스케일 좌표계 {X,Y,px,py,...}
   - fnPlot(b2, f, opts): y=f(x) 곡선 path (불연속/발산 끊기)
   - deriv(f,x,h), integrate(f,a,b,n): 중심차분 / 사다리꼴
   - tangentLine / secantLine
   - riemannRects(b2,f,opts) → {svg, sum}
   - gradient(F,x,y,h): 편미분 벡터
   - heatColor(t): 0..1 → 색
   - contourGrid(b2,F,opts): 스칼라장 밴드 히트맵 + 등고선 효과
   - quiver(b2,F,opts): -∇F(또는 ∇F) 벡터장
   - gradDescent(gradFn, start, opts) → 경로 점배열 (1D/2D 공용)
   - animatePath(pts, cb, opts): 경로 순차 점등, 취소함수 반환
   ============================================================ */
(function (global) {
  'use strict';
  const VZ = global.VZ;

  function board2(o = {}) {
    const W = o.W || 420, H = o.H || 300;
    const padL = o.padL ?? 40, padR = o.padR ?? 14, padT = o.padT ?? 14, padB = o.padB ?? 30;
    const xmin = o.xmin ?? -5, xmax = o.xmax ?? 5, ymin = o.ymin ?? -5, ymax = o.ymax ?? 5;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    return {
      W, H, padL, padR, padT, padB, xmin, xmax, ymin, ymax, plotW, plotH,
      X: x => padL + (x - xmin) / (xmax - xmin) * plotW,
      Y: y => H - padB - (y - ymin) / (ymax - ymin) * plotH,
    };
  }

  // 좌표축 + 눈금 격자 (정적)
  function axes(b, { step = 1, color = 'rgba(255,255,255,.08)', axisColor = 'rgba(255,255,255,.30)' } = {}) {
    let g = '';
    for (let x = Math.ceil(b.xmin / step) * step; x <= b.xmax; x += step) {
      const c = Math.abs(x) < 1e-9 ? axisColor : color;
      g += `<line x1="${b.X(x).toFixed(1)}" y1="${b.padT}" x2="${b.X(x).toFixed(1)}" y2="${b.H - b.padB}" stroke="${c}" stroke-width="${Math.abs(x) < 1e-9 ? 1.4 : 1}"/>`;
    }
    for (let y = Math.ceil(b.ymin / step) * step; y <= b.ymax; y += step) {
      const c = Math.abs(y) < 1e-9 ? axisColor : color;
      g += `<line x1="${b.padL}" y1="${b.Y(y).toFixed(1)}" x2="${b.W - b.padR}" y2="${b.Y(y).toFixed(1)}" stroke="${c}" stroke-width="${Math.abs(y) < 1e-9 ? 1.4 : 1}"/>`;
    }
    return g;
  }

  // y=f(x) 곡선. 불연속/발산은 path를 끊는다.
  function fnPlot(b, f, { color = 'var(--q)', n = 280, dash = null, sw = 2.5 } = {}) {
    let d = '', pen = false, prevY = null;
    const jumpLim = b.plotH * 1.5;  // y 픽셀 점프가 이보다 크면 펜 들기
    for (let i = 0; i <= n; i++) {
      const x = b.xmin + (b.xmax - b.xmin) * i / n;
      const y = f(x);
      if (!isFinite(y)) { pen = false; prevY = null; continue; }
      const px = b.X(x), py = b.Y(y);
      if (pen && prevY != null && Math.abs(py - prevY) > jumpLim) pen = false;  // 불연속 추정
      d += (pen ? 'L' : 'M') + px.toFixed(1) + ',' + py.toFixed(1) + ' ';
      pen = true; prevY = py;
    }
    return `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linejoin="round"/>`;
  }

  // 수치 미분(중심차분, h≈ε^(1/3)) / 수치 적분(사다리꼴)
  const deriv = (f, x, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
  function integrate(f, a, b, n = 200) {
    const dx = (b - a) / n; let s = 0.5 * (f(a) + f(b));
    for (let i = 1; i < n; i++) s += f(a + i * dx);
    return s * dx;
  }

  // 접선/할선 (board2 x범위 양끝까지)
  function tangentLine(b, f, x0, { color = 'var(--hot)', m = null } = {}) {
    const slope = m == null ? deriv(f, x0) : m, y0 = f(x0);
    const yL = y0 + slope * (b.xmin - x0), yR = y0 + slope * (b.xmax - x0);
    return `<line x1="${b.X(b.xmin).toFixed(1)}" y1="${b.Y(yL).toFixed(1)}" x2="${b.X(b.xmax).toFixed(1)}" y2="${b.Y(yR).toFixed(1)}" stroke="${color}" stroke-width="2"/>`
      + `<circle cx="${b.X(x0).toFixed(1)}" cy="${b.Y(y0).toFixed(1)}" r="4" fill="${color}"/>`;
  }
  function secantLine(b, f, a, c, { color = 'var(--v)', dot = true } = {}) {
    const ya = f(a), yc = f(c), slope = (yc - ya) / (c - a);
    const yL = ya + slope * (b.xmin - a), yR = ya + slope * (b.xmax - a);
    let s = `<line x1="${b.X(b.xmin).toFixed(1)}" y1="${b.Y(yL).toFixed(1)}" x2="${b.X(b.xmax).toFixed(1)}" y2="${b.Y(yR).toFixed(1)}" stroke="${color}" stroke-width="2" stroke-dasharray="5 3"/>`;
    if (dot) s += `<circle cx="${b.X(a).toFixed(1)}" cy="${b.Y(ya).toFixed(1)}" r="3.5" fill="${color}"/><circle cx="${b.X(c).toFixed(1)}" cy="${b.Y(yc).toFixed(1)}" r="3.5" fill="${color}"/>`;
    return { svg: s, slope };
  }

  // 리만합 직사각형 (부호 포함). rule: left|right|mid
  function riemannRects(b, f, { a, b: B, n = 8, rule = 'mid', fill = 'var(--q)', negFill = 'var(--k)' } = {}) {
    const dx = (B - a) / n, y0 = b.Y(0); let sum = 0, g = '';
    for (let i = 0; i < n; i++) {
      const xl = a + i * dx, xr = xl + dx;
      const sx = rule === 'left' ? xl : rule === 'right' ? xr : (xl + xr) / 2;
      const h = f(sx); sum += h * dx;
      const yTop = b.Y(Math.max(0, h)), yBot = b.Y(Math.min(0, h));
      const px = b.X(xl), w = b.X(xr) - b.X(xl);
      g += `<rect x="${px.toFixed(1)}" y="${yTop.toFixed(1)}" width="${Math.max(0, w - 0.6).toFixed(1)}" height="${Math.abs(yBot - yTop).toFixed(1)}" fill="${h < 0 ? negFill : fill}" opacity="0.42" stroke="${h < 0 ? negFill : fill}" stroke-width="0.6"/>`;
    }
    return { svg: g, sum };
  }

  // 2변수 편미분 → 그래디언트
  function gradient(F, x, y, h = 1e-5) {
    return [(F(x + h, y) - F(x - h, y)) / (2 * h), (F(x, y + h) - F(x, y - h)) / (2 * h)];
  }

  // 스칼라값 t∈[0,1] → 색 (낮음=남보라 → 청록 → 노랑=높음)
  function heatColor(t) {
    t = Math.max(0, Math.min(1, t));
    const stops = [[30, 27, 75], [37, 99, 142], [52, 211, 153], [251, 191, 36]]; // indigo→teal→green→amber
    const seg = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(seg)), f = seg - i;
    const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  // 스칼라장 밴드 히트맵 (+밴드 경계로 등고선 효과). levels로 양자화.
  function contourGrid(b, F, { nx = 56, ny = 40, levels = 9, invert = false } = {}) {
    const cw = b.plotW / nx, ch = b.plotH / ny;
    // 값 범위
    let lo = Infinity, hi = -Infinity; const vals = [];
    for (let j = 0; j < ny; j++) { vals.push([]); for (let i = 0; i < nx; i++) {
      const x = b.xmin + (b.xmax - b.xmin) * (i + 0.5) / nx, y = b.ymax - (b.ymax - b.ymin) * (j + 0.5) / ny;
      const v = F(x, y); vals[j].push(v); if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    } }
    if (!(hi > lo)) hi = lo + 1;
    const band = v => Math.max(0, Math.min(levels - 1, Math.floor((v - lo) / (hi - lo) * levels)));
    let g = '';
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = vals[j][i]; if (!isFinite(v)) continue;
      let t = band(v) / (levels - 1); if (invert) t = 1 - t; // invert: 낮은 값(골짜기)을 밝게
      const x = b.padL + i * cw, y = b.padT + j * ch;
      g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cw + 0.6).toFixed(1)}" height="${(ch + 0.6).toFixed(1)}" fill="${heatColor(t)}" opacity="0.85"/>`;
    }
    return g;
  }

  // 벡터장: 격자점마다 ∇F(또는 -∇F) 화살표. normalize=방향만.
  function quiver(b, F, { nx = 11, ny = 8, color = 'rgba(255,255,255,.55)', neg = true, normalize = true, len = 0.34 } = {}) {
    let g = '', maxMag = 1e-9;
    const pts = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = b.xmin + (b.xmax - b.xmin) * (i + 0.5) / nx, y = b.ymin + (b.ymax - b.ymin) * (j + 0.5) / ny;
      let [gx, gy] = gradient(F, x, y); if (neg) { gx = -gx; gy = -gy; }
      const mag = Math.hypot(gx, gy) || 1e-9; maxMag = Math.max(maxMag, mag);
      pts.push([x, y, gx, gy, mag]);
    }
    const ux = (b.xmax - b.xmin) / nx * len, uy = (b.ymax - b.ymin) / ny * len; // 화살표 길이(데이터 단위)
    pts.forEach(([x, y, gx, gy, mag]) => {
      let dx, dy;
      if (normalize) { dx = gx / mag * ux; dy = gy / mag * uy; }
      else { dx = gx / maxMag * ux * 2; dy = gy / maxMag * uy * 2; }
      const x1 = b.X(x), y1 = b.Y(y), x2 = b.X(x + dx), y2 = b.Y(y + dy);
      g += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="1.4"/>`;
      // 작은 화살촉
      const ang = Math.atan2(y2 - y1, x2 - x1), ah = 4;
      g += `<path d="M${x2.toFixed(1)},${y2.toFixed(1)} L${(x2 - ah * Math.cos(ang - 0.5)).toFixed(1)},${(y2 - ah * Math.sin(ang - 0.5)).toFixed(1)} M${x2.toFixed(1)},${y2.toFixed(1)} L${(x2 - ah * Math.cos(ang + 0.5)).toFixed(1)},${(y2 - ah * Math.sin(ang + 0.5)).toFixed(1)}" stroke="${color}" stroke-width="1.4" fill="none"/>`;
    });
    return g;
  }

  // 경사하강 경로 (1D: start=[x], gradFn(p)=[g]; 2D: start=[x,y]). 발산 클램프.
  function gradDescent(gradFn, start, { lr = 0.1, steps = 40, clip = 1e6, tol = 1e-6 } = {}) {
    let p = start.slice(); const path = [p.slice()];
    for (let s = 0; s < steps; s++) {
      const g = gradFn(p);
      let step = g.map(gi => lr * gi);
      const norm = Math.hypot(...step);
      if (norm > clip) step = step.map(si => si / norm * clip);   // 발산 방지
      p = p.map((pi, i) => pi - step[i]);
      if (!p.every(isFinite)) break;
      path.push(p.slice());
      if (norm < tol) break;  // 수렴
    }
    return path;
  }

  // 경로 점을 interval ms 간격으로 순차 콜백. 취소함수 반환(연타 시 이전 취소).
  function animatePath(pts, cb, { interval = 110 } = {}) {
    let i = 0, timer = null, cancelled = false;
    function tick() {
      if (cancelled) return;
      cb(pts.slice(0, i + 1), i);
      i++;
      if (i < pts.length) timer = setTimeout(tick, interval);
    }
    tick();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }

  VZ.CA = { board2, axes, fnPlot, deriv, integrate, tangentLine, secantLine, riemannRects, gradient, heatColor, contourGrid, quiver, gradDescent, animatePath };
})(window);
