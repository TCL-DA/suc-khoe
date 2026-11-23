// Chòm hạt tam giác nhiều màu xếp thành hình trái tim, đập nhẹ ~60 nhịp/phút.
// Tự dừng khi khuất màn hình / tab ẩn; máy bật "giảm chuyển động" thì chỉ vẽ một khung tĩnh.

const MAU = ['#8052ff', '#ffb829', '#1fb597', '#15846e', '#e0479e', '#4f7dff', '#b49cff', '#ffffff'];
const SO_HAT_TIM = 720;
const SO_HAT_NEN = 140;
const CHU_KY_NHIP = 1000; // ms

// Trái tim chuẩn hoá: (x² + y² − 1)³ − x²·y³ ≤ 0, x ∈ [−1.2, 1.2], y ∈ [−1, 1.25]
const trongTim = (x, y) => (x * x + y * y - 1) ** 3 - x * x * y ** 3 <= 0;

function taoHat() {
  const hat = [];
  while (hat.length < SO_HAT_TIM) {
    const x = Math.random() * 2.4 - 1.2;
    const y = Math.random() * 2.3 - 1.05;
    if (!trongTim(x, y)) continue;
    // Dày ở viền, thưa ở lòng để thấy rõ hai thuỳ và vết lõm trên đỉnh
    const vien = Math.abs((x * x + y * y - 1) ** 3 - x * x * y ** 3);
    if (vien > 0.05 && Math.random() < 0.8) continue;
    hat.push({
      x, y: -y, nen: false,
      r: 2.2 + Math.random() * 3.6,
      goc: Math.random() * Math.PI * 2,
      quay: (Math.random() - 0.5) * 0.6,
      mau: MAU[(Math.random() * MAU.length) | 0],
      sang: 0.55 + Math.random() * 0.45,
      pha: Math.random() * Math.PI * 2,
    });
  }
  for (let i = 0; i < SO_HAT_NEN; i++) {
    hat.push({
      x: Math.random() * 4 - 2, y: Math.random() * 3.2 - 1.6, nen: true,
      r: 1.6 + Math.random() * 2.4,
      goc: Math.random() * Math.PI * 2,
      quay: (Math.random() - 0.5) * 0.3,
      mau: MAU[(Math.random() * MAU.length) | 0],
      sang: 0.15 + Math.random() * 0.3,
      pha: Math.random() * Math.PI * 2,
    });
  }
  return hat;
}

// Nhịp tim: hai nhịp đập ngắn (lub-dub) rồi nghỉ
function nhip(t) {
  const p = (t % CHU_KY_NHIP) / CHU_KY_NHIP;
  const xung = (c, w) => Math.exp(-(((p - c) / w) ** 2));
  return 1 + 0.045 * xung(0.08, 0.05) + 0.025 * xung(0.26, 0.05);
}

export function batSao(canvas) {
  const ctx = canvas.getContext('2d');
  const hat = taoHat();
  const giamChuyenDong = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, dpr = 1, dangChay = false, nhinThay = true, raf = 0;

  function doKichThuoc() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ve(performance.now());
  }

  function ve(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const coTim = Math.min(w / 2.6, h / 2.5);
    const cx = w / 2, cy = h / 2 + coTim * 0.08;
    const s = giamChuyenDong ? 1 : nhip(t);
    const giay = t / 1000;
    ctx.lineWidth = 1.1;
    ctx.lineJoin = 'round';
    for (const p of hat) {
      const tro = p.nen ? 0 : Math.sin(giay * 0.9 + p.pha) * 0.012;
      const x = cx + (p.x + tro) * coTim * (p.nen ? 1 : s);
      const y = cy + (p.y + tro) * coTim * (p.nen ? 1 : s);
      if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
      const g = p.goc + (giamChuyenDong ? 0 : giay * p.quay);
      ctx.globalAlpha = p.sang * (p.nen ? 0.8 + 0.2 * Math.sin(giay + p.pha) : 1);
      ctx.strokeStyle = p.mau;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const a = g + (k * Math.PI * 2) / 3;
        const px = x + Math.cos(a) * p.r, py = y + Math.sin(a) * p.r;
        k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function vong(t) {
    if (!dangChay) return;
    ve(t);
    raf = requestAnimationFrame(vong);
  }
  function capNhatChay() {
    const nenChay = !giamChuyenDong && nhinThay && !document.hidden;
    if (nenChay && !dangChay) { dangChay = true; raf = requestAnimationFrame(vong); }
    if (!nenChay && dangChay) { dangChay = false; cancelAnimationFrame(raf); }
  }

  new ResizeObserver(doKichThuoc).observe(canvas);
  new IntersectionObserver((ds) => { nhinThay = ds[0].isIntersecting; capNhatChay(); }).observe(canvas);
  document.addEventListener('visibilitychange', capNhatChay);
  doKichThuoc();
  capNhatChay();
  return { doKichThuoc };
}
