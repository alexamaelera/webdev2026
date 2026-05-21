
<?php
if (session_status() === PHP_SESSION_NONE) session_start();
require_once 'database.php';

$error = '';
$success = '';
$is_signup = isset($_GET['signup']);

// Handle login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$is_signup) {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $errors = [];
    if (empty($username)) {
        $errors[] = 'Username is required.';
    }
    if (empty($password)) {
        $errors[] = 'Password is required.';
    }
    if (empty($errors)) {
        $user = getUserByUsername($username);
        if ($user && $user['password'] === $password) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            if ($user['role'] === 'admin') {
                header('Location: index.php?page=admin_dashboard');
            } elseif ($user['role'] === 'staff') {
                header('Location: index.php?page=staff_dashboard');
            } else {
                header('Location: index.php?page=menu');
            }
            exit;
        } else {
            $error = 'Invalid username or password!';
        }
    } else {
        $error = implode(' ', $errors);
    }
}

// Handle signup
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $is_signup) {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $email = trim($_POST['email'] ?? '');
    $confirm_password = $_POST['confirm_password'] ?? '';
    $errors = [];
    if (empty($username)) {
        $errors[] = 'Username is required.';
    } elseif (strlen($username) < 3 || strlen($username) > 30) {
        $errors[] = 'Username must be 3-30 characters.';
    }
    if (empty($email)) {
        $errors[] = 'Email is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email format.';
    }
    if (empty($password)) {
        $errors[] = 'Password is required.';
    } elseif (strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters.';
    }
    if ($password !== $confirm_password) {
        $errors[] = 'Passwords do not match!';
    }
    if (getUserByUsername($username)) {
        $errors[] = 'Username already exists!';
    }
    if (empty($errors)) {
        addUser($username, $password, $email, 'user');
        $success = 'Account created successfully! Please login.';
    } else {
        $error = implode(' ', $errors);
    }
}

// Handle logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $is_signup ? 'Sign Up' : 'Login'; ?> - Lex & Nitch Cafe</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="cafe-header">
                <h1 class="cafe-title">Lex & Nitch Cafe</h1>
                <p>Where Great Coffee Meets Great Treats</p>
            </div>

            <?php if ($error): ?>
                <div class="alert alert-error">
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <?php echo htmlspecialchars($success); ?>
                </div>
            <?php endif; ?>

            <form method="POST" class="login-form">
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" required placeholder="Enter your username">
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" required placeholder="Enter your password">
                </div>

                <?php if ($is_signup): ?>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" name="email" required placeholder="Enter your email">
                    </div>

                    <div class="form-group">
                        <label for="confirm_password">Confirm Password</label>
                        <input type="password" id="confirm_password" name="confirm_password" required placeholder="Confirm your password">
                    </div>
                <?php endif; ?>

                <button type="submit" class="btn btn-primary">
                    <?php echo $is_signup ? 'Create Account' : 'Login'; ?>
                </button>
            </form>
        </div>
    </div>
</body>
</html>
