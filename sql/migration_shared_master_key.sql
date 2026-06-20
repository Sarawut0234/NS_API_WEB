-- Migration: Support Shared Master Key for Multi-User License System
-- This allows 1 Master Key to be shared by multiple users, each with their own IP lock
-- Run this migration to enable the new shared key feature

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop the old UNIQUE constraint on license_key to allow multiple users per key
ALTER TABLE `licenses` DROP INDEX `idx_license_key`;

-- Add a new composite unique key for (license_key, user_id, product_id)
-- This allows the same license_key to be used by different users with different IPs
ALTER TABLE `licenses` 
ADD UNIQUE KEY `idx_license_user_product` (`license_key`, `user_id`, `product_id`),
ADD KEY `idx_license_key_only` (`license_key`);

-- Add a column to track if this is a shared/master key
ALTER TABLE `licenses` 
ADD COLUMN `is_shared_key` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`,
ADD COLUMN `master_key_id` INT(10) UNSIGNED DEFAULT NULL AFTER `is_shared_key`;

-- Add foreign key for master_key_id to reference the master license record
ALTER TABLE `licenses` 
ADD CONSTRAINT `fk_master_key` FOREIGN KEY (`master_key_id`) REFERENCES `licenses` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
