-- Add product-level license key used by script verification
ALTER TABLE `products`
ADD COLUMN `license_key` VARCHAR(255) DEFAULT NULL AFTER `slug`;
