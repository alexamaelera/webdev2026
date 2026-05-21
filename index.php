<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    session_destroy();
    header('Location: index.php?page=landing');
    exit;
}

// Route to different pages
$page = isset($_GET['page']) ? $_GET['page'] : 'landing';

// Check authentication for protected pages
if (in_array($page, ['admin_dashboard', 'staff_dashboard']) && !isset($_SESSION['user_id'])) {
    header('Location: index.php?page=login');
    exit;
}

// If no page specified and user is logged in, redirect to appropriate dashboard
if ($page === 'landing' && isset($_SESSION['user_id'])) {
    include 'database.php';
    $user = getUserById($_SESSION['user_id']);
    if ($user && $user['role'] === 'admin') {
        header('Location: index.php?page=admin_dashboard');
        exit;
    } elseif ($user && $user['role'] === 'staff') {
        header('Location: index.php?page=staff_dashboard');
        exit;
    }
}

// Load appropriate page
switch ($page) {
    case 'admin_dashboard':
        include 'admin_dashboard.php';
        break;
    case 'staff_dashboard':
        include 'staff_dashboard.php';
        break;
    case 'menu':
        include 'menu.php';
        break;
    case 'login':
        include 'login.php';
        break;
    case 'landing':
    default:
        include 'landing.php';
        break;
}
?>
