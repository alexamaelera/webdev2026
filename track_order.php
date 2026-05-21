<?php
// track_order.php: Returns order status/details as JSON for Track Order modal
require_once 'database.php';
header('Content-Type: application/json');

$order_id = isset($_POST['order_id']) ? trim($_POST['order_id']) : '';
if ($order_id === '' || !ctype_digit($order_id)) {
    echo json_encode(['success' => false, 'message' => 'Invalid Order ID.']);
    exit;
}
$order_id = ltrim($order_id, '0'); // Allow padded IDs
$order = getOrderById($order_id);
if (!$order) {
    echo json_encode(['success' => false, 'message' => 'Order not found.']);
    exit;
}
// Prepare items
$items = [];
if (isset($order['items']) && is_array($order['items'])) {
    foreach ($order['items'] as $item) {
        $items[] = [
            'name' => isset($item['name']) ? $item['name'] : (isset($item['product_name']) ? $item['product_name'] : 'Unknown'),
            'quantity' => isset($item['quantity']) ? $item['quantity'] : 1
        ];
    }
}
// Format date
$date = isset($order['date']) ? date('M d, Y h:i A', strtotime($order['date'])) : '';
$status = isset($order['status']) ? ucfirst($order['status']) : 'Unknown';
$total = isset($order['total']) ? $order['total'] : 0;
echo json_encode([
    'success' => true,
    'status' => $status,
    'date' => $date,
    'total' => $total,
    'items' => $items
]);
exit;
