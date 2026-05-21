<?php
if (session_status() === PHP_SESSION_NONE) session_start();
require_once 'database.php';

// Menu page should be accessible without login
// If user is logged in, get username; otherwise use "Guest"
$username = $_SESSION['username'] ?? 'Guest';
$user_id = $_SESSION['user_id'] ?? null;

$products = getAllProducts();
$categories = ['coffee', 'cookies', 'pastries', 'desserts'];
$category_names = [
    'coffee' => '☕ Coffee',
    'cookies' => '🍪 Cookies',
    'pastries' => '🥐 Pastries',
    'desserts' => '🍰 Desserts'
];

// Handle add to cart
$cart = isset($_SESSION['cart']) ? $_SESSION['cart'] : [];
$show_receipt = false;
$receipt_data = [];

// Restore receipt from session if redirected back after order
if (isset($_SESSION['pending_receipt'])) {
    $show_receipt = true;
    $receipt_data = $_SESSION['pending_receipt'];
    unset($_SESSION['pending_receipt']);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'add_to_cart') {
        $product_id = (int)$_POST['product_id'];
        $quantity = (int)($_POST['quantity'] ?? 1);
        if (isset($cart[$product_id])) {
            $cart[$product_id]['quantity'] += $quantity;
        } else {
            // Find product
            foreach ($products as $p) {
                if ($p['id'] == $product_id) {
                    $cart[$product_id] = [
                        'id' => $p['id'],
                        'name' => $p['name'],
                        'price' => $p['price'],
                        'image' => $p['image'],
                        'category' => $p['category'],
                        'quantity' => $quantity
                    ];
                    break;
                }
            }
        }
        $_SESSION['cart'] = $cart;
    } elseif ($_POST['action'] === 'remove_from_cart') {
        $product_id = (int)$_POST['product_id'];
        unset($cart[$product_id]);
        $_SESSION['cart'] = $cart;
    } elseif ($_POST['action'] === 'guest_checkout') {
        // Guest checkout - no login required
        $name = trim($_POST['guest_name'] ?? '');
        $address = trim($_POST['guest_address'] ?? '');
        $delivery_date = trim($_POST['delivery_date'] ?? '');
        $delivery_time = trim($_POST['delivery_time'] ?? '');
        $errors = [];
        if (empty($name)) {
            $errors[] = 'Name is required.';
        } elseif (!preg_match('/^[a-zA-Z\s\-\.]{2,100}$/', $name)) {
            $errors[] = 'Name must be 2-100 letters.';
        }
        if (empty($address)) {
            $errors[] = 'Address is required.';
        } elseif (strlen($address) < 5) {
            $errors[] = 'Address must be at least 5 characters.';
        }
        if (empty($delivery_date)) {
            $errors[] = 'Delivery date is required.';
        }
        if (empty($delivery_time)) {
            $errors[] = 'Delivery time is required.';
        }
        if (empty($cart)) {
            $errors[] = 'Your cart is empty.';
        }
        if (empty($errors)) {
            $total = 0;
            $items = [];
            foreach ($cart as $item) {
                $total += $item['price'] * $item['quantity'];
                $items[] = $item;
            }
            $order_id = addGuestOrder($name, $address, $delivery_date, $delivery_time, $items, $total);
            // Prepare receipt data
            $receipt_data = [
                'order_id' => $order_id,
                'guest_name' => $name,
                'guest_address' => $address,
                'delivery_date' => $delivery_date,
                'delivery_time' => $delivery_time,
                'items' => $items,
                'total' => $total,
                'date' => date('Y-m-d H:i:s')
            ];
            $_SESSION['pending_receipt'] = $receipt_data;
            $show_receipt = true;
            unset($_SESSION['cart']);
            $cart = [];
            // Redirect to menu.php so receipt shows on a clean GET request
            header('Location: menu.php');
            exit;
        } else {
            $error = implode(' ', $errors);
        }
    } elseif ($_POST['action'] === 'checkout') {
        // Registered user checkout
        if (!empty($cart)) {
            if ($user_id) {
                $total = 0;
                $items = [];
                foreach ($cart as $item) {
                    $total += $item['price'] * $item['quantity'];
                    $items[] = $item;
                }
                addOrder($user_id, $items, $total);
                unset($_SESSION['cart']);
                $success = 'Order placed successfully!';
                $cart = [];
            }
        }
    }
}

