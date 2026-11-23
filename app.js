// Hồ sơ sức khỏe — mở khoá bằng mật khẩu, giải mã trong trình duyệt, dựng trang.
// Dữ liệu chỉ nằm trong du-lieu.enc.json (AES-GCM 256, khoá dẫn bằng Argon2id). File này không chứa số liệu nào.
import { batSao } from './sao.js?v=3';
import { dungPhanTich } from './phan-tich.js?v=3';

const $ = (s) => document.querySelector(s);
const DO_DAI_TU_THU = 6;              // từ ký tự thứ 6 trở đi là tự thử ngầm
const thuVien = new URL('lib/argon2.umd.min.js', location.href).href;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const so = (n) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

let goiMaHoa = null;
let dangMo = false;

async function taiGoi() {
  if (goiMaHoa) return goiMaHoa;
  const r = await fetch('du-lieu.enc.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Không tải được dữ liệu (' + r.status + ')');
  goiMaHoa = await r.json();
  return goiMaHoa;
}

// Argon2id tốn ~1 s CPU và 64 MB — chạy trong Worker để ô nhập không bị khựng.
function danKhoa(matKhau, goi) {
  const ma = `self.onmessage = async (e) => {
    const d = e.data;
    try {
      importScripts(d.lib);
      const raw = await self.hashwasm.argon2id({ password: d.mk, salt: new Uint8Array(d.salt),
        parallelism: d.p, iterations: d.t, memorySize: d.m, hashLength: 32, outputType: 'binary' });
      self.postMessage({ ok: true, raw }, [raw.buffer]);
    } catch (err) { self.postMessage({ ok: false, loi: String(err) }); }
  };`;
  const url = URL.createObjectURL(new Blob([ma], { type: 'text/javascript' }));
  const w = new Worker(url);
  return new Promise((res, rej) => {
    w.onmessage = (e) => { w.terminate(); URL.revokeObjectURL(url); e.data.ok ? res(e.data.raw) : rej(new Error(e.data.loi)); };
    w.onerror = (e) => { w.terminate(); URL.revokeObjectURL(url); rej(new Error(e.message || 'Worker lỗi')); };
    w.postMessage({ lib: thuVien, mk: matKhau, salt: [...unb64(goi.salt)], m: goi.m, t: goi.t, p: goi.p });
  });
}

async function giaiMa(matKhau) {
  const goi = await taiGoi();
  const raw = await danKhoa(matKhau, goi);
  const khoa = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  let ro;
  try {
    ro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(goi.iv) }, khoa, unb64(goi.ct));
  } catch {
    return null; // sai mật khẩu → thẻ xác thực GCM không khớp
  }
  return JSON.parse(new TextDecoder().decode(ro));
}

// tay = true: người dùng bấm Enter / nút "Mở hồ sơ" → sai thì báo.
// tay = false: thử ngầm trong lúc gõ (từ ký tự thứ 6) → đúng thì tự mở, sai thì IM LẶNG (có thể chưa gõ xong).
let choThu = null; // lượt thử xếp hàng khi lượt trước còn đang chạy: { tay }
const baoSai = (o) => { $('#bao').textContent = 'Sai mật khẩu.'; o.select(); };

async function thuMo(tay = false) {
  const o = $('#mat-khau');
  const mk = o.value.trim();
  if (mk.length < DO_DAI_TU_THU) {
    if (tay) $('#bao').textContent = 'Mật khẩu có ít nhất 6 ký tự.';
    return;
  }
  if (dangMo) {
    // Không bỏ lượt: nhớ lại, chạy sau khi lượt hiện tại xong (giữ cờ "bấm tay" nếu có)
    choThu = { tay: tay || !!choThu?.tay };
    if (tay) $('#bao').textContent = 'Đang mở…';
    return;
  }
  dangMo = true;
  if (tay) { $('#nut-mo').disabled = true; $('#bao').textContent = 'Đang mở…'; }
  let moDuoc = false;
  try {
    const d = await giaiMa(mk);
    if (d) {
      moDuoc = true;
      o.value = '';
      $('#bao').textContent = '';
      dungHoSo(d);
    } else if (tay) {
      baoSai(o);
    }
  } catch (err) {
    $('#bao').textContent = 'Không mở được: ' + err.message;
  } finally {
    dangMo = false;
    $('#nut-mo').disabled = false;
    const cho = choThu;
    choThu = null;
    if (!moDuoc && cho) {
      if (o.value.trim() !== mk) thuMo(cho.tay);  // đã gõ thêm → thử giá trị mới
      else if (cho.tay) baoSai(o);                 // bấm Enter cho đúng giá trị vừa thử sai
    }
  }
}

