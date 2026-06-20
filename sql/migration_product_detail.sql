-- Add product detail fields for new View More layout
ALTER TABLE `products` ADD COLUMN `extra_info` TEXT DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN `changelog_text` TEXT DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN `version_label` VARCHAR(50) DEFAULT NULL;
