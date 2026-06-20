-- รันไฟล์นี้ถ้ามีฐานข้อมูลเดิมจากระบบ Discord แล้วต้องการเปลี่ยนเป็นสมัคร/ล็อกอิน
-- Run in phpMyAdmin or: mysql -u root -p ns_system < sql/migration_email_password.sql

USE `ns_system`;

-- เพิ่มคอลัมน์รหัสผ่าน, ให้ discord_id เป็น null ได้, เพิ่ม unique ที่ email
ALTER TABLE `users`
  ADD COLUMN `password` VARCHAR(255) DEFAULT NULL AFTER `email`,
  MODIFY COLUMN `discord_id` VARCHAR(32) DEFAULT NULL,
  ADD UNIQUE KEY `email` (`email`);

-- ถ้ามี user เดิมจาก Discord ที่ email เป็น NULL ให้ตั้ง email ชั่วคราวเพื่อไม่ชน unique (ถ้าต้องการเก็บข้อมูลเดิม)
-- UPDATE users SET email = CONCAT('discord_', discord_id, '@local') WHERE email IS NULL AND discord_id IS NOT NULL;
