# Hồ sơ sức khỏe

Trang tĩnh GitHub Pages, nội dung **mã hoá**: số liệu chỉ nằm trong `du-lieu.enc.json`
(AES-GCM 256, khoá dẫn từ mật khẩu bằng Argon2id 64 MB × 4 vòng). Mã nguồn trong repo
không chứa số liệu hay thông tin cá nhân nào; giải mã diễn ra trong trình duyệt.

- `index.html`, `app.css`: giao diện
- `app.js`: mở khoá, giải mã, dựng trang
- `sao.js`: chòm hạt hình trái tim
- `lib/argon2.umd.min.js`: hash-wasm (Argon2id)

Cập nhật nội dung: sửa bản nguồn ngoài repo rồi chạy script đóng gói để sinh lại `du-lieu.enc.json`.
