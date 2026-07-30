<?php
session_start();

// Načtení centrálního registru tokenů
$registryFile = __DIR__ . '/registry.json';
$registry = file_exists($registryFile) ? json_decode(file_get_contents($registryFile), true) : [];

// Získání tokenu z URL (?t=zen-a9d4f8e2 nebo ?token=...)
$token = isset($_GET['t']) ? trim($_GET['t']) : (isset($_GET['token']) ? trim($_GET['token']) : '');

if (!empty($token) && isset($registry[$token])) {
    // Platný token – nastavení autorizace do session a přesměrování na dokumentační centrum
    $_SESSION['auth_token_' . $token] = true;
    setcookie('fn_auth_' . $token, '1', time() + (86400 * 365), '/'); // Platnost 1 rok
    
    $targetDir = $registry[$token]['target'];
    header("Location: /d/" . $targetDir . "/?auth=1");
    exit;
}

// Pokud uživatel přišel bez platného tokenu
header("HTTP/1.1 403 Forbidden");
?>
<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>Přístup vyhrazen — Felis Noetica</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,400;0,500;1,6..72,300;1,400;1,500&display=swap" rel="stylesheet">
<style>
  :root {
    --text-hlavni: #2E2B27;
    --text-tichy: #6B655D;
    --akcent: #8B7355;
    --bg-papir: #FDFBF7;
    --linka: #E8E2D8;
  }
  body {
    margin: 0;
    padding: 40px 20px;
    background-color: #EFECE6;
    font-family: 'Newsreader', Georgia, serif;
    color: var(--text-hlavni);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
  }
  .denied-box {
    max-width: 520px;
    background-color: var(--bg-papir);
    padding: 40px 35px;
    border-radius: 8px;
    border: 1px solid var(--akcent);
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    text-align: center;
  }
  .logo { width: 100px; opacity: 0.8; margin-bottom: 15px; }
  h1 { font-size: 18pt; color: var(--akcent); margin: 10px 0 5px; font-weight: 400; }
  p { font-size: 11pt; line-height: 1.6; color: var(--text-hlavni); margin-bottom: 15px; }
  .tichy { font-size: 9.5pt; color: var(--text-tichy); border-top: 1px solid var(--linka); padding-top: 15px; margin-top: 20px; }
  a { color: var(--akcent); text-decoration: none; font-weight: 500; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>

<div class="denied-box">
  <img src="https://felisnoetica.cz/assets/images/logo-znacka.png" alt="Felis Noetica logo" class="logo">
  <h1>🔒 Přístup vyhrazen pro majitele koťat</h1>
  <p>Tento dokumentační sekční prostor je určen výhradně pro registrované majitele koťat a členy chovného programu <strong>Felis Noetica</strong>.</p>
  <p>Obsah je přístupný pouze přes osobní autorizovaný odkaz zaslaný chovatelem.</p>
  
  <div class="tichy">
    Pokud jste majitelem a nemáte svůj přístupový odkaz, kontaktujte nás na <a href="mailto:info@felisnoetica.cz">info@felisnoetica.cz</a> nebo navštivte hlavní stránku <a href="https://felisnoetica.cz">felisnoetica.cz</a>.
  </div>
</div>

</body>
</html>