// ---------- Dựng trang ----------
// kq lưu dạng chuỗi ("7.90") để giữ đúng số chữ số như in trên phiếu; tính toán thì đổi ra số.
const kqSo = (m) => Number(m.kq);
const kqChu = (m) => String(m.kq).replace('.', ',');

function trangThai(m) {
  if (m.muc) return m.muc;
  if (m.kq == null) return 'ok';
  if (m.max != null && kqSo(m) > m.max) return 'cao';
  if (m.min != null && kqSo(m) < m.min) return 'thap';
  return 'ok';
}
const CHU_TT = { ok: 'Bình thường', sat: 'Sát mép', cao: 'Cao', thap: 'Thấp' };

function chuNguong(m) {
  if (m.min != null && m.max != null) return `${so(m.min)} – ${so(m.max)}`;
  if (m.max != null) return `< ${so(m.max)}`;
  if (m.min != null) return `> ${so(m.min)}`;
  return '';
}

// Thanh ngưỡng: vạch xám là vùng bình thường, chấm là kết quả.
function thanhNguong(m) {
  const a = m.min ?? 0;
  const b = m.max ?? Math.max(kqSo(m), a) * 1.6;
  const rong = b - a || 1;
  const dau = m.min != null ? a - rong * 0.25 : 0;
  const cuoi = m.max != null ? b + rong * 0.25 : b;
  const vt = (x) => Math.min(100, Math.max(0, ((x - dau) / (cuoi - dau)) * 100));
  const tu = vt(a), den = vt(m.max ?? cuoi);
  return `<div class="thanh" aria-hidden="true"><i class="ray"></i><i class="vung" style="left:${tu}%;width:${den - tu}%"></i><span class="cham" style="left:${vt(kqSo(m))}%"></span></div>`;
}

function hangChiSo(m) {
  if (m.kq == null) {
    return `<div class="hang ok"><div class="ten">${esc(m.ten)}</div><div class="chu">${esc(m.chu)}</div></div>`;
  }
  const tt = trangThai(m);
  return `<div class="hang ${tt}">
    <div class="ten">${esc(m.ten)}</div>
    <div class="kq">${esc(kqChu(m))}<small>${esc(m.dv)}</small></div>
    ${thanhNguong(m)}
    <div class="ref">${chuNguong(m)} <br><span class="trang-thai">${CHU_TT[tt]}</span></div>
  </div>`;
}