$cart_count = count($cart);
$cart_total = 0;
foreach ($cart as $item) {
    $cart_total += $item['price'] * $item['quantity'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Menu - Lex & Nitch Cafe</title>
    <link rel="stylesheet" href="styles.css">
    <!-- Zapier Chatbot Embed -->
    <script async type='module' src='https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js'></script>
    <zapier-interfaces-chatbot-embed is-popup='true' chatbot-id='cmnddnxuj004vsww70w0vvwru'></zapier-interfaces-chatbot-embed>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <h1 class="logo">☕ Lex & Nitch Cafe</h1>
            <div class="nav-right">
                <span class="user-greeting">Welcome, customer!</span>
                <div class="cart-icon-container">
                    <button class="cart-toggle" onclick="toggleCart()">
                        🛒 Cart <span class="cart-badge"><?php echo $cart_count; ?></span>
                    </button>
                </div>

                    <!-- Zapier Chatbot Embed -->
                    <script async type='module' src='https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js'></script>
<zapier-interfaces-chatbot-embed is-popup='true' chatbot-id='cmnddnxuj004vsww70w0vvwru'></zapier-interfaces-chatbot-embed>
                <?php if ($user_id): ?>
                    <a href="index.php?action=logout" class="btn btn-secondary">Logout</a>
                <?php endif; ?>
                <div class="hamburger-menu">
                    <button class="hamburger-btn" onclick="toggleQuickLoginMenu()">☰</button>
                    <div class="quick-login-menu" id="quickLoginMenu">
                        <a href="index.php?page=landing" class="quick-login-link">Home</a>
                        <a href="#" class="quick-login-link" onclick="openTrackOrderModal();return false;">Track Order</a>
                        <a href="login.php" class="quick-login-link">Login</a>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <div class="menu-container">
        <aside class="sidebar">
            <h2>Categories</h2>
            <div class="category-links">
                <button class="category-btn active" onclick="filterCategory('all', this)">All Products</button>
                <?php foreach ($categories as $cat): ?>
                    <button class="category-btn" onclick="filterCategory('<?php echo $cat; ?>', this)">
                        <?php echo $category_names[$cat]; ?>
                    </button>
                <?php endforeach; ?>
            </div>
        </aside>

        <main class="menu-content">
            <div class="menu-header">
                <h1 class="whimsical-menu-title">Our Menu</h1>
                <p>Freshly made, just for you!</p>
            </div>

            <div class="products-grid" id="productsGrid">
                <?php foreach ($categories as $cat): ?>
                    <div class="category-section" data-category="<?php echo $cat; ?>">
                        <h2 class="category-title"><?php echo $category_names[$cat]; ?></h2>
                        <div class="products-row">
                            <?php 
                            $cat_products = getProductsByCategory($cat); 
                            foreach ($cat_products as $product):
                            ?>
                                <div class="product-card">
                                    <div class="product-image">
                                        <?php
                                            $imgPath = $product['image'] ?? '';
                                            if (!preg_match('#^(?:/|https?://)#i', $imgPath)) {
                                                $imgPath = '/img/' . basename($imgPath);
                                            } elseif (strpos($imgPath, '/img/') !== 0 && strpos($imgPath, 'http') !== 0) {
                                                $imgPath = '/img/' . basename($imgPath);
                                            }
                                        ?>
                                        <img src="<?php echo htmlspecialchars($imgPath); ?>" alt="<?php echo htmlspecialchars($product['name']); ?>">
                                    </div>
                                    <h3><?php echo htmlspecialchars($product['name']); ?></h3>
                                    <p class="product-price">$<?php echo number_format($product['price'], 2); ?></p>
                                    <div class="add-to-cart-form">
                                        <input type="hidden" name="action" value="add_to_cart">
                                        <input type="hidden" name="product_id" value="<?php echo $product['id']; ?>">
                                        <input type="number" name="quantity" min="1" max="10" value="1" class="quantity-input">
                                        <button type="button" class="btn btn-add" onclick="addToCart(this)">Add to Cart</button>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </main>

        <!-- Cart Sidebar -->
        <aside class="cart-sidebar" id="cartSidebar">
            <div class="cart-header">
                <h2>Your Cart</h2>
                <button class="close-btn" onclick="toggleCart()">✕</button>
            </div>

            <div class="cart-items" id="cartItems">
                <?php if (empty($cart)): ?>
                    <p class="empty-cart">Your cart is empty</p>
                <?php else: ?>
                    <?php foreach ($cart as $product_id => $item): ?>
                        <div class="cart-item" data-product-id="<?php echo $product_id; ?>">
                            <div class="item-info">
                                <h4><?php echo htmlspecialchars($item['name']); ?></h4>
                                <p class="item-price">$<?php echo number_format($item['price'], 2); ?> x <?php echo $item['quantity']; ?></p>
                            </div>
                            <button type="button" class="btn-remove" onclick="removeFromCart(<?php echo $product_id; ?>)">Remove</button>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <div class="cart-total" id="cartTotalDiv" style="<?php echo empty($cart) ? 'display:none;' : ''; ?>">
                <h3>Total: $<?php echo number_format($cart_total, 2); ?></h3>
            </div>
            <button type="button" class="btn btn-checkout" id="checkoutBtn" onclick="openCheckoutModal()" style="<?php echo empty($cart) ? 'display:none;' : ''; ?>">Place Order</button>
        </aside>
    </div>

    <!-- Guest Checkout Modal -->
    <div class="checkout-modal" id="checkoutModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Order Information</h2>
                <button class="close-btn" onclick="closeCheckoutModal()">✕</button>
            </div>
            <form method="POST" action="menu.php" class="checkout-form-guest">
                <input type="hidden" name="action" value="guest_checkout">
                <div class="form-group">
                    <label for="guest_name">Your Name *</label>
                    <input type="text" id="guest_name" name="guest_name" required placeholder="Enter your full name">
                </div>
                <div class="form-group">
                    <label for="guest_address">Delivery Address *</label>
                    <textarea id="guest_address" name="guest_address" required placeholder="Enter your delivery address" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="delivery_date">Preferred Delivery Date *</label>
                    <input type="date" id="delivery_date" name="delivery_date" required>
                </div>
                <div class="form-group">
                    <label for="delivery_time">Preferred Time *</label>
                    <select id="delivery_time" name="delivery_time" required>
                        <option value="">Select time slot</option>
                        <option value="06:00-07:00">6:00 AM - 7:00 AM</option>
                        <option value="07:00-08:00">7:00 AM - 8:00 AM</option>
                        <option value="08:00-09:00">8:00 AM - 9:00 AM</option>
                        <option value="09:00-10:00">9:00 AM - 10:00 AM</option>
                        <option value="10:00-11:00">10:00 AM - 11:00 AM</option>
                        <option value="11:00-12:00">11:00 AM - 12:00 PM</option>
                        <option value="12:00-13:00">12:00 PM - 1:00 PM</option>
                        <option value="13:00-14:00">1:00 PM - 2:00 PM</option>
                        <option value="14:00-15:00">2:00 PM - 3:00 PM</option>
                        <option value="15:00-16:00">3:00 PM - 4:00 PM</option>
                        <option value="16:00-17:00">4:00 PM - 5:00 PM</option>
                        <option value="17:00-18:00">5:00 PM - 6:00 PM</option>
                        <option value="18:00-19:00">6:00 PM - 7:00 PM</option>
                        <option value="19:00-20:00">7:00 PM - 8:00 PM</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Payment Method *</label>
                    <div style="display:flex;gap:20px;align-items:center;">
                        <label><input type="radio" name="payment_method" value="cod" checked> Cash on Delivery</label>
                        <label><input type="radio" name="payment_method" value="gcash"> GCash</label>
                    </div>
                    <div id="gcash-warning" style="color:#e53935;font-weight:bold;display:none;margin-top:8px;">Not available at the moment</div>
                </div>
                <div class="form-group">
                    <h4>Order Summary</h4>
                    <div class="order-summary">
                        <?php foreach ($cart as $item): ?>
                            <div class="summary-item">
                                <span><?php echo htmlspecialchars($item['name']) . ' x ' . $item['quantity']; ?></span>
                                <span>$<?php echo number_format($item['price'] * $item['quantity'], 2); ?></span>
                            </div>
                        <?php endforeach; ?>
                        <div class="summary-total">
                            <strong>Total: $<?php echo number_format($cart_total, 2); ?></strong>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeCheckoutModal()">Cancel</button>
                    <button type="submit" class="btn btn-checkout">Confirm Order</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Receipt Modal -->
    <?php if ($show_receipt): ?>
    <div class="receipt-modal modal-display" id="receiptModal" style="display:flex;">
        <div class="receipt-content">
            <div class="receipt-header">
                <h1>Order Receipt</h1>
                <p>Thank you for your order!</p>
            </div>
            <div class="receipt-body">
                <div class="receipt-section">
                    <h3>Order Details</h3>
                    <p><strong>Order ID:</strong> #<?php echo str_pad($receipt_data['order_id'], 5, '0', STR_PAD_LEFT); ?></p>
                    <p><strong>Order Date:</strong> <?php echo date('M d, Y \a\t h:i A', strtotime($receipt_data['date'])); ?></p>
                </div>
                <div class="receipt-section">
                    <h3>Customer Information</h3>
                    <p><strong>Name:</strong> <?php echo htmlspecialchars($receipt_data['guest_name']); ?></p>
                    <p><strong>Delivery Address:</strong> <?php echo htmlspecialchars($receipt_data['guest_address']); ?></p>
                    <p><strong>Preferred Delivery Time:</strong> <?php echo htmlspecialchars($receipt_data['delivery_time']); ?></p>
                </div>
                <div class="receipt-section">
                    <h3>Items Ordered</h3>
                    <table class="receipt-items">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($receipt_data['items'] as $item): ?>
                            <tr>
                                <td><?php echo htmlspecialchars($item['name']); ?></td>
                                <td><?php echo $item['quantity']; ?></td>
                                <td>$<?php echo number_format($item['price'], 2); ?></td>
                                <td>$<?php echo number_format($item['price'] * $item['quantity'], 2); ?></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <div class="receipt-section">
                    <h3>Total Amount</h3>
                    <p class="receipt-total">$<?php echo number_format($receipt_data['total'], 2); ?></p>
                </div>
                <div class="receipt-message">
                    <p>Your order has been received and will be prepared shortly.</p>
                    <p>Delivery tracking information will be available on the main menu page.</p>
                </div>
            </div>
            <div class="receipt-footer">
                <a href="index.php?page=menu" class="btn btn-primary">Return to Menu</a>
                <button onclick="printReceipt()" class="btn btn-secondary">Print Receipt</button>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <!-- Track Order Modal -->
    <div class="checkout-modal" id="trackOrderModal" style="display:none;align-items:center;justify-content:center;">
        <div class="modal-content" style="max-width:400px;">
            <div class="modal-header">
                <h2>Track Your Order</h2>
                <button class="close-btn" onclick="closeTrackOrderModal()">✕</button>
            </div>
            <form id="trackOrderForm" onsubmit="submitTrackOrder(event)">
                <div class="form-group">
                    <label for="track_order_id">Enter Order ID</label>
                    <input type="text" id="track_order_id" name="order_id" required placeholder="e.g. 00001">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeTrackOrderModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Track</button>
                </div>
            </form>
            <div id="trackOrderResult" style="margin-top:18px;"></div>
        </div>
    </div>

    <script>
        // Track Order Modal logic
        function openTrackOrderModal() {
            document.getElementById('trackOrderModal').style.display = 'flex';
            document.getElementById('trackOrderResult').innerHTML = '';
            document.getElementById('track_order_id').value = '';
        }
        function closeTrackOrderModal() {
            document.getElementById('trackOrderModal').style.display = 'none';
        }
        function submitTrackOrder(event) {
            event.preventDefault();
            const orderId = document.getElementById('track_order_id').value.trim();
            if (!orderId) return;
            const resultDiv = document.getElementById('trackOrderResult');
            resultDiv.innerHTML = '<span style="color:#888;">Checking order status...</span>';
            fetch('track_order.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'order_id=' + encodeURIComponent(orderId)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    resultDiv.innerHTML = `
                        <div style="padding:10px 0;">
                            <strong>Status:</strong> <span style="color:#2196F3;font-weight:bold;">${data.status}</span><br>
                            <strong>Date:</strong> ${data.date}<br>
                            <strong>Total:</strong> $${parseFloat(data.total).toFixed(2)}
                        </div>
                        <div><strong>Items:</strong><ul style="padding-left:18px;">${data.items.map(i => `<li>${i.name} x${i.quantity}</li>`).join('')}</ul></div>
                    `;
                } else {
                    resultDiv.innerHTML = `<span style='color:#e53935;'>${data.message}</span>`;
                }
            })
            .catch(() => {
                resultDiv.innerHTML = '<span style="color:#e53935;">Error fetching order status.</span>';
            });
        }
        function toggleCart() {
            const cartSidebar = document.getElementById('cartSidebar');
            cartSidebar.classList.toggle('open');
        }

        function openCheckoutModal() {
            // Set min date for delivery (today)
            const deliveryDateInput = document.getElementById('delivery_date');
            if (deliveryDateInput) {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const minDate = `${yyyy}-${mm}-${dd}`;
                deliveryDateInput.min = minDate;
                if (!deliveryDateInput.value) deliveryDateInput.value = minDate;
            }

            // Read cart items using correct selectors (h4 for name, p.item-price for price+qty)
            const cartItems = document.querySelectorAll('#cartItems .cart-item');
            const cartTotalEl = document.querySelector('#cartTotalDiv h3');

            if (!cartItems.length || !cartTotalEl) {
                showNotification('Your cart is empty!', 'error');
                return;
            }

            const cartTotal = parseFloat(cartTotalEl.textContent.replace('Total: $', ''));
            const summaryContainer = document.querySelector('.order-summary');
            summaryContainer.innerHTML = '';

            cartItems.forEach(item => {
                const name      = item.querySelector('.item-info h4').textContent.trim();
                const priceQty  = item.querySelector('.item-info .item-price').textContent.trim();
                // format: "$12.00 x 2"
                const parts     = priceQty.split(' x ');
                const price     = parseFloat(parts[0].replace('$', '')) || 0;
                const qty       = parseInt(parts[1]) || 1;

                const summaryItem = document.createElement('div');
                summaryItem.className = 'summary-item';
                summaryItem.innerHTML = `
                    <span>${name} x${qty}</span>
                    <span>$${(price * qty).toFixed(2)}</span>
                `;
                summaryContainer.appendChild(summaryItem);
            });

            const totalDiv = document.createElement('div');
            totalDiv.className = 'summary-total';
            totalDiv.innerHTML = `<strong>Total: $${cartTotal.toFixed(2)}</strong>`;
            summaryContainer.appendChild(totalDiv);

            const modal = document.getElementById('checkoutModal');
            modal.style.display = 'flex';
            modal.classList.add('open');
        }
        // Payment method logic for GCash warning (no preventDefault, just warning)
        document.addEventListener('DOMContentLoaded', function() {
            const gcashRad = document.querySelector('input[name="payment_method"][value="gcash"]');
            const codRad = document.querySelector('input[name="payment_method"][value="cod"]');
            const gcashWarn = document.getElementById('gcash-warning');
            if (gcashRad && gcashWarn && codRad) {
                gcashRad.addEventListener('change', function() {
                    if (gcashRad.checked) {
                        gcashWarn.style.display = '';
                    }
                });
                codRad.addEventListener('change', function() {
                    if (codRad.checked) {
                        gcashWarn.style.display = 'none';
                    }
                });
            }
        });

        function closeCheckoutModal() {
            const modal = document.getElementById('checkoutModal');
            modal.style.display = 'none';
            modal.classList.remove('open');
        }

        function printReceipt() {
            window.print();
        }

        function filterCategory(category, btn) {
            const sections = document.querySelectorAll('.category-section');
            const buttons  = document.querySelectorAll('.category-btn');

            buttons.forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');

            sections.forEach(section => {
                section.style.display =
                    (category === 'all' || section.getAttribute('data-category') === category)
                    ? 'block' : 'none';
            });
        }

        // Close cart when clicking outside
        document.addEventListener('click', function(event) {
            const cartSidebar = document.getElementById('cartSidebar');
            const cartToggle = document.querySelector('.cart-toggle');
            if (!cartSidebar.contains(event.target) && !cartToggle.contains(event.target)) {
                cartSidebar.classList.remove('open');
            }
        });

        // Add to Cart via AJAX
        function addToCart(button) {
            const container = button.closest('.add-to-cart-form');
            const productId = container.querySelector('input[name="product_id"]').value;
            const quantity = container.querySelector('input[name="quantity"]').value;
            const productName = button.closest('.product-card').querySelector('h3').textContent;

            // Create flying animation element
            const productCard = button.closest('.product-card');
            const cardRect = productCard.getBoundingClientRect();
            const cartButton = document.querySelector('.cart-toggle');
            const cartRect = cartButton.getBoundingClientRect();
            
            // Flying cart emoji animation
            const flyElement = document.createElement('div');
            flyElement.style.cssText = `
                position: fixed;
                left: ${cardRect.left + cardRect.width / 2}px;
                top: ${cardRect.top + cardRect.height / 2}px;
                font-size: 1.8rem;
                pointer-events: none;
                z-index: 9998;
                transition: left .5s ease-in, top .5s ease-in, opacity .5s ease-in, transform .5s ease-in;
            `;
            flyElement.textContent = '🛒';
            document.body.appendChild(flyElement);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    flyElement.style.left   = `${cartRect.left + cartRect.width / 2}px`;
                    flyElement.style.top    = `${cartRect.top  + cartRect.height / 2}px`;
                    flyElement.style.opacity = '0';
                    flyElement.style.transform = 'scale(0.3)';
                });
            });
            setTimeout(() => flyElement.remove(), 550);

            const formData = new FormData();
            formData.append('action', 'add_to_cart');
            formData.append('product_id', productId);
            formData.append('quantity', quantity);

            fetch('cart_handler.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update cart badge with pulse animation
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) {
                        cartBadge.textContent = data.cart_count;
                        cartBadge.style.animation = 'none';
                        setTimeout(() => {
                            cartBadge.style.animation = 'pulse 0.5s ease-in-out';
                        }, 10);
                    }
                    
                    // Add item to cart display
                    const cartItems = document.getElementById('cartItems');
                    if (cartItems) {
                        // Remove empty cart message if exists
                        const emptyCart = cartItems.querySelector('.empty-cart');
                        if (emptyCart) emptyCart.remove();

                        // Check if item already in cart — update quantity using server's cart data
                        const existingItem = cartItems.querySelector(`[data-product-id="${productId}"]`);
                        if (existingItem) {
                            // data.cart contains the updated cart from server; use that quantity
                            const newQty = data.new_quantity;
                            const priceEl = existingItem.querySelector('.item-price');
                            priceEl.textContent = `$${parseFloat(data.product.price).toFixed(2)} x ${newQty}`;
                        } else {
                            const cartItem = document.createElement('div');
                            cartItem.className = 'cart-item';
                            cartItem.setAttribute('data-product-id', productId);
                            cartItem.style.animation = 'slideInLeft 0.4s ease-out';
                            cartItem.innerHTML = `
                                <div class="item-info">
                                    <h4>${data.product.name}</h4>
                                    <p class="item-price">$${parseFloat(data.product.price).toFixed(2)} x ${data.quantity}</p>
                                </div>
                                <button type="button" class="btn-remove" onclick="removeFromCart(${productId})">Remove</button>
                            `;
                            cartItems.appendChild(cartItem);
                        }

                        // Update cart total
                        const cartTotalDiv = document.getElementById('cartTotalDiv');
                        const cartTotalEl  = cartTotalDiv ? cartTotalDiv.querySelector('h3') : null;
                        if (cartTotalEl) {
                            cartTotalEl.textContent = `Total: $${data.cart_total.toFixed(2)}`;
                            cartTotalDiv.style.display = '';
                        }

                        // Show Place Order button
                        const checkoutBtn = document.getElementById('checkoutBtn');
                        if (checkoutBtn) checkoutBtn.style.display = '';
                    }
                    
                    // Show success message
                    showNotification(data.message);
                    
                    // Reset quantity input
                    container.querySelector('input[name="quantity"]').value = '1';
                } else {
                    showNotification('Error: ' + data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showNotification('Error adding item to cart', 'error');
            });
        }

        // Show notification toast
        function showNotification(message, type = 'success') {
            // Remove any existing toast
            document.querySelectorAll('.toast-notification').forEach(n => n.remove());

            const toast = document.createElement('div');
            toast.className = 'toast-notification';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 90px;
                right: 20px;
                background: ${type === 'success' ? '#4CAF50' : '#e53935'};
                color: #fff;
                padding: 14px 20px;
                border-radius: 10px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.25);
                font-size: .95rem;
                font-weight: 600;
                z-index: 9999;
                opacity: 0;
                transform: translateX(60px);
                transition: opacity .3s ease, transform .3s ease;
                pointer-events: none;
                max-width: 280px;
            `;
            document.body.appendChild(toast);

            // Trigger slide-in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    toast.style.opacity = '1';
                    toast.style.transform = 'translateX(0)';
                });
            });

            // Slide-out and remove after 3s
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(60px)';
                setTimeout(() => toast.remove(), 320);
            }, 3000);
        }

        // Remove from Cart via AJAX
        function removeFromCart(productId) {
            const formData = new FormData();
            formData.append('action', 'remove_from_cart');
            formData.append('product_id', productId);

            fetch('cart_handler.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update badge
                    const cartBadge = document.querySelector('.cart-badge');
                    if (cartBadge) cartBadge.textContent = data.cart_count;

                    // Animate-out and remove item row
                    const itemEl = document.querySelector(`#cartItems [data-product-id="${productId}"]`);
                    if (itemEl) {
                        itemEl.style.transition = 'opacity .25s, transform .25s';
                        itemEl.style.opacity = '0';
                        itemEl.style.transform = 'translateX(30px)';
                        setTimeout(() => {
                            itemEl.remove();

                            // Check remaining items
                            const remaining = document.querySelectorAll('#cartItems .cart-item');
                            if (remaining.length === 0) {
                                // Show empty message
                                const cartItems = document.getElementById('cartItems');
                                cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';

                                // Hide total and Place Order button
                                const cartTotalDiv = document.getElementById('cartTotalDiv');
                                if (cartTotalDiv) cartTotalDiv.style.display = 'none';
                                const checkoutBtn = document.getElementById('checkoutBtn');
                                if (checkoutBtn) checkoutBtn.style.display = 'none';
                            } else {
                                // Update total
                                const cartTotalEl = document.querySelector('#cartTotalDiv h3');
                                if (cartTotalEl) cartTotalEl.textContent = `Total: $${data.cart_total.toFixed(2)}`;
                            }
                        }, 280);
                    }

                    showNotification(data.message);
                } else {
                    showNotification('Error: ' + data.message, 'error');
                }
            })
            .catch(() => showNotification('Error removing item', 'error'));
        }

        function toggleQuickLoginMenu() {
            const menu = document.getElementById('quickLoginMenu');
            menu.classList.toggle('active');
        }

        // Close hamburger menu when clicking outside
        document.addEventListener('click', function(event) {
            const menu = document.getElementById('quickLoginMenu');
            const hamburger = document.querySelector('.hamburger-menu');
            if (hamburger && !hamburger.contains(event.target) && menu.classList.contains('active')) {
                menu.classList.remove('active');
            }
        });

        // Close modal when clicking outside the modal content
        const checkoutModal = document.getElementById('checkoutModal');
        if (checkoutModal) {
            window.addEventListener('click', function(event) {
                if (event.target === checkoutModal) {
                    closeCheckoutModal();
                }
            });
        }

        // Close receipt modal when clicking outside
        const receiptModal = document.getElementById('receiptModal');
        if (receiptModal) {
            window.addEventListener('click', function(event) {
                if (event.target === receiptModal) {
                    // Don't close on click for receipt - only via button
                }
            });
        }
    </script>

  
</body>
    
</body>
</html>