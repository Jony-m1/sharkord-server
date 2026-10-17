-- before it was rebuilt on upstream 0.0.28, this fork stored "Unlimited" max file size as 0. upstream
-- reads 0 as a limit of nothing, which would refuse every upload, so it becomes upstream's 2GB maximum
UPDATE `settings` SET `storage_upload_max_file_size` = 2147483648 WHERE `storage_upload_max_file_size` = 0;
