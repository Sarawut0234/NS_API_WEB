-- Migration: Add user-specific IP lock support to licenses table
-- This migration updates the licenses table to support per-user IP locking for FiveM scripts
-- Run this after schema.sql to enable the new API-KEY-LOCK-IP feature

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop the old licenses table if it exists with the old schema
DROP TABLE IF EXISTS `licenses`;

-- Create the new licenses table with user-specific IP locking support
CREATE TABLE `licenses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `product_id` int(10) unsigned DEFAULT NULL,
  `license_key` varchar(255) NOT NULL,
  `locked_ip` varchar(45) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_license_key` (`license_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
