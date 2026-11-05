-- ============================================================
-- SPIDER X — Full Enterprise Database Schema (30+ Tables)
-- SQL File: sql/spiderx.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS `spiderx_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `spiderx_db`;

-- 1. branches
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `is_main` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `branches` (`id`, `name`, `address`, `phone`, `is_main`) VALUES
('branch_main', 'الفرع الرئيسي - القاهرة', 'شارع التحرير، الدقي', '01000000000', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 2. roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `label` VARCHAR(100) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `name`, `label`) VALUES
(1, 'admin', 'مدير النظام'),
(2, 'manager', 'مشرف'),
(3, 'cashier', 'كاشير')
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`);

-- 3. permissions
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `label` VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. role_permissions
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. users / employees
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `branch_id` VARCHAR(50) DEFAULT 'branch_main',
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL DEFAULT 3,
  `phone` VARCHAR(30) DEFAULT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `branch_id`, `name`, `username`, `password_hash`, `role_id`) VALUES
('usr_admin', 'branch_main', 'مدير النظام', 'admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1),
('usr_cashier', 'branch_main', 'الكاشير', 'cashier', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. playstations / devices
CREATE TABLE IF NOT EXISTS `playstations` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `branch_id` VARCHAR(50) DEFAULT 'branch_main',
  `type` ENUM('PS5', 'PS4', 'VIP', 'PC') NOT NULL,
  `number` VARCHAR(50) NOT NULL,
  `status` ENUM('available', 'occupied', 'reserved', 'maintenance') DEFAULT 'available',
  `hourly_price` DECIMAL(10,2) DEFAULT 50.00,
  `vip_price` DECIMAL(10,2) DEFAULT 80.00,
  `serial_number` VARCHAR(100) DEFAULT NULL,
  `purchase_date` DATE DEFAULT NULL,
  `warranty_expiry` DATE DEFAULT NULL,
  `total_operating_hours` DECIMAL(10,2) DEFAULT 0.00,
  `total_sessions_count` INT DEFAULT 0,
  `total_revenue` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `playstations` (`id`, `branch_id`, `type`, `number`, `status`, `hourly_price`, `vip_price`) VALUES
('dev_ps5_1', 'branch_main', 'PS5', 'PS5-01', 'available', 50.00, 80.00),
('dev_ps5_2', 'branch_main', 'PS5', 'PS5-02', 'available', 50.00, 80.00),
('dev_ps5_3', 'branch_main', 'PS5', 'PS5-03', 'available', 50.00, 80.00),
('dev_ps4_1', 'branch_main', 'PS4', 'PS4-01', 'available', 30.00, 50.00),
('dev_ps4_2', 'branch_main', 'PS4', 'PS4-02', 'available', 30.00, 50.00),
('dev_vip_1', 'branch_main', 'VIP', 'VIP-01', 'available', 80.00, 100.00),
('dev_vip_2', 'branch_main', 'VIP', 'VIP-02', 'available', 80.00, 100.00),
('dev_pc_1',  'branch_main', 'PC',  'PC-01',  'available', 25.00, 40.00)
ON DUPLICATE KEY UPDATE `number` = VALUES(`number`);

-- 7. controllers
CREATE TABLE IF NOT EXISTS `controllers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `number` VARCHAR(50) NOT NULL,
  `type` ENUM('DualSense', 'DualShock 4', 'Xbox Wireless', 'PC Gamepad') NOT NULL,
  `status` ENUM('available', 'in_use', 'charging', 'maintenance') DEFAULT 'available',
  `battery_level` INT DEFAULT 100,
  `device_id` VARCHAR(50) DEFAULT NULL,
  `last_used` DATETIME DEFAULT NULL,
  `last_maintenance` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`device_id`) REFERENCES `playstations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. customers
CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `visits` INT DEFAULT 0,
  `total_spending` DECIMAL(10,2) DEFAULT 0.00,
  `loyalty_points` INT DEFAULT 0,
  `fav_device` VARCHAR(20) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. waiting_list
CREATE TABLE IF NOT EXISTS `waiting_list` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `customer_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `preferred_device_type` VARCHAR(50) DEFAULT 'PS5',
  `priority` INT DEFAULT 1,
  `status` ENUM('waiting', 'served', 'cancelled') DEFAULT 'waiting',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `device_id` VARCHAR(50) NOT NULL,
  `customer_id` VARCHAR(50) DEFAULT NULL,
  `customer_name` VARCHAR(100) DEFAULT 'عميل',
  `phone` VARCHAR(30) DEFAULT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `hourly_price` DECIMAL(10,2) NOT NULL,
  `session_type` ENUM('open', 'timed') DEFAULT 'open',
  `planned_duration` INT DEFAULT NULL,
  `paused` TINYINT(1) DEFAULT 0,
  `paused_at` DATETIME DEFAULT NULL,
  `paused_duration` INT DEFAULT 0,
  `cost` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
  FOREIGN KEY (`device_id`) REFERENCES `playstations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. client_orders (Self orders via QR code scan)
CREATE TABLE IF NOT EXISTS `client_orders` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `device_id` VARCHAR(50) NOT NULL,
  `session_id` VARCHAR(50) DEFAULT NULL,
  `items_json` TEXT NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. products
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `barcode` VARCHAR(100) DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) DEFAULT 'عام',
  `cost_price` DECIMAL(10,2) DEFAULT 0.00,
  `sell_price` DECIMAL(10,2) NOT NULL,
  `stock` INT DEFAULT 100,
  `min_stock` INT DEFAULT 10,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_barcode` (`barcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Official 10th GAMES Products
INSERT INTO `products` (`id`, `barcode`, `name`, `category`, `cost_price`, `sell_price`, `stock`, `min_stock`) VALUES
-- 1. المشروبات الغازية
('prod_101', '101', 'بيبسي كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_102', '102', 'كوكاكولا كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_103', '103', 'سفن أب كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_104', '104', 'سبرايت كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_105', '105', 'ميرندا برتقال كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_106', '106', 'ميرندا تفاح كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_107', '107', 'كوكاكولا زيرو كانز', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_108', '108', 'شويبس كانز', 'مشروبات غازية', 17.00, 22.00, 100, 10),
('prod_109', '109', 'في كولا', 'مشروبات غازية', 15.00, 20.00, 100, 10),
('prod_110', '110', 'ماونتن ديو', 'مشروبات غازية', 15.00, 20.00, 100, 10),
-- 2. العصائر المعلبة
('prod_201', '201', 'جهينة مانجو صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_202', '202', 'جهينة برتقال صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_203', '203', 'جهينة تفاح صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_204', '204', 'جهينة كوكتيل صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_205', '205', 'بيتي مانجو صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_206', '206', 'بيتي برتقال صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_207', '207', 'بيتي تفاح صغير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_208', '208', 'دومتي عصير', 'عصائر معلبة', 10.00, 15.00, 100, 10),
('prod_209', '209', 'سن توب', 'عصائر معلبة', 15.00, 20.00, 100, 10),
('prod_210', '210', 'راني بقطع الفاكهة', 'عصائر معلبة', 19.00, 25.00, 100, 10),
('prod_211', '211', 'آيس تي', 'عصائر معلبة', 19.00, 25.00, 100, 10),
('prod_212', '212', 'فيمتو', 'عصائر معلبة', 19.00, 25.00, 100, 10),
-- 3. مشروبات الطاقة
('prod_301', '301', 'ستينج', 'مشروبات طاقة', 15.00, 20.00, 100, 10),
('prod_302', '302', 'فيوري', 'مشروبات طاقة', 19.00, 25.00, 100, 10),
('prod_303', '303', 'ريد بول', 'مشروبات طاقة', 50.00, 65.00, 100, 10),
('prod_304', '304', 'باور هورس', 'مشروبات طاقة', 22.00, 30.00, 100, 10),
('prod_305', '305', 'جوريلا', 'مشروبات طاقة', 19.00, 25.00, 100, 10),
('prod_306', '306', 'مشروب طاقة جولد', 'مشروبات طاقة', 19.00, 25.00, 100, 10),
-- 4. المياه المعدنية
('prod_401', '401', 'مياه صغيرة 330 مل', 'مياه معدنية', 5.00, 8.00, 100, 10),
('prod_402', '402', 'مياه 500 مل', 'مياه معدنية', 6.00, 10.00, 100, 10),
('prod_403', '403', 'مياه 600 مل', 'مياه معدنية', 8.00, 12.00, 100, 10),
('prod_404', '404', 'مياه 750 مل', 'مياه معدنية', 10.00, 15.00, 100, 10),
-- 5. الشاي والأعشاب
('prod_501', '501', 'شاي', 'شاي وأعشاب', 5.00, 15.00, 100, 10),
('prod_502', '502', 'شاي فتلة', 'شاي وأعشاب', 5.00, 15.00, 100, 10),
('prod_503', '503', 'شاي أخضر', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
('prod_504', '504', 'شاي بالنعناع', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
('prod_505', '505', 'يانسون', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
('prod_506', '506', 'نعناع', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
('prod_507', '507', 'قرفة', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
('prod_508', '508', 'جنزبيل', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
('prod_509', '509', 'قرفة بالجنزبيل', 'شاي وأعشاب', 10.00, 25.00, 100, 10),
('prod_510', '510', 'كركديه', 'شاي وأعشاب', 7.00, 20.00, 100, 10),
-- 6. القهوة والمشروبات الساخنة
('prod_601', '601', 'قهوة تركي سادة', 'قهوة ومشروبات ساخنة', 10.00, 25.00, 100, 10),
('prod_602', '602', 'قهوة تركي محوج', 'قهوة ومشروبات ساخنة', 12.00, 30.00, 100, 10),
('prod_603', '603', 'قهوة زيادة', 'قهوة ومشروبات ساخنة', 12.00, 30.00, 100, 10),
('prod_604', '604', 'قهوة فرنساوي', 'قهوة ومشروبات ساخنة', 15.00, 30.00, 100, 10),
('prod_605', '605', 'نسكافيه', 'قهوة ومشروبات ساخنة', 10.00, 25.00, 100, 10),
('prod_606', '606', 'نسكافيه بالحليب', 'قهوة ومشروبات ساخنة', 15.00, 30.00, 100, 10),
('prod_607', '607', 'كابتشينو', 'قهوة ومشروبات ساخنة', 18.00, 35.00, 100, 10),
('prod_608', '608', 'هوت شوكليت', 'قهوة ومشروبات ساخنة', 18.00, 35.00, 100, 10),
('prod_609', '609', 'سحلب', 'قهوة ومشروبات ساخنة', 18.00, 35.00, 100, 10),
('prod_610', '610', 'إسبريسو', 'قهوة ومشروبات ساخنة', 15.00, 30.00, 100, 10),
('prod_611', '611', 'إسبريسو دبل', 'قهوة ومشروبات ساخنة', 20.00, 40.00, 100, 10)
ON DUPLICATE KEY UPDATE `sell_price` = VALUES(`sell_price`), `name` = VALUES(`name`);

-- 13. sales
CREATE TABLE IF NOT EXISTS `sales` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
  `branch_id` VARCHAR(50) DEFAULT 'branch_main',
  `session_id` VARCHAR(50) DEFAULT NULL,
  `device_id` VARCHAR(50) DEFAULT NULL,
  `customer_id` VARCHAR(50) DEFAULT NULL,
  `order_type` ENUM('Gaming Session', 'Standalone Sale') DEFAULT 'Standalone Sale',
  `sale_type` ENUM('session', 'pos') DEFAULT 'pos',
  `customer_name` VARCHAR(100) DEFAULT 'عميل',
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `tax` DECIMAL(10,2) DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash', 'visa', 'instapay', 'mixed', 'wallet') DEFAULT 'cash',
  `status` ENUM('completed', 'refunded') DEFAULT 'completed',
  `refunded_at` DATETIME DEFAULT NULL,
  `refund_reason` VARCHAR(255) DEFAULT NULL,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. smart_pricing
CREATE TABLE IF NOT EXISTS `smart_pricing` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `rule_name` VARCHAR(100) NOT NULL,
  `start_hour` TIME NOT NULL,
  `end_hour` TIME NOT NULL,
  `day_type` ENUM('weekday', 'weekend', 'all') DEFAULT 'all',
  `ps5_rate` DECIMAL(10,2) NOT NULL,
  `ps4_rate` DECIMAL(10,2) NOT NULL,
  `vip_rate` DECIMAL(10,2) NOT NULL,
  `pc_rate` DECIMAL(10,2) NOT NULL,
  `active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_name` VARCHAR(100) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `details` TEXT DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT '127.0.0.1',
  `device` VARCHAR(100) DEFAULT 'Desktop',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. suppliers
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(30) DEFAULT NULL,
  `company` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. expenses
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `description` VARCHAR(255) NOT NULL,
  `category` VARCHAR(50) DEFAULT 'أخرى',
  `amount` DECIMAL(10,2) NOT NULL,
  `date` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. shifts
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(50) DEFAULT NULL,
  `user_name` VARCHAR(100) DEFAULT 'كاشير',
  `open_time` DATETIME NOT NULL,
  `close_time` DATETIME DEFAULT NULL,
  `open_balance` DECIMAL(10,2) DEFAULT 0.00,
  `close_balance` DECIMAL(10,2) DEFAULT 0.00,
  `sales_total` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('open', 'closed') DEFAULT 'open'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `type` ENUM('info', 'success', 'warning', 'danger') DEFAULT 'info',
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
