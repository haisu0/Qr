# QR Code Generator API for Cloudflare Workers

API pembuat QR code dengan logo custom yang dapat di-deploy ke workers.dev.

## 🚀 Deployment

1. Install Wrangler CLI:
\`\`\`bash
npm install -g wrangler
\`\`\`

2. Login ke Cloudflare:
\`\`\`bash
wrangler login
\`\`\`

3. Deploy worker:
\`\`\`bash
wrangler deploy
\`\`\`

## 📱 Penggunaan

### Web Interface
Akses worker URL Anda di browser untuk menggunakan interface web.

### API Endpoints

**GET Request:**
\`\`\`
https://your-worker.workers.dev/generate?text=Hello%20World
\`\`\`

**POST Request:**
\`\`\`bash
curl -X POST https://your-worker.workers.dev/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "https://example.com"}'
\`\`\`

## ✨ Fitur

- ✅ Generate QR code dari text/URL
- ✅ Logo custom di tengah QR code
- ✅ Interface web yang responsive
- ✅ API REST yang mudah digunakan
- ✅ CORS enabled
- ✅ Download QR code sebagai PNG
- ✅ Mobile-friendly

## 🎨 Customization

Logo dapat diganti dengan mengedit URL di dalam kode:
\`\`\`javascript
// Ganti URL logo di sini
<img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20200329_155448-aYJ8X5J2RDJUx0CG010GkcR7kMz6b3.png" alt="Logo" />
\`\`\`

## 📝 Response Format

API mengembalikan image PNG dengan:
- QR code berukuran 300x300 pixel
- Logo di tengah dengan background putih bulat
- Format PNG dengan transparansi
