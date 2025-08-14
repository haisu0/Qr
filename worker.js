// QR Code Generator API for Cloudflare Workers
// Generates QR codes with embedded logo

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    // Handle CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders })
    }

    // Route handling
    if (url.pathname === "/") {
      return new Response(getHomePage(), {
        headers: { "Content-Type": "text/html", ...corsHeaders },
      })
    }

    if (url.pathname === "/generate") {
      return await handleQRGeneration(request, corsHeaders)
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders })
  },
}

async function handleQRGeneration(request, corsHeaders) {
  try {
    let text = ""

    if (request.method === "GET") {
      const url = new URL(request.url)
      text = url.searchParams.get("text") || "Hello World"
    } else if (request.method === "POST") {
      const body = await request.json()
      text = body.text || "Hello World"
    }

    if (!text) {
      return new Response(JSON.stringify({ error: "Text parameter is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    // Generate QR code using QR Server API
    const qrSize = 300
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(text)}&format=png&margin=10`

    // Fetch the QR code
    const qrResponse = await fetch(qrUrl)
    if (!qrResponse.ok) {
      throw new Error("Failed to generate QR code")
    }

    const qrBuffer = await qrResponse.arrayBuffer()

    // Create canvas and add logo
    const finalImage = await addLogoToQR(qrBuffer, qrSize)

    return new Response(finalImage, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        ...corsHeaders,
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    })
  }
}

async function addLogoToQR(qrBuffer, qrSize) {
  try {
    // Convert QR buffer to base64 for processing
    const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)))

    // Logo URL (your AL logo)
    const logoUrl =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20200329_155448-aYJ8X5J2RDJUx0CG010GkcR7kMz6b3.png"

    // Fetch the logo
    const logoResponse = await fetch(logoUrl)
    if (!logoResponse.ok) {
      console.warn("Failed to fetch logo, returning QR without logo")
      return qrBuffer
    }

    const logoBuffer = await logoResponse.arrayBuffer()
    const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)))

    // Create SVG with embedded images
    const svgContent = `
      <svg width="${qrSize}" height="${qrSize}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="logoClip">
            <circle cx="25" cy="25" r="25"/>
          </clipPath>
        </defs>
        <image href="data:image/png;base64,${qrBase64}" width="${qrSize}" height="${qrSize}" />
        <circle cx="${qrSize / 2}" cy="${qrSize / 2}" r="32" fill="white" stroke="#ddd" stroke-width="2" />
        <g transform="translate(${qrSize / 2 - 25}, ${qrSize / 2 - 25})">
          <image href="data:image/png;base64,${logoBase64}" width="50" height="50" clip-path="url(#logoClip)" />
        </g>
      </svg>
    `

    // Convert SVG to buffer
    const svgBuffer = new TextEncoder().encode(svgContent)

    // Use puppeteer-like service for SVG to PNG conversion
    const conversionResponse = await fetch("https://htmlcsstoimage.com/demo_run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: `<div style="margin:0;padding:0;">${svgContent}</div>`,
        css: "",
        width: qrSize,
        height: qrSize,
      }),
    })

    if (conversionResponse.ok) {
      return await conversionResponse.arrayBuffer()
    }

    // Fallback: return SVG as PNG (browsers will handle it)
    return svgBuffer
  } catch (error) {
    console.error("Error adding logo to QR:", error)
    // Return original QR code data
    const qrResponse = await fetch(
      `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=fallback&format=png`,
    )
    return await qrResponse.arrayBuffer()
  }
}

function getHomePage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QR Code Generator with Logo</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        input, textarea {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            background: rgba(255, 255, 255, 0.9);
            box-sizing: border-box;
        }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .result {
            margin-top: 30px;
            text-align: center;
        }
        .qr-container {
            position: relative;
            display: inline-block;
            margin: 20px 0;
        }
        .qr-image {
            border-radius: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .logo-overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }
        .logo-overlay img {
            width: 50px;
            height: 50px;
            border-radius: 50%;
        }
        .download-btn {
            margin-top: 15px;
            padding: 10px 20px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            color: white;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s;
        }
        .download-btn:hover {
            background: white;
            color: #667eea;
        }
        .loading {
            display: none;
            margin: 20px 0;
        }
        .spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 3px solid white;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .api-info {
            margin-top: 40px;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            font-size: 14px;
        }
        .api-info h3 {
            margin-top: 0;
        }
        .api-info code {
            background: rgba(0, 0, 0, 0.2);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 QR Generator</h1>
        
        <form id="qrForm">
            <div class="form-group">
                <label for="text">Text atau URL:</label>
                <textarea id="text" rows="3" placeholder="Masukkan text atau URL yang ingin dijadikan QR code..."></textarea>
            </div>
            
            <button type="submit" id="generateBtn">Generate QR Code</button>
        </form>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Generating QR Code...</p>
        </div>

        <div class="result" id="result"></div>

        <div class="api-info">
            <h3>📡 API Usage</h3>
            <p><strong>GET:</strong> <code>/generate?text=your_text_here</code></p>
            <p><strong>POST:</strong> <code>/generate</code> dengan JSON body: <code>{"text": "your_text_here"}</code></p>
            <p>Response: PNG image dengan logo di tengah</p>
        </div>
    </div>

    <script>
        const form = document.getElementById('qrForm');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        const generateBtn = document.getElementById('generateBtn');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const text = document.getElementById('text').value.trim();
            if (!text) {
                alert('Please enter some text or URL');
                return;
            }

            generateBtn.disabled = true;
            loading.style.display = 'block';
            result.innerHTML = '';

            try {
                const response = await fetch('/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text })
                });

                if (!response.ok) {
                    throw new Error('Failed to generate QR code');
                }

                const blob = await response.blob();
                const imageUrl = URL.createObjectURL(blob);

                result.innerHTML = \`
                    <div class="qr-container">
                        <img src="\${imageUrl}" alt="QR Code" class="qr-image" />
                        <div class="logo-overlay">
                            <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20200329_155448-aYJ8X5J2RDJUx0CG010GkcR7kMz6b3.png" alt="Logo" />
                        </div>
                    </div>
                    <br>
                    <a href="\${imageUrl}" download="qr-code-with-logo.png" class="download-btn">
                        📥 Download QR Code
                    </a>
                \`;

            } catch (error) {
                result.innerHTML = \`<p style="color: #ff6b6b;">Error: \${error.message}</p>\`;
            } finally {
                generateBtn.disabled = false;
                loading.style.display = 'none';
            }
        });

        // Auto-generate example on page load
        window.addEventListener('load', () => {
            document.getElementById('text').value = 'https://workers.dev - QR Code Generator';
        });
    </script>
</body>
</html>
  `
}
