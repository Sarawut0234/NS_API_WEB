-- รูปภาพและคลิปรีวิวของสินค้า
-- รันใน phpMyAdmin หรือใช้ setup/run-migration.php

USE `ns_system`;

ALTER TABLE `products` ADD COLUMN `image_url` VARCHAR(500) DEFAULT NULL;
ALTER TABLE `products` ADD COLUMN `review_video_url` VARCHAR(500) DEFAULT NULL;