function dungHoSo(d) {
  const soCao = d.noiBat.filter((x) => x.muc === 'cao').length;
  const pt = dungPhanTich(d, esc);
  const html = `
  <section class="hero" id="dau-ho-so">
    <div class="hero-chu">
      <p class="nhan">${esc(d.dot.loai)} · ${esc(d.dot.ngay)}</p>
      <h1 class="display">Sức khỏe<br>loại ${esc(d.ketLuan.phanLoai)}.</h1>
      <p class="than">${esc(d.dot.nguoi)}, sinh năm ${esc(d.dot.namSinh)}. ${esc(d.dot.noi)}.
        Bác sĩ ghi một chẩn đoán: <span class="vang">${esc(d.ketLuan.icdNghia.toLowerCase())}</span> (ICD ${esc(d.ketLuan.icd)}).</p>
      <div class="so-to">
        <div><b>${esc(d.ketLuan.phanLoai)}</b><span>Phân loại · ${esc(d.ketLuan.phanLoaiNghia)}</span></div>
        <div><b class="vang">${soCao}</b><span>Chỉ số vượt ngưỡng</span></div>
        <div><b>0</b><span>Bất thường hình ảnh</span></div>
      </div>
    </div>
    <div class="hero-hinh" id="cho-sao-2"></div>
  </section>

  <section class="khoi hai-cot">
    <div><p class="nhan">Kết luận của bác sĩ</p><h2 class="h">Cận thị là<br>chẩn đoán duy nhất.</h2></div>
    <div>
      <p class="than" style="margin-top:0">Phân loại sức khỏe <b style="font-weight:400">loại ${esc(d.ketLuan.phanLoai)} (${esc(d.ketLuan.phanLoaiNghia.toLowerCase())})</b>.
        Loại I là rất khỏe; bị xếp xuống loại II gần như chắc chắn là do cận thị.</p>
      <p class="than phu">Đề nghị: ${esc(d.ketLuan.deNghi)}</p>
      <p class="than mo-nhat">Người kết luận: ${esc(d.ketLuan.bacSi)} · ${esc(d.dot.ngay)}</p>
    </div>
  </section>

  ${pt.tongQuan}

  <section class="khoi hai-cot">
    <div><p class="nhan">Cần để ý</p><h2 class="h">Hai chỉ số vượt,<br>ba chỉ số sát mép.</h2></div>
    <div class="de-y">
      ${d.noiBat.map((x) => `<article>
        <div class="gia-tri ${x.muc === 'cao' ? 'vang' : ''}">${esc(x.kq)}<small>${esc(x.dv)}</small></div>
        <div>
          <h3 class="h-sm">${esc(x.ten)}<span class="tag ${x.muc}">${CHU_TT[x.muc]}</span></h3>
          <div class="nguong">Ngưỡng ${esc(x.ref)}</div>
          <p class="phu">${esc(x.y)}</p>
        </div>
      </article>`).join('')}
    </div>
  </section>

  ${pt.ruiRo}${pt.phanTich}${pt.mucTieu}${pt.loTrinh}${pt.anUong}${pt.khamNgay}

  <section class="khoi">
    <p class="nhan">Toàn bộ xét nghiệm</p>
    <h2 class="h-lg" style="margin-bottom:60px">Từng con số.</h2>
    ${d.nhom.map((n) => `<div class="nhom">
      <div class="nhom-dau"><h3 class="h">${esc(n.ten)}</h3><p class="nhan">${esc(n.nhan)}</p></div>
      ${n.muc.map(hangChiSo).join('')}
    </div>`).join('')}
  </section>

  <section class="khoi">
    <p class="nhan">Chẩn đoán hình ảnh</p>
    <div class="hinh-anh">
      ${d.hinhAnh.map((h) => `<div>
        <h3 class="h">${esc(h.ten)}</h3>
        <p class="ket">${esc(h.ketLuan)}</p>
        <ul>${h.chiTiet.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  </section>

  <section class="khoi">
    <p class="nhan">Phiếu gốc</p>
    <h2 class="h" style="margin-bottom:36px">${d.anh.length} ảnh chụp phiếu.</h2>
    <div class="anh-goc">
      ${d.anh.map((a, i) => `<button type="button" data-anh="${i}"><img src="${a.src}" alt="${esc(a.ten)}"><span>${esc(a.ten)}</span></button>`).join('')}
    </div>
  </section>

  <footer class="chan">
    <p>${esc(d.chuThich)}</p>
    <button class="ghost" type="button" id="nut-khoa-2">Khoá lại</button>
  </footer>`;

  const hs = $('#ho-so');
  hs.innerHTML = html;
  hs.hidden = false;
  $('#man-khoa').hidden = true;
  $('#nut-khoa').hidden = false;
  $('#cho-sao-2').appendChild($('#sao'));
  sao.doKichThuoc();

  hs.querySelectorAll('[data-anh]').forEach((b) => b.addEventListener('click', () => {
    const a = d.anh[Number(b.dataset.anh)];
    $('#anh-lon').src = a.src;
    $('#anh-lon').alt = a.ten;
    $('#chu-anh').textContent = a.ten;
    $('#xem-anh').showModal();
  }));
  $('#nut-khoa-2').addEventListener('click', khoaLai);
  window.scrollTo({ top: 0 });
}

function khoaLai() {
  // Đưa khung vẽ về màn khoá TRƯỚC, rồi mới xoá hẳn nội dung đã giải mã khỏi trang
  $('#cho-sao').appendChild($('#sao'));
  $('#ho-so').innerHTML = '';
  $('#ho-so').hidden = true;
  $('#man-khoa').hidden = false;
  $('#nut-khoa').hidden = true;
  sao.doKichThuoc();
  window.scrollTo({ top: 0 });
  $('#mat-khau').focus();
}

// ---------- Gắn sự kiện ----------
const sao = batSao($('#sao'));
$('#form-mo').addEventListener('submit', (e) => { e.preventDefault(); thuMo(true); });
$('#mat-khau').addEventListener('input', (e) => {
  $('#bao').textContent = '';
  if (e.target.value.trim().length >= DO_DAI_TU_THU) thuMo(false);
});
$('#nut-khoa').addEventListener('click', khoaLai);
$('#dong-anh').addEventListener('click', () => $('#xem-anh').close());
$('#xem-anh').addEventListener('click', (e) => { if (e.target.id === 'xem-anh') e.target.close(); });
taiGoi().catch(() => {}); // tải sẵn trong lúc người dùng gõ
