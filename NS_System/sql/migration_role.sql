-- ระบบยศ (role): member = สมาชิก, admin = เข้าแผงแอดมินได้
-- รันใน phpMyAdmin หรือใช้ setup/run-migration.php

USE `ns_system`;

ALTER TABLE `users` ADD COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'member';

-- ตัวอย่าง: ตั้งยศแอดมินให้ user id 1
-- UPDATE `users` SET role = 'admin' WHERE id = 1;
