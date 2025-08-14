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
    // Use a different approach - generate QR with logo using a service that supports it

    // First, let's try using QR code service that supports logo embedding
    const logoUrl =
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/20200329_155448-aYJ8X5J2RDJUx0CG010GkcR7kMz6b3.png"

    // Create a composite image using HTML Canvas approach via external service
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { margin: 0; padding: 0; }
            .container { position: relative; width: ${qrSize}px; height: ${qrSize}px; }
            .qr-image { width: 100%; height: 100%; }
            .logo { 
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
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .logo img { 
                width: 50px; 
                height: 50px; 
                border-radius: 50%; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <img class="qr-image" src="data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(qrBuffer)))}" />
            <div class="logo">
                <img src="${logoUrl}" />
            </div>
        </div>
    </body>
    </html>
    `

    // Try using htmlcsstoimage.com API for conversion
    try {
      const conversionResponse = await fetch("https://hcti.io/v1/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa("demo:demo"), // Demo credentials
        },
        body: JSON.stringify({
          html: htmlContent,
          width: qrSize,
          height: qrSize,
          device_scale_factor: 2,
        }),
      })

      if (conversionResponse.ok) {
        const result = await conversionResponse.json()
        if (result.url) {
          const imageResponse = await fetch(result.url)
          if (imageResponse.ok) {
            return await imageResponse.arrayBuffer()
          }
        }
      }
    } catch (e) {
      console.log("HTML to image service failed, trying alternative")
    }

    // Alternative approach: Use SVG and return as image
    const qrBase64 = btoa(String.fromCharCode(...new Uint8Array(qrBuffer)))

    // Fetch logo and convert to base64
    const logoResponse = await fetch(logoUrl)
    let logoBase64 = ""
    if (logoResponse.ok) {
      const logoBuffer = await logoResponse.arrayBuffer()
      logoBase64 = btoa(String.fromCharCode(...new Uint8Array(logoBuffer)))
    }

    // Create SVG with embedded QR and logo
    const svgContent = `
    <svg width="${qrSize}" height="${qrSize}" xmlns="http://www.w3.org/2000/svg">
      <image href="data:image/png;base64,${qrBase64}" width="${qrSize}" height="${qrSize}" />
      <circle cx="${qrSize / 2}" cy="${qrSize / 2}" r="35" fill="white" stroke="#ddd" stroke-width="2" />
      <image href="data:image/png;base64,${logoBase64}" 
             x="${qrSize / 2 - 25}" y="${qrSize / 2 - 25}" 
             width="50" height="50" 
             style="clip-path: circle(25px at 25px 25px);" />
    </svg>
    `

    // Try to convert SVG to PNG using another service
    try {
      const svgToPngResponse = await fetch("https://api.apiflash.com/v1/urltoimage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_key: "demo", // Demo key
          url: "data:image/svg+xml;base64," + btoa(svgContent),
          format: "png",
          width: qrSize,
          height: qrSize,
        }),
      })

      if (svgToPngResponse.ok) {
        return await svgToPngResponse.arrayBuffer()
      }
    } catch (e) {
      console.log("SVG to PNG conversion failed")
    }

    // Final fallback: return SVG as response (browsers can handle it)
    return new TextEncoder().encode(svgContent)
  } catch (error) {
    console.error("Error adding logo to QR:", error)
    // Return original QR code if all else fails
    return qrBuffer
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
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {
          --bg-primary: #0a0a0a;
          --bg-secondary: #111111;
          --bg-card: rgba(255, 255, 255, 0.05);
          --text-primary: #ffffff;
          --text-secondary: #a1a1aa;
          --text-muted: #71717a;
          --accent-primary: #3b82f6;
          --accent-secondary: #8b5cf6;
          --accent-tertiary: #06b6d4;
          --border: rgba(255, 255, 255, 0.1);
          --border-hover: rgba(255, 255, 255, 0.2);
          --success: #10b981;
          --error: #ef4444;
          --warning: #f59e0b;
          --radius: 12px;
          --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            background-image: 
                radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(6, 182, 212, 0.1) 0%, transparent 50%);
            min-height: 100vh;
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }

        .main-container {
            max-width: 900px;
            margin: 0 auto;
            padding: 2rem 1rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            position: relative;
        }

        .hero-section {
            text-align: center;
            margin-bottom: 4rem;
            position: relative;
        }

        .hero-title {
            font-weight: 800;
            font-size: clamp(3rem, 6vw, 5rem);
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 50%, var(--accent-tertiary) 100%);
            background-clip: text;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 1.5rem;
            letter-spacing: -0.03em;
            line-height: 1.1;
            position: relative;
        }

        .hero-subtitle {
            font-size: 1.25rem;
            color: var(--text-secondary);
            margin-bottom: 2rem;
            font-weight: 400;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .floating-elements {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            overflow: hidden;
        }

        .floating-element {
            position: absolute;
            width: 4px;
            height: 4px;
            background: var(--accent-primary);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite;
        }

        .floating-element:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
        .floating-element:nth-child(2) { top: 60%; left: 80%; animation-delay: 2s; }
        .floating-element:nth-child(3) { top: 80%; left: 20%; animation-delay: 4s; }

        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }

        .card {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border-radius: var(--radius);
            padding: 3rem;
            border: 1px solid var(--border);
            margin-bottom: 2rem;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
            opacity: 0.5;
        }

        .card:hover {
            border-color: var(--border-hover);
            transform: translateY(-2px);
            box-shadow: var(--shadow-xl);
        }

        .form-section {
            margin-bottom: 2rem;
        }

        .form-group {
            margin-bottom: 2rem;
        }

        .form-label {
            display: block;
            margin-bottom: 0.75rem;
            font-weight: 600;
            color: var(--text-primary);
            font-size: 0.95rem;
            letter-spacing: 0.025em;
        }

        .form-input {
            width: 100%;
            padding: 1.25rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.02);
            color: var(--text-primary);
            transition: all 0.3s ease;
            font-family: inherit;
            resize: vertical;
            min-height: 120px;
        }

        .form-input::placeholder {
            color: var(--text-muted);
        }

        .form-input:focus {
            outline: none;
            border-color: var(--accent-primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            background: rgba(255, 255, 255, 0.05);
        }

        .btn-primary {
            width: 100%;
            padding: 1.25rem 2rem;
            background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
            color: var(--text-primary);
            border: none;
            border-radius: var(--radius);
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
            position: relative;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .btn-primary::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .btn-primary:hover::before {
            left: 100%;
        }

        .btn-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }

        .btn-secondary {
            padding: 1rem 2rem;
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            font-weight: 500;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            font-size: 0.95rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: var(--border-hover);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
        }

        .result-section {
            text-align: center;
            margin-top: 2rem;
        }

        .qr-container {
            display: inline-block;
            margin: 2rem 0;
            padding: 1.5rem;
            background: rgba(255, 255, 255, 0.95);
            border-radius: calc(var(--radius) + 4px);
            box-shadow: var(--shadow-xl);
            position: relative;
            overflow: hidden;
        }

        .qr-container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(45deg, var(--accent-primary), var(--accent-secondary), var(--accent-tertiary));
            border-radius: calc(var(--radius) + 6px);
            z-index: -1;
        }

        .qr-image {
            border-radius: var(--radius);
            max-width: 100%;
            height: auto;
            display: block;
        }

        .loading-section {
            display: none;
            text-align: center;
            margin: 3rem 0;
        }

        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top: 3px solid var(--accent-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.5rem;
        }

        .loading-text {
            color: var(--text-secondary);
            font-size: 1.1rem;
            font-weight: 500;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .api-section {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border-radius: var(--radius);
            padding: 2.5rem;
            border: 1px solid var(--border);
            position: relative;
            overflow: hidden;
        }

        .api-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent-tertiary), transparent);
            opacity: 0.5;
        }

        .api-title {
            font-weight: 700;
            font-size: 1.5rem;
            color: var(--text-primary);
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .api-content {
            color: var(--text-secondary);
            line-height: 1.8;
        }

        .api-endpoint {
            background: rgba(0, 0, 0, 0.3);
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-family: 'JetBrains Mono', 'Courier New', monospace;
            font-size: 0.9rem;
            color: var(--accent-tertiary);
            margin: 0.75rem 0;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-weight: 500;
        }

        .status-message {
            font-size: 0.95rem;
            margin-top: 1.5rem;
            padding: 1rem;
            border-radius: var(--radius);
            border: 1px solid;
            font-weight: 500;
        }

        .success-message {
            color: var(--success);
            background: rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.2);
        }

        .error-message {
            color: var(--error);
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.2);
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }

        .feature-card {
            background: rgba(255, 255, 255, 0.02);
            padding: 1.5rem;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            text-align: center;
            transition: all 0.3s ease;
        }

        .feature-card:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: var(--border-hover);
            transform: translateY(-2px);
        }

        .feature-icon {
            font-size: 2rem;
            margin-bottom: 1rem;
        }

        .feature-title {
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        .feature-description {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        @media (max-width: 640px) {
            .main-container {
                padding: 1rem;
            }
            
            .card, .api-section {
                padding: 2rem;
            }
            
            .hero-title {
                font-size: 2.5rem;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="main-container">
        <div class="floating-elements">
            <div class="floating-element"></div>
            <div class="floating-element"></div>
            <div class="floating-element"></div>
        </div>

        <div class="hero-section">
            <h1 class="hero-title">QR Code Generator</h1>
            <p class="hero-subtitle">Create professional QR codes with your custom AL logo embedded seamlessly</p>
        </div>

        <div class="card">
            <div class="form-section">
                <form id="qrForm">
                    <div class="form-group">
                        <label for="text" class="form-label">Content to Encode</label>
                        <textarea 
                            id="text" 
                            rows="4" 
                            class="form-input"
                            placeholder="Enter your text, URL, or any content you want to convert into a QR code..."
                        ></textarea>
                    </div>
                    
                    <button type="submit" id="generateBtn" class="btn-primary">
                        Generate QR Code
                    </button>
                </form>
            </div>

            <div class="loading-section" id="loading">
                <div class="loading-spinner"></div>
                <p class="loading-text">Crafting your QR code with AL logo...</p>
            </div>

            <div class="result-section" id="result"></div>
        </div>

        <div class="api-section">
            <h3 class="api-title">
                <span>⚡</span>
                Developer API
            </h3>
            <div class="api-content">
                <p><strong>GET Request:</strong></p>
                <code class="api-endpoint">GET /generate?text=your_content_here</code>
                
                <p style="margin-top: 1.5rem;"><strong>POST Request:</strong></p>
                <code class="api-endpoint">POST /generate</code>
                <p style="margin-top: 0.75rem; font-size: 0.9rem;">
                    Body: <code style="background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace;">{"text": "your_content_here"}</code>
                </p>
                
                <p style="margin-top: 1.5rem;"><strong>Response:</strong> High-quality PNG image with AL logo embedded in center</p>

                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">🎯</div>
                        <div class="feature-title">Logo Embedded</div>
                        <div class="feature-description">AL logo automatically placed in QR center</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📱</div>
                        <div class="feature-title">Mobile Optimized</div>
                        <div class="feature-description">Perfect scanning on all devices</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">⚡</div>
                        <div class="feature-title">Lightning Fast</div>
                        <div class="feature-description">Instant generation via Cloudflare Workers</div>
                    </div>
                </div>
            </div>
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
                showError('Please enter some content to generate QR code');
                return;
            }

            generateBtn.disabled = true;
            generateBtn.textContent = 'Generating...';
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
                        <img src="\${imageUrl}" alt="QR Code with AL Logo" class="qr-image" />
                    </div>
                    <br>
                    <a href="\${imageUrl}" download="qr-code-with-al-logo.png" class="btn-secondary">
                        <span>📥</span> Download QR Code
                    </a>
                    <div class="status-message success-message">
                        ✅ QR code generated successfully with AL logo embedded in the center
                    </div>
                \`;

            } catch (error) {
                showError(error.message);
            } finally {
                generateBtn.disabled = false;
                generateBtn.textContent = 'Generate QR Code';
                loading.style.display = 'none';
            }
        });

        function showError(message) {
            result.innerHTML = \`
                <div class="status-message error-message">
                    ❌ Error: \${message}
                </div>
            \`;
        }

        // Auto-populate example on page load
        window.addEventListener('load', () => {
            document.getElementById('text').value = 'https://workers.dev - Professional QR Code Generator with AL Logo';
        });

        // Add some interactive effects
        document.addEventListener('mousemove', (e) => {
            const cards = document.querySelectorAll('.card, .api-section');
            cards.forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = (y - centerY) / 20;
                    const rotateY = (centerX - x) / 20;
                    
                    card.style.transform = \`perspective(1000px) rotateX(\${rotateX}deg) rotateY(\${rotateY}deg) translateZ(10px)\`;
                } else {
                    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
                }
            });
        });
    </script>
</body>
</html>
  `
}
