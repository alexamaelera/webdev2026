<?php
require_once 'database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header('Location: index.php?page=login');
    exit;
}

$success = '';
$error = '';
$current_tab = $_GET['tab'] ?? 'dashboard';

// ===== PRODUCT MANAGEMENT =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'add_product' || $_POST['action'] === 'edit_product') {
        $name = trim($_POST['product_name'] ?? '');
        $category = trim($_POST['category'] ?? '');
        $price = (float)($_POST['price'] ?? 0);
        $image = $_POST['image'] ?? '';
        // Handle file upload
        if (isset($_FILES['image_upload']) && $_FILES['image_upload']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = 'img/';
            $ext = strtolower(pathinfo($_FILES['image_upload']['name'], PATHINFO_EXTENSION));
            $allowed = ['jpg','jpeg','png','gif','webp'];
            if (in_array($ext, $allowed)) {
                $new_name = uniqid('prod_', true) . '.' . $ext;
                $dest = $upload_dir . $new_name;
                if (move_uploaded_file($_FILES['image_upload']['tmp_name'], $dest)) {
                    $image = $dest;
                }
            }
        }
        if ($image === '') $image = '🍰';
        $errors = [];
        if (empty($name)) {
            $errors[] = 'Product name is required.';
        }
        if (empty($category)) {
            $errors[] = 'Category is required.';
        }
        if ($price <= 0) {
            $errors[] = 'Price must be greater than 0.';
        }
        if (!empty($errors)) {
            $error = implode(' ', $errors);
        } else {
            if ($_POST['action'] === 'add_product') {
                addProduct($name, $category, $price, $image);
                $success = 'Product added successfully!';
            } else {
                $product_id = (int)($_POST['product_id'] ?? 0);
                updateProduct($product_id, $name, $category, $price, $image);
                $success = 'Product updated successfully!';
            }
        }
    } elseif ($_POST['action'] === 'delete_product') {
        $product_id = (int)($_POST['product_id'] ?? 0);
        deleteProduct($product_id);
        $success = 'Product deleted successfully!';
    }
}

// ===== STAFF MANAGEMENT =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['staff_action'])) {
    if ($_POST['staff_action'] === 'add_staff' || $_POST['staff_action'] === 'edit_staff') {
        $name = trim($_POST['staff_name'] ?? '');
        $email = trim($_POST['staff_email'] ?? '');
        $phone = trim($_POST['staff_phone'] ?? '');
        $salary = (float)($_POST['salary'] ?? 0);
        $password = $_POST['staff_password'] ?? '';
        $errors = [];
        if (empty($name)) {
            $errors[] = 'Staff name is required.';
        }
        if (empty($email)) {
            $errors[] = 'Email is required.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format.';
        }
        if ($_POST['staff_action'] === 'add_staff' && empty($password)) {
            $errors[] = 'Password is required for new staff.';
        }
        if (!empty($phone) && !preg_match('/^\+?[0-9\-\s]{7,20}$/', $phone)) {
            $errors[] = 'Invalid phone number format.';
        }
        if (!empty($errors)) {
            $error = implode(' ', $errors);
        } else {
            if ($_POST['staff_action'] === 'add_staff') {
                addStaff($name, '', $email, $phone, $salary, $password);
                $success = 'Staff member added successfully!';
            } else {
                $staff_id = (int)($_POST['staff_id'] ?? 0);
                updateStaff($staff_id, $name, '', $email, $phone, $salary, $password);
                $success = 'Staff member updated successfully!';
            }
        }
    } elseif ($_POST['staff_action'] === 'delete_staff') {
        $staff_id = (int)($_POST['staff_id'] ?? 0);
        deleteStaff($staff_id);
        $success = 'Staff member removed successfully!';
    }
}

// ===== ORDER STATUS UPDATE (ADMIN) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'update_status') {
    $order_id = intval($_POST['order_id']);
    $status = $_POST['status'];
    if (in_array($status, ['pending', 'going', 'ongoing', 'delivered', 'cancelled'])) {
        updateOrderStatus($order_id, $status);
        $success = "Order status updated successfully!";
    } else {
        $error = "Invalid status value.";
    }
}

