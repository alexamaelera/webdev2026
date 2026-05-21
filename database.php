<?php
// MySQL Database Connection

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'alexas_cafe');

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to UTF-8
$conn->set_charset("utf8");

// ===== USER FUNCTIONS =====
function getAllUsers() {
    global $conn;
    $result = $conn->query("SELECT * FROM users");
    $users = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }
    return $users;
}

function getUserByUsername($username) {
    global $conn;
    $username = $conn->real_escape_string($username);
    $result = $conn->query("SELECT * FROM users WHERE username = '$username'");
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

function getUserById($id) {
    global $conn;
    $id = (int)$id;
    $result = $conn->query("SELECT * FROM users WHERE id = $id");
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

function addUser($username, $password, $email, $role = 'user') {
    global $conn;
    $username = $conn->real_escape_string($username);
    $password = $conn->real_escape_string($password);
    $email = $conn->real_escape_string($email);
    $role = $conn->real_escape_string($role);
    
    $query = "INSERT INTO users (username, password, email, role) VALUES ('$username', '$password', '$email', '$role')";
    return $conn->query($query);
}

// ===== PRODUCT FUNCTIONS =====
function getAllProducts() {
    global $conn;
    $result = $conn->query("SELECT * FROM products");
    $products = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
    }
    return $products;
}

function getProductsByCategory($category) {
    global $conn;
    $category = $conn->real_escape_string($category);
    $result = $conn->query("SELECT * FROM products WHERE category = '$category'");
    $products = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $products[] = $row;
        }
    }
    return $products;
}

function getProductById($id) {
    global $conn;
    $id = (int)$id;
    $result = $conn->query("SELECT * FROM products WHERE id = $id");
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

function addProduct($name, $category, $price, $image) {
    global $conn;
    $name = $conn->real_escape_string($name);
    $category = $conn->real_escape_string($category);
    $price = (float)$price;
    $image = $conn->real_escape_string($image);
    
    $query = "INSERT INTO products (name, category, price, image) VALUES ('$name', '$category', $price, '$image')";
    return $conn->query($query);
}

function updateProduct($id, $name, $category, $price, $image) {
    global $conn;
    $id = (int)$id;
    $name = $conn->real_escape_string($name);
    $category = $conn->real_escape_string($category);
    $price = (float)$price;
    $image = $conn->real_escape_string($image);
    
    $query = "UPDATE products SET name = '$name', category = '$category', price = $price, image = '$image' WHERE id = $id";
    return $conn->query($query);
}

function deleteProduct($id) {
    global $conn;
    $id = (int)$id;
    $query = "DELETE FROM products WHERE id = $id";
    return $conn->query($query);
}

// ===== STAFF FUNCTIONS =====
function getAllStaff() {
    global $conn;
    $result = $conn->query("SELECT * FROM staff");
    $staff = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $staff[] = $row;
        }
    }
    return $staff;
}

function getStaffById($id) {
    global $conn;
    $id = (int)$id;
    $result = $conn->query("SELECT * FROM staff WHERE id = $id");
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

function addStaff($name, $position, $email, $phone, $salary, $password = '') {
    global $conn;
    $name = $conn->real_escape_string($name);
    $position = $conn->real_escape_string($position);
    $email = $conn->real_escape_string($email);
    $phone = $conn->real_escape_string($phone);
    $salary = (float)$salary;
    $hire_date = date('Y-m-d');
    
    $query = "INSERT INTO staff (name, position, email, phone, salary, hire_date) VALUES ('$name', '$position', '$email', '$phone', $salary, '$hire_date')";
    $result = $conn->query($query);
    
    // Create user account for staff if password is provided
    if ($result && !empty($password)) {
        $username = strtolower(str_replace(' ', '_', $name));
        $password = $conn->real_escape_string($password);
        addUser($username, $password, $email, 'staff');
    }
    
    return $result;
}

function updateStaff($staff_id, $name, $position, $email, $phone, $salary, $password = '') {
    global $conn;
    $staff_id = (int)$staff_id;
    $name = $conn->real_escape_string($name);
    $position = $conn->real_escape_string($position);
    $email = $conn->real_escape_string($email);
    $phone = $conn->real_escape_string($phone);
    $salary = (float)$salary;
    
    $query = "UPDATE staff SET name = '$name', position = '$position', email = '$email', phone = '$phone', salary = $salary WHERE id = $staff_id";
    $result = $conn->query($query);
    
    // Update password if provided
    if ($result && !empty($password)) {
        $password = $conn->real_escape_string($password);
        $username = strtolower(str_replace(' ', '_', $name));
        $update_user = $conn->query("UPDATE users SET password = '$password', username = '$username' WHERE email = '$email' AND role = 'staff'");
        
        // If user doesn't exist, create one
        if (!$update_user || $conn->affected_rows == 0) {
            addUser($username, $password, $email, 'staff');
        }
    }
    
    return $result;
}

function deleteStaff($id) {
    global $conn;
    $id = (int)$id;
    $query = "DELETE FROM staff WHERE id = $id";
    return $conn->query($query);
}

// ===== ORDER FUNCTIONS =====
function getAllOrders() {
    global $conn;
    $result = $conn->query("SELECT * FROM orders ORDER BY date DESC");
    $orders = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // Get order items
            $items_result = $conn->query("SELECT * FROM order_items WHERE order_id = " . $row['id']);
            $row['items'] = [];
            if ($items_result && $items_result->num_rows > 0) {
                while($item = $items_result->fetch_assoc()) {
                    $row['items'][] = $item;
                }
            }
            $orders[] = $row;
        }
    }
    return $orders;
}

