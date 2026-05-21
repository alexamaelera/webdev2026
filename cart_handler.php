<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once 'database.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    $action = $_POST['action'];
    
    if ($action === 'add_to_cart') {
        $product_id = (int)$_POST['product_id'];
        $quantity = (int)($_POST['quantity'] ?? 1);
        
        $products = getAllProducts();
        $cart = $_SESSION['cart'] ?? [];
        
        // Find product
        $product = null;
        foreach ($products as $p) {
            if ($p['id'] == $product_id) {
                $product = $p;
                break;
            }
        }
        
        if ($product) {
            if (isset($cart[$product_id])) {
                $cart[$product_id]['quantity'] += $quantity;
            } else {
                $cart[$product_id] = [
                    'id' => $product['id'],
                    'name' => $product['name'],
                    'price' => $product['price'],
                    'image' => $product['image'],
                    'category' => $product['category'],
                    'quantity' => $quantity
                ];
            }
            $_SESSION['cart'] = $cart;
            
            // Calculate totals
            $cart_count = count($cart);
            $cart_total = 0;
            foreach ($cart as $item) {
                $cart_total += $item['price'] * $item['quantity'];
            }
            
            echo json_encode([
                'success'      => true,
                'message'      => $product['name'] . ' added to cart!',
                'cart_count'   => $cart_count,
                'cart_total'   => $cart_total,
                'product'      => $product,
                'quantity'     => $quantity,
                'new_quantity' => $cart[$product_id]['quantity']   // actual total qty now in cart
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Product not found'
            ]);
        }
    } elseif ($action === 'remove_from_cart') {
        $product_id = (int)$_POST['product_id'];
        $cart = $_SESSION['cart'] ?? [];
        
        if (isset($cart[$product_id])) {
            unset($cart[$product_id]);
            $_SESSION['cart'] = $cart;
            
            // Calculate totals
            $cart_count = count($cart);
            $cart_total = 0;
            foreach ($cart as $item) {
                $cart_total += $item['price'] * $item['quantity'];
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Item removed from cart',
                'cart_count' => $cart_count,
                'cart_total' => $cart_total
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Item not found in cart'
            ]);
        }
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid request'
    ]);
}
?>