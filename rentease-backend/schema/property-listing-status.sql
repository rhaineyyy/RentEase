ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_status varchar NOT NULL DEFAULT 'active';

ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_listing_status_check;

ALTER TABLE properties
  ADD CONSTRAINT properties_listing_status_check
  CHECK (lower(listing_status) IN ('active', 'suspended', 'archived'));