function addOrder($user_id, $items, $total) {
    global $conn;
    $user_id = (int)$user_id;
    $total = (float)$total;
    
    $query = "INSERT INTO orders (user_id, total, status) VALUES ($user_id, $total, 'pending')";
    if ($conn->query($query)) {
        $order_id = $conn->insert_id;
        
        // Add order items
        foreach ($items as $item) {
            $product_name = $conn->real_escape_string($item['name']);
            $price = (float)$item['price'];
            $quantity = (int)$item['quantity'];
            $product_id = (int)$item['id'];
            
            $item_query = "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES ($order_id, $product_id, '$product_name', $price, $quantity)";
            $conn->query($item_query);
        }
        
        return $order_id;
    }
    return false;
}

function addGuestOrder($name, $address, $delivery_date, $delivery_time, $items, $total) {
    global $conn;
    $name = $conn->real_escape_string($name);
    $address = $conn->real_escape_string($address);
    $delivery_date = $conn->real_escape_string($delivery_date);
    $delivery_time = $conn->real_escape_string($delivery_time);
    $total = (float)$total;
    
    $query = "INSERT INTO orders (guest_name, guest_address, delivery_date, delivery_time, total, status) VALUES ('$name', '$address', '$delivery_date', '$delivery_time', $total, 'pending')";
    if ($conn->query($query)) {
        $order_id = $conn->insert_id;
        
        // Add order items
        foreach ($items as $item) {
            $product_name = $conn->real_escape_string($item['name']);
            $price = (float)$item['price'];
            $quantity = (int)$item['quantity'];
            $product_id = (int)$item['id'];
            
            $item_query = "INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES ($order_id, $product_id, '$product_name', $price, $quantity)";
            $conn->query($item_query);
        }
        
        return $order_id;
    }
    return false;
}

function getUserOrders($user_id) {
    global $conn;
    $user_id = (int)$user_id;
    $result = $conn->query("SELECT * FROM orders WHERE user_id = $user_id ORDER BY date DESC");
    $orders = [];
    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // Get order items
            $items_result = $conn->query("SELECT * FROM order_items WHERE order_id = " . $row['id']);
            $row['items'] = [];
            if ($items_result && $items_result->num_rows > 0) {
                while($item = $items_result->fetch_assoc()) {
                    $row['items'][] = $item;
                }
            }
            $orders[] = $row;
        }
    }
    return $orders;
}

function getOrderById($order_id) {
    global $conn;
    $order_id = (int)$order_id;
    $result = $conn->query("SELECT * FROM orders WHERE id = $order_id");
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        // Get order items
        $items_result = $conn->query("SELECT * FROM order_items WHERE order_id = $order_id");
        $row['items'] = [];
        if ($items_result && $items_result->num_rows > 0) {
            while($item = $items_result->fetch_assoc()) {
                $row['items'][] = $item;
            }
        }
        return $row;
    }
    return null;
}

function updateOrderStatus($order_id, $status) {
    global $conn;
    $order_id = (int)$order_id;
    $status = $conn->real_escape_string($status);
    $query = "UPDATE orders SET status = '$status' WHERE id = $order_id";
    return $conn->query($query);
}

// ===== STORE FUNCTIONS =====
function getStoreInfo() {
    global $conn;
    $result = $conn->query("SELECT * FROM store_info LIMIT 1");
    if ($result && $result->num_rows > 0) {
        return $result->fetch_assoc();
    }
    return null;
}

function updateStoreInfo($name, $email, $phone, $address, $hours, $description) {
    global $conn;
    $name = $conn->real_escape_string($name);
    $email = $conn->real_escape_string($email);
    $phone = $conn->real_escape_string($phone);
    $address = $conn->real_escape_string($address);
    $hours = $conn->real_escape_string($hours);
    $description = $conn->real_escape_string($description);
    
    // Check if record exists
    $check = $conn->query("SELECT id FROM store_info LIMIT 1");
    if ($check && $check->num_rows > 0) {
        $query = "UPDATE store_info SET name = '$name', email = '$email', phone = '$phone', address = '$address', hours = '$hours', description = '$description' WHERE id = 1";
    } else {
        $query = "INSERT INTO store_info (name, email, phone, address, hours, description) VALUES ('$name', '$email', '$phone', '$address', '$hours', '$description')";
    }
    
    return $conn->query($query);
}

?>
