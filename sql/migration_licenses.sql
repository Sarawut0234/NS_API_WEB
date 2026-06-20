-- Create licenses table used by script IP verification
CREATE TABLE IF NOT EXISTS `licenses` (
  `license_key` VARCHAR(255) NOT NULL,
  `allowed_ip` VARCHAR(45) NOT NULL,
  `script_name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`license_key`, `script_name`),
  KEY `idx_script_name` (`script_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
