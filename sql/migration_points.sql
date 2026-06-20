-- Migration: ระบบพ้อย + หมวดหมู่สินค้า
-- รันใน phpMyAdmin หรือ: mysql -u root -p ns_system < sql/migration_points.sql
-- ถ้าคอลัมน์มีอยู่แล้วจะ error "Duplicate column" — ข้ามบรรทัดนั้นได้ หรือใช้ setup/run-migration.php แทน

USE `ns_system`;

-- คอลัมน์พ้อยในตาราง users (ยอดพ้อยของสมาชิก)
ALTER TABLE `users` ADD COLUMN `points` INT UNSIGNED NOT NULL DEFAULT 0;

-- คอลัมน์ราคาพ้อยและหมวดหมู่ในตาราง products
ALTER TABLE `products` ADD COLUMN `point_price` INT UNSIGNED NOT NULL DEFAULT 0;
ALTER TABLE `products` ADD COLUMN `category` VARCHAR(50) NOT NULL DEFAULT 'all';
ALTER TABLE `products` ADD KEY `category` (`category`);