// ===== STORE MANAGEMENT =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['store_action']) && $_POST['store_action'] === 'update_store') {
    $name = trim($_POST['store_name'] ?? '');
    $email = trim($_POST['store_email'] ?? '');
    $phone = trim($_POST['store_phone'] ?? '');
    $address = trim($_POST['store_address'] ?? '');
    $hours = trim($_POST['store_hours'] ?? '');
    $description = trim($_POST['store_description'] ?? '');
    $errors = [];
    if (empty($name)) {
        $errors[] = 'Store name is required.';
    }
    if (empty($email)) {
        $errors[] = 'Email is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email format.';
    }
    if (!empty($phone) && !preg_match('/^\+?[0-9\-\s]{7,20}$/', $phone)) {
        $errors[] = 'Invalid phone number format.';
    }
    if (!empty($errors)) {
        $error = implode(' ', $errors);
    } else {
        updateStoreInfo($name, $email, $phone, $address, $hours, $description);
        $success = 'Store information updated successfully!';
    }
}

$products = getAllProducts();
$orders = getAllOrders();
$users = getAllUsers();
$staff = getAllStaff();
$store_info = getStoreInfo();

// Calculate stats
$total_users = count(array_filter($users, function($u) { return $u['role'] === 'user'; }));
$total_orders = count($orders);
$total_revenue = 0;
foreach ($orders as $order) {
    $total_revenue += $order['total'] ?? 0;
}
$pending_orders = count(array_filter($orders, function($o) { return $o['status'] === 'pending'; }));
$total_staff = count($staff);

// Calculate total inventory value (sum of all product prices)
$total_inventory_value = 0;
foreach ($products as $p) {
    $total_inventory_value += $p['price'];
}

// Get products count by category
$categories = ['coffee' => 0, 'cookies' => 0, 'pastries' => 0, 'desserts' => 0];
foreach ($products as $p) {
    if (isset($categories[$p['category']])) {
        $categories[$p['category']]++;
    }
}

