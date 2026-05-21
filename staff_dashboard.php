<?php
if (session_status() === PHP_SESSION_NONE) session_start();
include 'database.php';
// Check if user is staff
if (!isset($_SESSION['user_id'])) {
    header('Location: index.php?page=login');
    exit;
}

$user = getUserById($_SESSION['user_id']);
if (!$user || $user['role'] !== 'staff') {
    header('Location: index.php?page=landing');
    exit;
}

// Handle order status update
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'update_status') {
        $order_id = intval($_POST['order_id']);
        $status = $_POST['status'];
        // Validate status (add 'cancelled')
        if (in_array($status, ['pending', 'going', 'ongoing', 'delivered', 'cancelled'])) {
            updateOrderStatus($order_id, $status);
            $success_message = "Order status updated successfully!";
        } else {
            $success_message = "Invalid status value.";
        }
    }

    if ($_POST['action'] === 'update_store') {
        $store = getStoreInfo();
        $store['name'] = trim($_POST['store_name']);
        $store['email'] = trim($_POST['store_email']);
        $store['phone'] = trim($_POST['store_phone']);
        $store['address'] = trim($_POST['store_address']);
        $store['hours'] = trim($_POST['store_hours']);
        $store['description'] = trim($_POST['store_description']);
        $errors = [];
        if (empty($store['name'])) {
            $errors[] = 'Store name is required.';
        }
        if (empty($store['email'])) {
            $errors[] = 'Email is required.';
        } elseif (!filter_var($store['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format.';
        }
        if (!empty($store['phone']) && !preg_match('/^\+?[0-9\-\s]{7,20}$/', $store['phone'])) {
            $errors[] = 'Invalid phone number format.';
        }
        if (empty($store['address'])) {
            $errors[] = 'Address is required.';
        }
        if (empty($store['hours'])) {
            $errors[] = 'Business hours are required.';
        }
        if (empty($store['description'])) {
            $errors[] = 'Description is required.';
        }
        if (!empty($errors)) {
            $store_success = implode(' ', $errors);
        } else {
            updateStoreInfo($store);
            $store_success = "Store information updated successfully!";
        }
    }
}

// Get orders and store info
$orders = getAllOrders();
$store = getStoreInfo();

// Calculate order status counts and total sales
$pending_count = 0;
$ongoing_count = 0;
$delivered_count = 0;
$cancelled_count = 0;
$total_sales = 0;
if (!is_array($orders)) {
    $orders = [];
}
// Remove duplicate order IDs and ensure all unique order IDs are shown
$unique_orders = [];
$seen_ids = [];
foreach ($orders as $order) {
    // Count order status and sales
    $status = strtolower($order['status']);
    if ($status === 'pending') {
        $pending_count++;
    } elseif ($status === 'ongoing' || $status === 'going') {
        $ongoing_count++;
    } elseif ($status === 'delivered') {
        $delivered_count++;
        $total_sales += floatval($order['total']);
    } elseif ($status === 'cancelled') {
        $cancelled_count++;
    }
    // Deduplicate orders
    if (!in_array($order['id'], $seen_ids)) {
        $user_info = null;
        foreach (getAllUsers() as $u) {
            if ($u['id'] == $order['user_id']) {
                $user_info = $u;
                break;
            }
        }
        $order['user_info'] = $user_info;
        $unique_orders[] = $order;
        $seen_ids[] = $order['id'];
    }
}
$orders = $unique_orders;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Dashboard - Lex & Nitch Cafe</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="dashboard-page">
    <div class="dashboard-container">
        <!-- Sidebar Navigation -->
        <aside class="dashboard-sidebar">
            <div class="sidebar-header">
                <h2>☕ Staff</h2>
                <p><?php echo htmlspecialchars($user['username']); ?></p>
            </div>
            <nav class="sidebar-nav">
                <a href="#orders-section" class="nav-link active" onclick="showSection('orders')">
                    <i class="fas fa-list"></i> Orders
                </a>
                <a href="#store-section" class="nav-link" onclick="showSection('store')">
                    <i class="fas fa-store"></i> Store Info
                </a>
                <a href="index.php?action=logout" class="nav-link logout">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </nav>
        </aside>

        <!-- Main Content -->
        <main class="dashboard-content">
            <!-- Navbar -->
            <nav class="navbar admin-navbar">
                <div class="nav-container">
                    <h1 class="logo">Lex & Nitch Cafe - Staff Dashboard</h1>
                    <div class="user-info">
                        <span>Welcome, <?php echo htmlspecialchars($user['username']); ?></span>
                    </div>
                </div>
            </nav>

            <!-- Content Sections -->
            <div class="dashboard-sections">
                <div class="summary-cards" style="display:flex;gap:18px;margin:32px 0 24px 0;">
                    <div class="summary-card" style="background:#FFD600;color:#333;border-radius:10px;padding:18px 28px;min-width:160px;flex:1;">
                        <div style="font-size:1.1em;font-weight:bold;">Pending</div>
                        <div style="font-size:2em;font-weight:bold;"><?php echo $pending_count; ?></div>
                    </div>
                    <div class="summary-card" style="background:#2196F3;color:#fff;border-radius:10px;padding:18px 28px;min-width:160px;flex:1;">
                        <div style="font-size:1.1em;font-weight:bold;">Ongoing</div>
                        <div style="font-size:2em;font-weight:bold;"><?php echo $ongoing_count; ?></div>
                    </div>
                    <div class="summary-card" style="background:#43A047;color:#fff;border-radius:10px;padding:18px 28px;min-width:160px;flex:1;">
                        <div style="font-size:1.1em;font-weight:bold;">Delivered</div>
                        <div style="font-size:2em;font-weight:bold;"><?php echo $delivered_count; ?></div>
                    </div>
                    <div class="summary-card" style="background:#E53935;color:#fff;border-radius:10px;padding:18px 28px;min-width:160px;flex:1;">
                        <div style="font-size:1.1em;font-weight:bold;">Cancelled</div>
                        <div style="font-size:2em;font-weight:bold;"><?php echo $cancelled_count; ?></div>
                    </div>
                    <div class="summary-card" style="background:#263A10;color:#C0E89C;border-radius:10px;padding:18px 28px;min-width:160px;flex:1;">
                        <div style="font-size:1.1em;font-weight:bold;">Total Sales</div>
                        <div style="font-size:2em;font-weight:bold;">$<?php echo number_format($total_sales, 2); ?></div>
                    </div>
                </div>

                <!-- Orders Section -->
                <section id="orders-section" class="section-content active">
                    <div class="section-header">
                        <h2><i class="fas fa-list"></i> Manage Orders</h2>
                        <p>View and update order statuses</p>
                    </div>
                    <?php if (isset($success_message)): ?>
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i> <?php echo $success_message; ?>
                        </div>
                    <?php endif; ?>

                    <div class="table-responsive">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th>Total</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (count($orders) > 0): ?>
                                    <?php foreach ($orders as $order): ?>
                                        <tr>
                                            <td>#<?php echo $order['id']; ?></td>
                                            <td>
                                                <?php 
                                                if ($order['user_info']) {
                                                    echo htmlspecialchars($order['user_info']['username']);
                                                } elseif (!empty($order['guest_name'])) {
                                                    echo htmlspecialchars($order['guest_name']);
                                                } else {
                                                    echo 'Unknown User';
                                                }
                                                ?>
                                            </td>
                                            <td>
                                                <small>
                                                    <?php 
                                                    $items_display = [];
                                                    if (is_array($order['items'])) {
                                                        foreach ($order['items'] as $item_id => $item_data) {
                                                            if (is_array($item_data)) {
                                                                $name = isset($item_data['name']) ? $item_data['name'] : (isset($item_data['product_name']) ? $item_data['product_name'] : (isset($item_data['title']) ? $item_data['title'] : 'Unknown'));
                                                                $qty = isset($item_data['quantity']) ? $item_data['quantity'] : 1;
                                                                $items_display[] = htmlspecialchars($name) . ' x' . $qty;
                                                            }
                                                        }
                                                    }
                                                    echo implode(', ', $items_display);
                                                    ?>
                                                </small>
                                            </td>
                                            <td>$<?php echo number_format($order['total'], 2); ?></td>
                                            <td><?php echo date('M d, Y H:i', strtotime($order['date'])); ?></td>
                                            <td>
                                                <span class="status-badge status-<?php echo strtolower($order['status']); ?>">
                                                    <?php echo ($order['status'] == 'cancelled') ? 'Cancelled' : ucfirst($order['status']); ?>
                                                </span>
                                            </td>
                                            <td>
                                                <form method="POST" class="inline-form">
                                                    <input type="hidden" name="action" value="update_status">
                                                    <input type="hidden" name="order_id" value="<?php echo $order['id']; ?>">
                                                    <select name="status" onchange="this.form.submit()" class="status-select">
                                                        <option value="pending" <?php echo $order['status'] == 'pending' ? 'selected' : ''; ?>>Pending</option>
                                                        <option value="going" <?php echo $order['status'] == 'going' ? 'selected' : ''; ?>>Going</option>
                                                        <option value="ongoing" <?php echo $order['status'] == 'ongoing' ? 'selected' : ''; ?>>Ongoing</option>
                                                        <option value="delivered" <?php echo $order['status'] == 'delivered' ? 'selected' : ''; ?>>Delivered</option>
                                                        <option value="cancelled" <?php echo $order['status'] == 'cancelled' ? 'selected' : ''; ?>>Cancel</option>
                                                    </select>
                                                </form>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <tr>
                                        <td colspan="7" class="text-center">No orders yet</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- Store Info Section -->
                <section id="store-section" class="section-content">
                    <div class="section-header">
                        <h2><i class="fas fa-store"></i> Manage Store Information</h2>
                        <p>Update store details</p>
                    </div>

                    <?php if (isset($store_success)): ?>
                        <div class="alert alert-success">
                            <i class="fas fa-check-circle"></i> <?php echo $store_success; ?>
                        </div>
                    <?php endif; ?>

                    <div class="content-grid">
                        <div class="form-section">
                            <h3>Store Details</h3>
                            <form method="POST" class="form">
                                <input type="hidden" name="action" value="update_store">
                                
                                <div class="form-group">
                                    <label for="store_name">Store Name</label>
                                    <input type="text" id="store_name" name="store_name" value="<?php echo htmlspecialchars($store['name']); ?>" required>
                                </div>

                                <div class="form-group">
                                    <label for="store_email">Email</label>
                                    <input type="email" id="store_email" name="store_email" value="<?php echo htmlspecialchars($store['email']); ?>" required>
                                </div>

                                <div class="form-group">
                                    <label for="store_phone">Phone</label>
                                    <input type="text" id="store_phone" name="store_phone" value="<?php echo htmlspecialchars($store['phone']); ?>" required>
                                </div>

                                <div class="form-group">
                                    <label for="store_address">Address</label>
                                    <input type="text" id="store_address" name="store_address" value="<?php echo htmlspecialchars($store['address']); ?>" required>
                                </div>

                                <div class="form-group">
                                    <label for="store_hours">Hours</label>
                                    <input type="text" id="store_hours" name="store_hours" value="<?php echo htmlspecialchars($store['hours']); ?>" required>
                                </div>

                                <div class="form-group">
                                    <label for="store_description">Description</label>
                                    <textarea id="store_description" name="store_description" rows="4" required><?php echo htmlspecialchars($store['description']); ?></textarea>
                                </div>

                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Update Store Info
                                </button>
                            </form>
                        </div>

                        <div class="preview-section">
                            <h3>Store Preview</h3>
                            <div class="store-preview-card">
                                <div class="preview-header">
                                    <h4><?php echo htmlspecialchars($store['name']); ?></h4>
                                </div>
                                <div class="preview-body">
                                    <p><strong>📍 Address:</strong> <?php echo htmlspecialchars($store['address']); ?></p>
                                    <p><strong>📞 Phone:</strong> <?php echo htmlspecialchars($store['phone']); ?></p>
                                    <p><strong>📧 Email:</strong> <?php echo htmlspecialchars($store['email']); ?></p>
                                    <p><strong>🕐 Hours:</strong> <?php echo htmlspecialchars($store['hours']); ?></p>
                                    <p><strong>ℹ️ About:</strong> <?php echo htmlspecialchars($store['description']); ?></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <style>
        /* Dashboard Layout */
        body.dashboard-page {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #8B6F47 0%, #A0826D 100%);
        }
        

        .dashboard-container {
            display: flex;
            min-height: 100vh;
            background: linear-gradient(135deg, #8B6F47 0%, #A0826D 100%);
        }

        .dashboard-sidebar {
            width: 250px;
            background: linear-gradient(135deg, #2C3A10 0%, #354419 100%);
            color: #E8F4DA;
            padding: 30px 20px;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2);
            position: fixed;
            height: 100vh;
            overflow-y: auto;
        }

        .sidebar-header {
            margin-bottom: 40px;
            border-bottom: 2px solid rgba(192, 232, 156, 0.3);
            padding-bottom: 20px;
        }

        .sidebar-header h2 {
            margin: 0 0 10px 0;
            font-size: 1.5em;
            font-family: 'Comfortaa', sans-serif;
            color: #C0E89C;
        }

        .sidebar-header p {
            margin: 0;
            font-size: 0.9em;
            color: rgba(192, 232, 156, 0.8);
            display: none;
        }

        .sidebar-nav {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .nav-link {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 15px;
            color: #E8F4DA;
            text-decoration: none;
            border-radius: 6px;
            transition: all 0.3s ease;
            font-weight: 500;
            border-left: 3px solid transparent;
        }

        .nav-link:hover {
            background: rgba(192, 232, 156, 0.2);
            border-left-color: #C0E89C;
        }

        .nav-link.active {
            background: rgba(192, 232, 156, 0.3);
            border-left-color: #C0E89C;
        }

        .nav-link.logout {
            margin-top: auto;
            color: #FF6B6B;
        }

        .nav-link.logout:hover {
            background: rgba(255, 107, 107, 0.1);
        }

        .dashboard-content {
            flex: 1;
            margin-left: 250px;
            display: flex;
            flex-direction: column;
        }

        .navbar {
            background: linear-gradient(135deg, #2C3A10 0%, #354419 100%);
            color: white;
            padding: 20px 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .nav-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
        }

        .logo {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0;
            font-family: 'Comfortaa', sans-serif;
        }

        .user-info {
            font-size: 0.95em;
            color: #C0E89C;
        }

        .dashboard-sections {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }

        .section-content {
            display: none;
            animation: fadeIn 0.3s ease-in;
        }

        .section-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        .section-header {
            margin-bottom: 30px;
            border-bottom: 2px solid rgba(192, 232, 156, 0.3);
            padding-bottom: 15px;
        }

        .section-header h2 {
            margin: 0 0 8px 0;
            font-size: 1.8em;
            color: white;
            font-family: 'Comfortaa', sans-serif;
        }

        .section-header p {
            margin: 0;
            color: rgba(224, 244, 218, 0.7);
            font-size: 0.95em;
        }

        .alert {
            padding: 15px 20px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-weight: 500;
        }

        .alert-success {
            background-color: #4CAF50;
            color: white;
            border-left: 4px solid #2E7D32;
        }

        .alert-error {
            background-color: #F44336;
            color: white;
            border-left: 4px solid #C62828;
        }

        .table-responsive {
            overflow-x: auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95em;
        }

        .data-table thead {
            background: #f5f5f5;
            border-bottom: 2px solid #ddd;
        }

        .data-table th {
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #333;
        }

        .data-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #eee;
            color: #555;
        }

        .data-table tbody tr:hover {
            background: #f9f9f9;
        }

        .data-table .text-center {
            text-align: center;
        }

        /* Status badges */
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            display: inline-block;
        }

        .status-pending {
            background-color: #FFC107;
            color: #333;
        }

        .status-going {
            background-color: #FF9800;
            color: white;
        }

        .status-ongoing {
            background-color: #2196F3;
            color: white;
        }

        .status-delivered {
            background-color: #4CAF50;
            color: white;
        }

        .status-select {
            padding: 6px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9em;
            cursor: pointer;
            background-color: white;
            transition: border-color 0.3s;
        }

        .status-select:hover {
            border-color: #999;
        }

        /* Form Styles */
        .form {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 0.95em;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 10px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.95em;
            font-family: inherit;
            box-sizing: border-box;
            transition: border-color 0.3s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #4A5F1F;
            box-shadow: 0 0 0 3px rgba(74, 95, 31, 0.1);
        }

        /* Button Styles */
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 0.95em;
        }

        .btn-primary {
            background: #4A5F1F;
            color: white;
        }

        .btn-primary:hover {
            background: #3D4E1A;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(74, 95, 31, 0.3);
        }

        .btn-secondary {
            background: #ddd;
            color: #333;
        }

        .btn-secondary:hover {
            background: #ccc;
        }

        /* Store Preview Card */
        .store-preview-card {
            background: linear-gradient(135deg, #2C3A10 0%, #354419 100%);
            color: #E8F4DA;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .preview-header {
            border-bottom: 2px solid rgba(192, 232, 156, 0.3);
            padding-bottom: 15px;
            margin-bottom: 20px;
        }

        .preview-header h4 {
            margin: 0;
            font-size: 1.5em;
            color: #C0E89C;
        }

        .preview-body p {
            margin: 12px 0;
            line-height: 1.8;
            font-size: 0.95em;
        }

        /* Content Grid */
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-top: 20px;
        }

        .form-section h3 {
            margin: 0 0 20px 0;
            font-size: 1.3em;
            color: #333;
            border-bottom: 2px solid #4A5F1F;
            padding-bottom: 10px;
        }

        .preview-section h3 {
            margin: 0 0 15px 0;
            font-size: 1.3em;
            color: white;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
            .dashboard-sidebar {
                width: 200px;
                padding: 20px 15px;
            }

            .dashboard-content {
                margin-left: 200px;
            }

            .nav-container {
                padding: 0 20px;
            }

            .content-grid {
                grid-template-columns: 1fr;
            }

            .dashboard-sections {
                padding: 20px;
            }
        }

        @media (max-width: 768px) {
            .dashboard-container {
                flex-direction: column;
            }

            .dashboard-sidebar {
                width: 100%;
                height: auto;
                position: static;
                padding: 15px;
            }

            .sidebar-header {
                margin-bottom: 15px;
            }

            .sidebar-nav {
                flex-direction: row;
                gap: 8px;
                flex-wrap: wrap;
            }

            .nav-link {
                flex: 1;
                min-width: 100px;
                padding: 8px 10px;
                font-size: 0.85em;
            }

            .dashboard-content {
                margin-left: 0;
            }

            .nav-container {
                flex-direction: column;
                gap: 10px;
                padding: 0 15px;
            }

            .logo {
                font-size: 1.2em;
            }

            .dashboard-sections {
                padding: 15px;
            }

            .section-header h2 {
                font-size: 1.4em;
            }

            .data-table {
                font-size: 0.85em;
            }

            .data-table th,
            .data-table td {
                padding: 8px 10px;
            }

            .content-grid {
                gap: 20px;
            }

            .store-preview-card {
                padding: 15px;
            }
        }

        @media (max-width: 480px) {
            .dashboard-sidebar {
                padding: 10px;
            }

            .sidebar-header h2 {
                font-size: 1.2em;
            }

            .sidebar-nav {
                gap: 5px;
            }

            .nav-link {
                padding: 6px 8px;
                font-size: 0.75em;
            }

            .navbar {
                padding: 15px 0;
            }

            .logo {
                font-size: 1em;
                word-break: break-word;
            }

            .dashboard-sections {
                padding: 10px;
            }

            .section-header h2 {
                font-size: 1.2em;
            }

            .form {
                padding: 15px;
            }

            .table-responsive {
                font-size: 0.8em;
                overflow-x: auto;
            }

            .data-table {
                font-size: 0.75em;
            }

            .data-table th,
            .data-table td {
                padding: 6px 5px;
            }
        }
    </style>

    <script>
        function showSection(sectionId) {
            // Hide all sections
            const sections = document.querySelectorAll('.section-content');
            sections.forEach(section => section.classList.remove('active'));

            // Show selected section
            const selectedSection = document.getElementById(sectionId + '-section');
            if (selectedSection) {
                selectedSection.classList.add('active');
            }

            // Update nav links
            const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
            navLinks.forEach(link => link.classList.remove('active'));
            event.target.closest('.nav-link').classList.add('active');
        }
    </script>
</body>
</html>
