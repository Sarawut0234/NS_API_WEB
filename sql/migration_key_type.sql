-- โค้ดเลือกได้ว่าแลกระบบ(สินค้า) หรือ พ้อย
-- รันใน phpMyAdmin หรือใช้ setup/run-migration.php

USE `ns_system`;

ALTER TABLE `license_keys` ADD COLUMN `key_type` VARCHAR(20) NOT NULL DEFAULT 'product' AFTER `id`;
ALTER TABLE `license_keys` ADD COLUMN `point_amount` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `product_id`;
ALTER TABLE `license_keys` MODIFY COLUMN `product_id` INT(10) UNSIGNED DEFAULT NULL;
