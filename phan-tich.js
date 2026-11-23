// Các khối báo cáo chi tiết: tổng quan, phân tích, rủi ro, mục tiêu, lộ trình, ăn uống, khi nào đi khám ngay.
// Chỉ dựng HTML từ dữ liệu đã giải mã — không chứa số liệu nào.

const CHU_MUC = { cao: 'Cao', sat: 'Sát mép', ro: 'Cần làm rõ', ok: 'Ổn' };

export function dungPhanTich(d, esc) {
  const ds = (arr, cls = '') => `<ul class="ds ${cls}">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

  const tongQuan = `
  <section class="khoi hai-cot">
    <div><p class="nhan">Bức tranh chung</p><h2 class="h">Khỏe, nhưng<br>cần chỉnh sớm.</h2></div>
    <p class="than lon" style="margin-top:0">${esc(d.tongQuan)}</p>
  </section>`;

  const phanTich = `
  <section class="khoi">
    <p class="nhan">Phân tích chi tiết</p>
    <h2 class="h-lg" style="margin-bottom:60px">Đọc kỹ<br>từng vấn đề.</h2>
    <div class="pt">
      ${d.phanTich.map((p) => `<article class="hai-cot">
        <div>
          <h3 class="h">${esc(p.ten)}<span class="tag ${p.muc}">${CHU_MUC[p.muc]}</span></h3>
          <p class="so-lieu">${esc(p.soLieu)}</p>
        </div>
        <div>${p.doan.map((x) => `<p class="than phu">${esc(x)}</p>`).join('')}</div>
      </article>`).join('')}
    </div>
  </section>`;

  const ruiRo = `
  <section class="khoi">
    <p class="nhan">Cảnh báo rủi ro</p>
    <h2 class="h-lg" style="margin-bottom:60px">${d.ruiRo.length} rủi ro,<br>xếp theo mức.</h2>
    <div class="rr">
      <div class="rr-dau"><span>Rủi ro</span><span>Mức</span><span>Căn cứ</span><span>Nếu bỏ qua</span></div>
      ${d.ruiRo.map((r) => `<div class="rr-hang">
        <h3 class="h-sm">${esc(r.ten)}</h3>
        <div><span class="tag ${r.muc}">${esc(r.mucChu)}</span></div>
        <p class="phu"><span class="rr-nhan">Căn cứ</span>${esc(r.canCu)}</p>
        <p class="mo-nhat"><span class="rr-nhan">Nếu bỏ qua</span>${esc(r.hau)}</p>
      </div>`).join('')}
    </div>
  </section>`;

  const mucTieu = `
  <section class="khoi hai-cot">
    <div><p class="nhan">Mục tiêu</p><h2 class="h">Đích cho lần<br>xét nghiệm tới.</h2></div>
    <div class="mt">
      ${d.mucTieu.map((m) => `<div class="mt-hang">
        <div class="ten">${esc(m.ten)}</div>
        <div class="mt-hien">${esc(m.hienTai)}</div>
        <div class="mt-mui" aria-hidden="true">→</div>
        <div class="mt-dich">${esc(m.mucTieu)}${m.ghi ? `<small>${esc(m.ghi)}</small>` : ''}</div>
      </div>`).join('')}
    </div>
  </section>`;

  const loTrinh = `
  <section class="khoi">
    <p class="nhan">Đề xuất</p>
    <h2 class="h-lg" style="margin-bottom:60px">Lộ trình<br>ba tháng.</h2>
    <ol class="lt">
      ${d.deXuat.map((x) => `<li class="hai-cot">
        <h3 class="h-sm">${esc(x.moc)}</h3>
        ${ds(x.viec)}
      </li>`).join('')}
    </ol>
  </section>`;

  const anUong = `
  <section class="khoi">
    <p class="nhan">Ăn uống</p>
    <div class="hinh-anh">
      <div><h3 class="h">Nên hạn chế</h3>${ds(d.anUong.han, 'han')}</div>
      <div><h3 class="h">Nên dùng</h3>${ds(d.anUong.dung)}</div>
    </div>
  </section>`;

  const khamNgay = `
  <section class="khoi hai-cot">
    <div><p class="nhan">Cảnh báo</p><h2 class="h">Đi khám<br>ngay khi.</h2></div>
    ${ds(d.diKhamNgay, 'gap')}
  </section>`;

  return { tongQuan, phanTich, ruiRo, mucTieu, loTrinh, anUong, khamNgay };
}
