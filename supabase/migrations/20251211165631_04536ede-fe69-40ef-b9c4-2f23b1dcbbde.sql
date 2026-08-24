-- Add new certification types to the enum
ALTER TYPE certification_type ADD VALUE IF NOT EXISTS 'pat_testing';
ALTER TYPE certification_type ADD VALUE IF NOT EXISTS 'manual_handling';
ALTER TYPE certification_type ADD VALUE IF NOT EXISTS 'food_hygiene';
ALTER TYPE certification_type ADD VALUE IF NOT EXISTS 'health_and_safety';
ALTER TYPE certification_type ADD VALUE IF NOT EXISTS 'coshh';