-- NS SYSTEM - Database schema
-- Run this in phpMyAdmin or: mysql -u root -p ns_system < sql/schema.sql

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `ns_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ns_system`;

-- Users (ÃƒÂ Ã‚Â¸Ã‚ÂªÃƒÂ Ã‚Â¸Ã‚Â¡ÃƒÂ Ã‚Â¸Ã‚Â±ÃƒÂ Ã‚Â¸Ã¢â‚¬Å¾ÃƒÂ Ã‚Â¸Ã‚Â£/ÃƒÂ Ã‚Â¸Ã‚Â¥ÃƒÂ Ã‚Â¹Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¸Ã‚Â­ÃƒÂ Ã‚Â¸Ã‚ÂÃƒÂ Ã‚Â¸Ã‚Â­ÃƒÂ Ã‚Â¸Ã‚Â´ÃƒÂ Ã‚Â¸Ã¢â€žÂ¢ÃƒÂ Ã‚Â¸Ã¢â‚¬ÂÃƒÂ Ã‚Â¹Ã¢â‚¬Â°ÃƒÂ Ã‚Â¸Ã‚Â§ÃƒÂ Ã‚Â¸Ã‚Â¢ÃƒÂ Ã‚Â¸Ã‚Â­ÃƒÂ Ã‚Â¸Ã‚ÂµÃƒÂ Ã‚Â¹Ã¢â€šÂ¬ÃƒÂ Ã‚Â¸Ã‚Â¡ÃƒÂ Ã‚Â¸Ã‚Â¥ÃƒÂ Ã‚Â¹Ã‚ÂÃƒÂ Ã‚Â¸Ã‚Â¥ÃƒÂ Ã‚Â¸Ã‚Â°ÃƒÂ Ã‚Â¸Ã‚Â£ÃƒÂ Ã‚Â¸Ã‚Â«ÃƒÂ Ã‚Â¸Ã‚Â±ÃƒÂ Ã‚Â¸Ã‚ÂªÃƒÂ Ã‚Â¸Ã…â€œÃƒÂ Ã‚Â¹Ã‹â€ ÃƒÂ Ã‚Â¸Ã‚Â²ÃƒÂ Ã‚Â¸Ã¢â€žÂ¢)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `discord_id` varchar(32) DEFAULT NULL,
  `discriminator` varchar(8) DEFAULT '0',
  `avatar` varchar(128) DEFAULT NULL,
  `points` int(10) unsigned NOT NULL DEFAULT 0,
  `role` varchar(50) NOT NULL DEFAULT 'member',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_login` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `discord_id` (`discord_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Products (scripts)
CREATE TABLE IF NOT EXISTS `products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `license_key` varchar(255) DEFAULT NULL,
  `description` text,
  `extra_info` text,
  `changelog_text` text,
  `version_label` varchar(50) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `is_free` tinyint(1) NOT NULL DEFAULT 0,
  `point_price` int(10) unsigned NOT NULL DEFAULT 0,
  `stock_quantity` int(10) unsigned NOT NULL DEFAULT 1,
  `category` varchar(50) NOT NULL DEFAULT 'all',
  `image_url` varchar(500) DEFAULT NULL,
  `review_video_url` varchar(500) DEFAULT NULL,
  `download_url` varchar(500) DEFAULT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- License keys (for redemption): ÃƒÂ Ã‚Â¸Ã¢â‚¬ÂºÃƒÂ Ã‚Â¸Ã‚Â£ÃƒÂ Ã‚Â¸Ã‚Â°ÃƒÂ Ã‚Â¹Ã¢â€šÂ¬ÃƒÂ Ã‚Â¸Ã‚Â ÃƒÂ Ã‚Â¸Ã¢â‚¬â€ product = ÃƒÂ Ã‚Â¹Ã‚ÂÃƒÂ Ã‚Â¸Ã‚Â¥ÃƒÂ Ã‚Â¸Ã‚ÂÃƒÂ Ã‚Â¸Ã‚Â£ÃƒÂ Ã‚Â¸Ã‚Â°ÃƒÂ Ã‚Â¸Ã…Â¡ÃƒÂ Ã‚Â¸Ã…Â¡, points = ÃƒÂ Ã‚Â¹Ã‚ÂÃƒÂ Ã‚Â¸Ã‚Â¥ÃƒÂ Ã‚Â¸Ã‚ÂÃƒÂ Ã‚Â¸Ã…Â¾ÃƒÂ Ã‚Â¹Ã¢â‚¬Â°ÃƒÂ Ã‚Â¸Ã‚Â­ÃƒÂ Ã‚Â¸Ã‚Â¢
CREATE TABLE IF NOT EXISTS `license_keys` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `key_type` varchar(20) NOT NULL DEFAULT 'product',
  `product_id` int(10) unsigned DEFAULT NULL,
  `point_amount` int(10) unsigned NOT NULL DEFAULT 0,
  `code` varchar(64) NOT NULL,
  `max_uses` int(10) unsigned NOT NULL DEFAULT 1,
  `used_count` int(10) unsigned NOT NULL DEFAULT 0,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `product_id` (`product_id`),
  KEY `key_type` (`key_type`),
  KEY `is_active` (`is_active`),
  CONSTRAINT `lk_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Redemptions (user used a key)
