<?php
require_once 'database.php';
$store_info = getStoreInfo();
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Lex & Nitch Cafe - Welcome</title>
	<link rel="stylesheet" href="styles.css">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
	<!-- Zapier Chatbot Embed -->
	<script async type='module' src='https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js'></script>
	<zapier-interfaces-chatbot-embed is-popup='true' chatbot-id='cmnddnxuj004vsww70w0vvwru'></zapier-interfaces-chatbot-embed>
</head>
<body class="landing-page">
	<div class="landing-container">
		<!-- Header Navigation -->
		<header class="landing-header">
			<div class="header-content">
				<div class="cafe-name">
					<h2>🌿 Lex & Nitch Cafe 🌿</h2>
				</div>
				<div class="hamburger-menu">
					<div class="header-links" style="display:inline-flex;align-items:center;gap:18px;margin-right:18px;">
						<a href="menu.php" class="header-link" style="font-size:1.1rem;color:#fff;">Menu</a>
						<a href="#" class="header-link" style="font-size:1.1rem;color:#fff;" onclick="openAboutModal();return false;">About Us</a>
					</div>
					<button class="hamburger-btn" onclick="toggleQuickLoginMenu()">&#9776;</button>
					<div class="quick-login-menu" id="quickLoginMenu">
						<a href="index.php?page=login" class="quick-login-link">Login</a>
					</div>
				</div>
				<!-- About Us Modal -->
				<div id="aboutModal" style="display:none;position:fixed;z-index:9999;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.35);align-items:center;justify-content:center;">
					<div style="background:#fff;border-radius:16px;max-width:400px;width:90vw;padding:32px 24px;box-shadow:0 8px 32px rgba(0,0,0,0.18);position:relative;">
						<button onclick="closeAboutModal()" style="position:absolute;top:12px;right:16px;font-size:1.3rem;background:none;border:none;cursor:pointer;">✕</button>
						<h2 style="margin-bottom:10px;">About Lex & Nitch Cafe</h2>
						<div id="aboutModalContent">
							<p style="color: #555; line-height: 1.6; margin-bottom: 15px;"><?php echo nl2br(htmlspecialchars($store_info['description'] ?? 'Welcome to Lex & Nitch Cafe! We are currently updating our story.')); ?></p>
							<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
							<div style="color: #444; font-size: 0.95rem; line-height: 1.8;">
								<p><strong>📍 Address:</strong> <?php echo htmlspecialchars($store_info['address'] ?? 'N/A'); ?></p>
								<p><strong>📞 Phone:</strong> <?php echo htmlspecialchars($store_info['phone'] ?? 'N/A'); ?></p>
								<p><strong>📧 Email:</strong> <?php echo htmlspecialchars($store_info['email'] ?? 'N/A'); ?></p>
								<p><strong>🕐 Hours:</strong> <?php echo htmlspecialchars($store_info['hours'] ?? 'N/A'); ?></p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</header>
		<!-- Main Hero Section -->
		<section class="landing-hero">
			<div class="hero-left-circle">
				<div class="circle-frame">
					<img src="/img/c1.jpg" alt="Coffee" class="circle-image">
				</div>
			</div>
			<div class="hero-center">
				<h1>The Best<br><span class="coffee-text">Coffee</span><br>For You</h1>
				<p>Welcome to Lex & Nitch Cafe, where whimsical enchantment meets the calm of nature. Savor perfectly brewed coffee, delightful pastries, and treats crafted with love in our cozy sanctuary. Every sip is a moment of magic.</p>
				<a href="index.php?page=menu" class="btn btn-order">ORDER NOW</a>
			</div>
			<div class="hero-right-circle">
				<div class="circle-frame">
					<img src="/img/c1.jpg" alt="Coffee" class="circle-image">
				</div>
			</div>
		</section>
	</div>
	<script>
		function toggleQuickLoginMenu() {
			var menu = document.getElementById('quickLoginMenu');
			menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
		}
		function openAboutModal() {
			document.getElementById('aboutModal').style.display = 'flex';
		}
		function closeAboutModal() {
			document.getElementById('aboutModal').style.display = 'none';
		}
	</script>

    
</body>
</html>
