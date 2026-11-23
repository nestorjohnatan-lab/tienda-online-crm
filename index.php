<?php
declare(strict_types=1);

/**
 * Tienda Online & CRM - AutoFrío PRO / Mexora
 * Punto de entrada y verificador de entorno de desarrollo.
 */

// Chequeo ultrarrápido de puertos (non-blocking)
function isPortOpen(string $host, int $port, float $timeout = 0.15): bool {
    $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
    if ($fp) {
        fclose($fp);
        return true;
    }
    return false;
}

$tiendaActive = isPortOpen('127.0.0.1', 5173);
$backendActive = isPortOpen('127.0.0.1', 3100);
$crmActive = isPortOpen('127.0.0.1', 5174);

// Si se solicita redirección forzada inmediata
if (isset($_GET['go']) && $tiendaActive) {
    header('Location: http://localhost:5173/');
    exit;
}
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tienda Online &amp; CRM · AutoFrío PRO (Mexora)</title>
    <style>
        :root {
            --bg-body: #0b0f19;
            --bg-card: #151d2f;
            --border-color: #1e293b;
            --border-subtle: #2d3b55;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --brand-primary: #38bdf8;
            --brand-primary-hover: #0ea5e9;
            --accent-cyan: #0284c7;
            --status-green: #10b981;
            --status-amber: #f59e0b;
            --radius-md: 10px;
            --radius-lg: 14px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-body);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            line-height: 1.5;
        }

        .card {
            background-color: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 2.25rem;
            width: 100%;
            max-width: 580px;
            box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.45);
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1.25rem;
            border-bottom: 1px solid var(--border-color);
        }

        .logo-badge {
            width: 44px;
            height: 44px;
            border-radius: var(--radius-md);
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 1.25rem;
            color: #ffffff;
        }

        h1 {
            font-size: 1.35rem;
            font-weight: 700;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            border-radius: 9999px;
            margin-bottom: 1.25rem;
        }

        .status-pill--active {
            background-color: rgba(16, 185, 129, 0.12);
            color: var(--status-green);
            border: 1px solid rgba(16, 185, 129, 0.25);
        }

        .status-pill--standby {
            background-color: rgba(245, 158, 11, 0.12);
            color: var(--status-amber);
            border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background-color: currentColor;
        }

        p {
            color: var(--text-muted);
            font-size: 0.95rem;
            margin-bottom: 1.25rem;
        }

        .command-box {
            background-color: #080c15;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 0.85rem 1rem;
            margin-bottom: 1.5rem;
            font-family: 'JetBrains Mono', Consolas, monospace;
            font-size: 0.825rem;
            color: #38bdf8;
            overflow-x: auto;
        }

        .command-box span {
            color: #64748b;
            display: block;
            font-size: 0.75rem;
            margin-bottom: 0.35rem;
            font-family: system-ui, sans-serif;
        }

        .actions {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 600;
            border-radius: 8px;
            text-decoration: none;
            transition: all 0.15s ease;
            cursor: pointer;
            border: 1px solid transparent;
        }

        .btn--primary {
            background-color: var(--brand-primary-hover);
            color: #ffffff;
        }

        .btn--primary:hover {
            background-color: var(--accent-cyan);
        }

        .btn--secondary {
            background-color: #101726;
            color: var(--text-main);
            border-color: var(--border-color);
        }

        .btn--secondary:hover {
            background-color: #1a2336;
            border-color: var(--border-subtle);
        }

        .countdown-notice {
            font-size: 0.8rem;
            color: var(--text-muted);
            text-align: center;
            margin-top: 0.75rem;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header-brand">
            <div class="logo-badge">AF</div>
            <div>
                <h1>AutoFrío PRO · Tienda Online</h1>
                <p style="margin: 0; font-size: 0.8rem;">Módulo Frontend y API Integrada con SVA ERP</p>
            </div>
        </div>

        <?php if ($tiendaActive): ?>
            <div class="status-pill status-pill--active">
                <span class="dot"></span> Servidor Vite Activo en Puerto 5173
            </div>
            <p>La vitrina online de AutoFrío PRO está corriendo y conectada a la base de datos <code>test_sva_online</code>.</p>
            <div class="actions">
                <a href="http://localhost:5173/" id="launchBtn" class="btn btn--primary">Abrir Tienda Web (localhost:5173) ↗</a>
                <a href="/nexora/" class="btn btn--secondary">← Volver al Hub NEXORA</a>
            </div>
            <div class="countdown-notice" id="countdownNotice">
                Redirigiendo automáticamente en <strong id="timer">3</strong>s... <a href="#" id="cancelRedirect" style="color: var(--brand-primary); text-decoration: underline;">Cancelar</a>
            </div>
            <script>
                (function() {
                    let seconds = 3;
                    const timerEl = document.getElementById('timer');
                    const noticeEl = document.getElementById('countdownNotice');
                    const cancelBtn = document.getElementById('cancelRedirect');
                    let interval = setInterval(() => {
                        seconds--;
                        if (timerEl) timerEl.textContent = seconds;
                        if (seconds <= 0) {
                            clearInterval(interval);
                            window.location.href = 'http://' + window.location.hostname + ':5173/';
                        }
                    }, 1000);

                    cancelBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        clearInterval(interval);
                        noticeEl.textContent = 'Redirección automática cancelada.';
                    });
                })();
            </script>
        <?php else: ?>
            <div class="status-pill status-pill--standby">
                <span class="dot"></span> Servidor de Desarrollo Vite en Standby
            </div>
            <p>El servidor de desarrollo no está activo en este momento. Para iniciarlo, abre tu terminal y ejecuta:</p>
            
            <div class="command-box">
                <span>1. Iniciar Tienda Web (React + Vite):</span>
                cd /var/www/nexora/tienda-online-crm/tienda &amp;&amp; npm run dev
            </div>

            <div class="command-box">
                <span>2. Iniciar API Backend (Node.js REST):</span>
                cd /var/www/nexora/tienda-online-crm/backend &amp;&amp; npm run dev
            </div>

            <div class="actions">
                <a href="/nexora/" class="btn btn--primary">← Ir al Hub NEXORA Suite</a>
                <a href="/nexora/sva_online/" class="btn btn--secondary">Abrir SVA ERP &amp; POS</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>
