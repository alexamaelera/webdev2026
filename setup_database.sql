-- Lex & Nitch Cafe Database Setup Script
-- Run this in phpMyAdmin or MySQL to set up your database

-- Create Database
CREATE DATABASE IF NOT EXISTS alexas_cafe;
USE alexas_cafe;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    category ENUM('coffee', 'cookies', 'pastries', 'desserts') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Staff Table
CREATE TABLE IF NOT EXISTS staff (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    salary DECIMAL(10, 2),
    password VARCHAR(255),
    hire_date DATE,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    guest_name VARCHAR(255),
    guest_address TEXT,
    delivery_date DATE,
    delivery_time VARCHAR(50),
    total DECIMAL(10, 2),
    status ENUM('pending', 'going', 'ongoing', 'delivered', 'cancelled') DEFAULT 'pending',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT,
    product_name VARCHAR(255),
    price DECIMAL(10, 2),
    quantity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Store Info Table
CREATE TABLE IF NOT EXISTS store_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    hours VARCHAR(100),
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===== INSERT DATA =====

-- Insert Users
INSERT INTO users (id, username, password, email, role) VALUES
(1, 'admin', '12345', 'admin@alexascafe.com', 'admin'),
(4, 'ali', 'ali123', 'ali@gmail.com', 'staff');

-- Insert Products
INSERT INTO products (id, name, category, price, image) VALUES
(1, 'Espresso', 'coffee', 3.5, 'img/espresso.jpg'),
(2, 'Cappuccino', 'coffee', 4.5, 'img/capuccino.jpg'),
(3, 'Latte', 'coffee', 4.75, 'img/latte.jpg'),
(4, 'Mocha', 'coffee', 5, 'img/mocha.jpg'),
(5, 'Chocolate Chip Cookie', 'cookies', 2.5, 'img/chocolate_cookie.jpg'),
(6, 'Oatmeal Raisin', 'cookies', 2.5, 'img/oatmeal_raisin.jpg'),
(7, 'Sugar Cookie', 'cookies', 2, 'img/sugar_cookie.jpg'),
(8, 'Peanut Butter Cookie', 'cookies', 2, 'img/peanut_butter_cookie.jpg'),
(9, 'Croissant', 'pastries', 3.5, 'img/croissant.jpg'),
(10, 'Danish Pastry', 'pastries', 3.75, 'img/danish_pastry.jpg'),
(11, 'Blueberry Muffins', 'pastries', 3.25, 'img/blueberry_muffins.jpg'),
(12, 'Cinnamon Roll', 'pastries', 4, 'img/cinnamon_roll.jpg'),
(13, 'Chocolate Brownie', 'desserts', 5.5, 'img/chocolate_brownie.jpg'),
(14, 'Cheesecake', 'desserts', 4.5, 'img/cheesecake.jpg'),
(15, 'Fruit Tart', 'desserts', 4.5, 'img/fruit_tart.jpg'),
(16, 'Tiramisu', 'desserts', 4.5, 'img/tiramisu.jpg');

-- Insert Staff
INSERT INTO staff (id, name, position, email, phone, salary, hire_date, user_id) VALUES
(1, 'ali', '', 'ali@gmail.com', '87000', 5000, '2026-03-30', 4);

-- Insert Store Info
INSERT INTO store_info (name, email, phone, address, hours, description) VALUES
('Alexa\'s Cafe', 'info@alexascafe.com', '+1-800-COFFEE', '123 Coffee Lane, Brew City', '6:00 AM - 10:00 PM', 'A whimsical cafe experience with matcha and nature vibes');

-- Insert Orders  
INSERT INTO orders (id, user_id, guest_name, guest_address, delivery_time, total, status, date) VALUES
(1, NULL, 'alexa', 'basdacy', '', 3.5, 'going', '2026-03-30 10:30:08'),
(2, NULL, 'alexa', 'basdacuu', '', 4.5, 'pending', '2026-03-30 10:50:58');

-- Insert Order Items
INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES
(1, 1, 'Espresso', 3.5, 1),
(2, 2, 'Cappuccino', 4.5, 1);

-- Insert Sample Data
-- Users
INSERT INTO users (id, username, password, email, role) VALUES
(1, 'admin', '12345', 'admin@alexascafe.com', 'admin'),
(2, 'john_doe', 'password123', 'john@example.com', 'user'),
(3, 'alisha', 'alisha123', 'alisha@gmail.com', 'user'),
(4, 'ali', 'ali123', 'ali@gmail.com', 'staff');

-- Products
INSERT INTO products (id, name, category, price, image) VALUES
(1, 'Espresso', 'coffee', 3.5, 'img/espresso.jpg'),
(2, 'Cappuccino', 'coffee', 4.5, 'img/capuccino.jpg'),
(3, 'Latte', 'coffee', 4.75, 'img/latte.jpg'),
(4, 'Mocha', 'coffee', 5, 'img/mocha.jpg'),
(5, 'Chocolate Chip Cookie', 'cookies', 2.5, 'img/chocolate_cookie.jpg'),
(6, 'Oatmeal Raisin', 'cookies', 2.5, 'img/oatmeal_raisin.jpg'),
(7, 'Sugar Cookie', 'cookies', 2, 'img/sugar_cookie.jpg'),
(8, 'Croissant', 'pastries', 3.5, 'img/croissant.jpg'),
(9, 'Chocolate Cake', 'desserts', 5.5, 'img/chocolate_cake.jpg'),
(10, 'Cheesecake', 'desserts', 4.5, 'img/cheesecake.jpg');

-- Staff
INSERT INTO staff (id, name, position, email, phone, salary, hire_date, user_id) VALUES
(1, 'ali', '', 'ali@gmail.com', '87000', 5000, '2026-03-30', 4);

-- Store Info
INSERT INTO store_info (name, email, phone, address, hours, description) VALUES
('Alexa\'s Cafe', 'info@alexascafe.com', '+1-800-COFFEE', '123 Coffee Lane, Brew City', '6:00 AM - 10:00 PM', 'A whimsical cafe experience with matcha and nature vibes');

-- Orders
INSERT INTO orders (id, user_id, guest_name, guest_address, items, total, status, date) VALUES
(1, NULL, 'alexa', 'basdacy', '[{"id":1,"name":"Espresso","price":3.5,"image":"☕","category":"coffee","quantity":1}]', 3.5, 'going', '2026-03-30 10:30:08'),
(2, NULL, 'alexa', 'basdacuu', '[{"id":2,"name":"Cappuccino","price":4.5,"image":"☕","category":"coffee","quantity":1}]', 4.5, 'pending', '2026-03-30 10:50:58');