CREATE TABLE IF NOT EXISTS `redemptions` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `license_key_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `license_key_id` (`license_key_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `red_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `red_key` FOREIGN KEY (`license_key_id`) REFERENCES `license_keys` (`id`) ON DELETE CASCADE,
  CONSTRAINT `red_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User products (what each user owns after redemption)
CREATE TABLE IF NOT EXISTS `user_products` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `redemption_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_product` (`user_id`,`product_id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `up_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `up_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `up_redemption` FOREIGN KEY (`redemption_id`) REFERENCES `redemptions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Orders (ÃƒÂ Ã‚Â¸Ã¢â‚¬Å¾ÃƒÂ Ã‚Â¸Ã‚Â³ÃƒÂ Ã‚Â¸Ã‚ÂªÃƒÂ Ã‚Â¸Ã‚Â±ÃƒÂ Ã‚Â¹Ã‹â€ ÃƒÂ Ã‚Â¸Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¸Ã¢â‚¬Â¹ÃƒÂ Ã‚Â¸Ã‚Â·ÃƒÂ Ã‚Â¹Ã¢â‚¬Â°ÃƒÂ Ã‚Â¸Ã‚Â­)
-- Script licenses (used by verification API + IP lock)
CREATE TABLE IF NOT EXISTS `licenses` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned DEFAULT NULL,
  `product_id` int(10) unsigned DEFAULT NULL,
  `license_key` varchar(255) NOT NULL,
  `locked_ip` varchar(45) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_shared_key` tinyint(1) NOT NULL DEFAULT 0,
  `master_key_id` int(10) unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_license_user_product` (`license_key`, `user_id`, `product_id`),
  KEY `idx_license_key_only` (`license_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_product_id` (`product_id`),
  KEY `idx_master_key_id` (`master_key_id`),
  CONSTRAINT `fk_master_key` FOREIGN KEY (`master_key_id`) REFERENCES `licenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `user_id` int(10) unsigned NOT NULL,
  `product_id` int(10) unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `admin_note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `product_id` (`product_id`),
  KEY `status` (`status`),
  CONSTRAINT `ord_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ord_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limit log (optional, for redeem/login throttling)
CREATE TABLE IF NOT EXISTS `rate_limit` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `identifier` varchar(128) NOT NULL,
  `action` varchar(32) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `identifier_action` (`identifier`,`action`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- Sample product (optional)
INSERT INTO `products` (`name`, `slug`, `description`, `price`, `is_free`, `is_active`) VALUES
('Nap Garage', 'nap-garage', 'ÃƒÂ Ã‚Â¸Ã‚Â£ÃƒÂ Ã‚Â¸Ã‚Â°ÃƒÂ Ã‚Â¸Ã…Â¡ÃƒÂ Ã‚Â¸Ã…Â¡ÃƒÂ Ã‚Â¸Ã‚ÂÃƒÂ Ã‚Â¸Ã‚Â²ÃƒÂ Ã‚Â¸Ã‚Â£ÃƒÂ Ã‚Â¸Ã‚Â²ÃƒÂ Ã‚Â¸Ã‹â€  FiveM ÃƒÂ Ã‚Â¹Ã‚ÂÃƒÂ Ã‚Â¸Ã…Â¡ÃƒÂ Ã‚Â¸Ã…Â¡ÃƒÂ Ã‚Â¸Ã¢â‚¬Å¾ÃƒÂ Ã‚Â¸Ã‚Â£ÃƒÂ Ã‚Â¸Ã…Â¡ÃƒÂ Ã‚Â¸Ã‚Â§ÃƒÂ Ã‚Â¸Ã¢â‚¬Â¡ÃƒÂ Ã‚Â¸Ã‹â€ ÃƒÂ Ã‚Â¸Ã‚Â£', 0.00, 1, 1);
