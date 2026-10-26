-- drizzle writes the reference without its on delete when it adds a column, so it is spelled out
-- here to match the schema: deleting the banner's file clears the banner instead of being refused
ALTER TABLE `settings` ADD `banner_id` integer REFERENCES files(id) ON DELETE set null;