// For edit modal
$edit_product = null;
$edit_staff = null;
if (isset($_GET['edit_product'])) {
    $edit_product = getProductById((int)$_GET['edit_product']);
}
if (isset($_GET['edit_staff'])) {
    $edit_staff = getStaffById((int)$_GET['edit_staff']);
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard - Lex & Nitch Cafe</title>
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <nav class="navbar admin-navbar">
        <div class="nav-container">
            <h1 class="logo">⚙️ Admin Dashboard - Lex & Nitch Cafe</h1>
            <div class="nav-right">
                <span class="user-greeting">Admin: <?php echo htmlspecialchars($_SESSION['username']); ?></span>
                <a href="index.php?action=logout" class="btn btn-secondary">Logout</a>
            </div>
        </div>
    </nav>

    <div class="admin-container">
        <aside class="admin-sidebar">
            <nav class="admin-nav">
                <a href="?page=admin_dashboard&tab=dashboard" class="admin-link <?php echo $current_tab === 'dashboard' ? 'active' : ''; ?>">📊 Dashboard</a>
                <a href="?page=admin_dashboard&tab=products" class="admin-link <?php echo $current_tab === 'products' ? 'active' : ''; ?>">📦 Products</a>
                <a href="?page=admin_dashboard&tab=staff" class="admin-link <?php echo $current_tab === 'staff' ? 'active' : ''; ?>">👔 Staff</a>
                <a href="?page=admin_dashboard&tab=store" class="admin-link <?php echo $current_tab === 'store' ? 'active' : ''; ?>">🏪 Store</a>
                <a href="?page=admin_dashboard&tab=orders" class="admin-link <?php echo $current_tab === 'orders' ? 'active' : ''; ?>">📋 Orders</a>
            </nav>
        </aside>

        <main class="admin-content">
            <?php if ($success): ?>
                <div class="alert alert-success">✓ <?php echo htmlspecialchars($success); ?></div>
            <?php endif; ?>

            <?php if ($error): ?>
                <div class="alert alert-error">✗ <?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>

            <!-- Dashboard Tab -->
            <?php if ($current_tab === 'dashboard'): ?>
                <h1>Dashboard</h1>
                
                <div class="stats-grid">
                                        <div class="stat-card">
                                            <h3>Total Inventory Value</h3>
                                            <p class="stat-number">$<?php echo number_format($total_inventory_value, 2); ?></p>
                                            <p class="stat-label">Sum of all product prices</p>
                                        </div>
                    <div class="stat-card">
                        <h3>Total Orders</h3>
                        <p class="stat-number"><?php echo $total_orders; ?></p>
                        <p class="stat-label">All Time</p>
                    </div>

                    <div class="stat-card">
                        <h3>Total Revenue</h3>
                        <p class="stat-number">$<?php echo number_format($total_revenue, 2); ?></p>
                        <p class="stat-label">From All Orders</p>
                    </div>

                    <div class="stat-card">
                        <h3>Pending Orders</h3>
                        <p class="stat-number"><?php echo $pending_orders; ?></p>
                        <p class="stat-label">Waiting to be processed</p>
                    </div>

                    <div class="stat-card">
                        <h3>Staff Members</h3>
                        <p class="stat-number"><?php echo $total_staff; ?></p>
                        <p class="stat-label">Total Employees</p>
                    </div>

                    <div class="stat-card">
                        <h3>Products</h3>
                        <p class="stat-number"><?php echo count($products); ?></p>
                        <p class="stat-label">In Inventory</p>
                    </div>
                </div>

                <h2>Product Categories</h2>
                <div class="category-stats">
                    <?php foreach ($categories as $cat => $count): ?>
                        <div class="category-stat">
                            <strong><?php echo ucfirst($cat); ?>:</strong> <?php echo $count; ?> products
                        </div>
                    <?php endforeach; ?>
                </div>

            <!-- Products Tab -->
            <?php elseif ($current_tab === 'products'): ?>
                <h1>Manage Products</h1>
                
                <div class="add-product-form">
                    <h2><?php echo $edit_product ? 'Edit Product' : 'Add New Product'; ?></h2>
                    <form method="POST" enctype="multipart/form-data">
                        <input type="hidden" name="action" value="<?php echo $edit_product ? 'edit_product' : 'add_product'; ?>">
                        <?php if ($edit_product): ?>
                            <input type="hidden" name="product_id" value="<?php echo $edit_product['id']; ?>">
                        <?php endif; ?>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="product_name">Product Name</label>
                                <input type="text" id="product_name" name="product_name" required value="<?php echo $edit_product ? htmlspecialchars($edit_product['name']) : ''; ?>">
                            </div>

                            <div class="form-group">
                                <label for="category">Category</label>
                                <select id="category" name="category" required>
                                    <option value="">Select Category</option>
                                    <option value="coffee" <?php echo ($edit_product && $edit_product['category'] === 'coffee') ? 'selected' : ''; ?>>☕ Coffee</option>
                                    <option value="cookies" <?php echo ($edit_product && $edit_product['category'] === 'cookies') ? 'selected' : ''; ?>>🍪 Cookies</option>
                                    <option value="pastries" <?php echo ($edit_product && $edit_product['category'] === 'pastries') ? 'selected' : ''; ?>>🥐 Pastries</option>
                                    <option value="desserts" <?php echo ($edit_product && $edit_product['category'] === 'desserts') ? 'selected' : ''; ?>>🍰 Desserts</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="price">Price ($)</label>
                                <input type="number" id="price" name="price" step="0.01" min="0" required value="<?php echo $edit_product ? $edit_product['price'] : ''; ?>">
                            </div>

                            <div class="form-group">
                                <label for="image">Image (Upload or Emoji)</label>
                                <input type="file" id="image_upload" name="image_upload" accept="image/*">
                                <div style="margin: 8px 0;">or</div>
                                <input type="text" id="image" name="image" placeholder="Emoji or image URL" value="<?php echo $edit_product ? $edit_product['image'] : '🍰'; ?>" maxlength="255">
                                <?php if ($edit_product && $edit_product['image'] && strpos($edit_product['image'], 'img/') === 0): ?>
                                    <?php
                                        $imgPath = $edit_product['image'] ?? '';
                                        if (!preg_match('#^(?:/|https?://)#i', $imgPath)) {
                                            $imgPath = '/img/' . basename($imgPath);
                                        } elseif (strpos($imgPath, '/img/') !== 0 && strpos($imgPath, 'http') !== 0) {
                                            $imgPath = '/img/' . basename($imgPath);
                                        }
                                    ?>
                                    <div style="margin-top:8px;"><img src="<?php echo htmlspecialchars($imgPath); ?>" alt="Current Image" style="max-width:60px;max-height:60px;"></div>
                                <?php endif; ?>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary"><?php echo $edit_product ? 'Update Product' : 'Add Product'; ?></button>
                            <?php if ($edit_product): ?>
                                <a href="?page=admin_dashboard&tab=products" class="btn btn-secondary">Cancel</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <h2>All Products</h2>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Image</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($products as $product): ?>
                            <tr>
                                <td><?php echo $product['id']; ?></td>
                                <td><?php echo htmlspecialchars($product['name']); ?></td>
                                <td><?php echo ucfirst($product['category']); ?></td>
                                <td>$<?php echo number_format($product['price'], 2); ?></td>
                                <td>
                                    <?php if (strpos($product['image'], 'img/') === 0): ?>
                                        <?php
                                            $imgPath = $product['image'] ?? '';
                                            if (!preg_match('#^(?:/|https?://)#i', $imgPath)) {
                                                $imgPath = '/img/' . basename($imgPath);
                                            } elseif (strpos($imgPath, '/img/') !== 0 && strpos($imgPath, 'http') !== 0) {
                                                $imgPath = '/img/' . basename($imgPath);
                                            }
                                        ?>
                                        <img src="<?php echo htmlspecialchars($imgPath); ?>" alt="Product Image" style="max-width:40px;max-height:40px;">
                                    <?php else: ?>
                                        <?php echo $product['image']; ?>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <a href="?page=admin_dashboard&tab=products&edit_product=<?php echo $product['id']; ?>" class="btn-action btn-edit">✏️ Edit</a>
                                    <form method="POST" class="inline-form">
                                        <input type="hidden" name="action" value="delete_product">
                                        <input type="hidden" name="product_id" value="<?php echo $product['id']; ?>">
                                        <button type="submit" class="btn-action btn-delete" onclick="return confirm('Delete this product?')">🗑️ Delete</button>
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>

            <!-- Staff Tab -->
            <?php elseif ($current_tab === 'staff'): ?>
                <h1>Manage Staff</h1>
                
                <div class="add-product-form">
                    <h2><?php echo $edit_staff ? 'Edit Staff Member' : 'Add Staff Member'; ?></h2>
                    <form method="POST">
                        <input type="hidden" name="staff_action" value="<?php echo $edit_staff ? 'edit_staff' : 'add_staff'; ?>">
                        <?php if ($edit_staff): ?>
                            <input type="hidden" name="staff_id" value="<?php echo $edit_staff['id']; ?>">
                        <?php endif; ?>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="staff_name">Full Name *</label>
                                <input type="text" id="staff_name" name="staff_name" required value="<?php echo $edit_staff ? htmlspecialchars($edit_staff['name']) : ''; ?>">
                            </div>

                            <div class="form-group">
                                <label for="staff_phone">Phone</label>
                                <input type="tel" id="staff_phone" name="staff_phone" value="<?php echo $edit_staff ? htmlspecialchars($edit_staff['phone']) : ''; ?>">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="staff_email">Email *</label>
                                <input type="email" id="staff_email" name="staff_email" required value="<?php echo $edit_staff ? htmlspecialchars($edit_staff['email']) : ''; ?>">
                            </div>

                            <div class="form-group">
                                <label for="staff_password">Password <?php echo $edit_staff ? '' : '*'; ?></label>
                                <input type="password" id="staff_password" name="staff_password" <?php echo $edit_staff ? '' : 'required'; ?> placeholder="<?php echo $edit_staff ? 'Leave blank to keep current password' : 'Enter staff password'; ?>">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="salary">Monthly Salary ($)</label>
                                <input type="number" id="salary" name="salary" step="0.01" min="0" value="<?php echo $edit_staff ? $edit_staff['salary'] : ''; ?>">
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary"><?php echo $edit_staff ? 'Update Staff' : 'Add Staff'; ?></button>
                            <?php if ($edit_staff): ?>
                                <a href="?page=admin_dashboard&tab=staff" class="btn btn-secondary">Cancel</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <h2>Staff Members</h2>
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Position</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Salary</th>
                            <th>Hire Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($staff)): ?>
                            <tr>
                                <td colspan="8" class="center-text">No staff members yet</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($staff as $member): ?>
                                <tr>
                                    <td><?php echo $member['id']; ?></td>
                                    <td><?php echo htmlspecialchars($member['name']); ?></td>
                                    <td><?php echo htmlspecialchars($member['position']); ?></td>
                                    <td><?php echo htmlspecialchars($member['email']); ?></td>
                                    <td><?php echo htmlspecialchars($member['phone']); ?></td>
                                    <td>$<?php echo number_format($member['salary'], 2); ?></td>
                                    <td><?php echo $member['hire_date']; ?></td>
                                    <td>
                                        <a href="?page=admin_dashboard&tab=staff&edit_staff=<?php echo $member['id']; ?>" class="btn-action btn-edit">✏️ Edit</a>
                                        <form method="POST" class="inline-form">
                                            <input type="hidden" name="staff_action" value="delete_staff">
                                            <input type="hidden" name="staff_id" value="<?php echo $member['id']; ?>">
                                            <button type="submit" class="btn-action btn-delete" onclick="return confirm('Remove this staff member?')">🗑️ Delete</button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>

            <!-- Store Tab -->
            <?php elseif ($current_tab === 'store'): ?>
                <h1>Store Management</h1>
                
                <div class="add-product-form">
                    <h2>Store Information</h2>
                    <form method="POST">
                        <input type="hidden" name="store_action" value="update_store">
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="store_name">Store Name *</label>
                                <input type="text" id="store_name" name="store_name" required value="<?php echo htmlspecialchars($store_info['name'] ?? ''); ?>">
                            </div>

                            <div class="form-group">
                                <label for="store_email">Email *</label>
                                <input type="email" id="store_email" name="store_email" required value="<?php echo htmlspecialchars($store_info['email'] ?? ''); ?>">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="store_phone">Phone</label>
                                <input type="tel" id="store_phone" name="store_phone" value="<?php echo htmlspecialchars($store_info['phone'] ?? ''); ?>">
                            </div>

                            <div class="form-group">
                                <label for="store_address">Address</label>
                                <input type="text" id="store_address" name="store_address" value="<?php echo htmlspecialchars($store_info['address'] ?? ''); ?>">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="store_hours">Business Hours</label>
                                <input type="text" id="store_hours" name="store_hours" placeholder="e.g., 6:00 AM - 8:00 PM" value="<?php echo htmlspecialchars($store_info['hours'] ?? ''); ?>">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="store_description">Description</label>
                            <textarea id="store_description" name="store_description" rows="4" class="textarea-style"><?php echo htmlspecialchars($store_info['description'] ?? ''); ?></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Save Store Information</button>
                        </div>
                    </form>
                </div>

                <div class="store-preview">
                    <h2>Store Preview</h2>
                    <div class="preview-card">
                        <h3><?php echo htmlspecialchars($store_info['name']); ?></h3>
                        <p><strong>📧 Email:</strong> <?php echo htmlspecialchars($store_info['email']); ?></p>
                        <p><strong>📱 Phone:</strong> <?php echo htmlspecialchars($store_info['phone']); ?></p>
                        <p><strong>📍 Address:</strong> <?php echo htmlspecialchars($store_info['address']); ?></p>
                        <p><strong>🕐 Hours:</strong> <?php echo htmlspecialchars($store_info['hours']); ?></p>
                        <p><strong>ℹ️ Description:</strong> <?php echo htmlspecialchars($store_info['description']); ?></p>
                    </div>
                </div>

            <!-- Orders Tab -->
            <?php elseif ($current_tab === 'orders'): ?>
                <h1>Orders</h1>
                
                <?php if (empty($orders)): ?>
                    <p class="no-data">No orders yet!</p>
                <?php else: ?>
                    <table class="orders-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Total</th>
                                <th>Items Count</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($orders as $order): ?>
                                <tr>
                                    <td>#<?php echo $order['id']; ?></td>
                                    <td>
                                        <?php
                                        // Prefer guest_name when present, otherwise resolve user_id to username if possible
                                        if (!empty($order['guest_name'])) {
                                            echo htmlspecialchars($order['guest_name']);
                                        } elseif (!empty($order['user_id'])) {
                                            $u = getUserById($order['user_id']);
                                            if ($u) {
                                                echo htmlspecialchars($u['username']);
                                            } else {
                                                echo htmlspecialchars($order['user_id']);
                                            }
                                        } else {
                                            echo 'Guest';
                                        }
                                        ?>
                                    </td>
                                    <td><?php echo date('M d, Y H:i', strtotime($order['date'])); ?></td>
                                    <td>$<?php echo number_format($order['total'], 2); ?></td>
                                    <td><?php echo count($order['items']); ?> items</td>
                                    <td>
                                        <span class="status-<?php echo $order['status']; ?>"><?php echo ucfirst($order['status']); ?></span>
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
                                                <option value="cancelled" <?php echo $order['status'] == 'cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                                            </select>
                                        </form>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>

            <?php endif; ?>
        </main>
    </div>


</body>
</html>
