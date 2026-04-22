-- Add tier column to users table.
-- Stores the user's subscription tier ('bronze', 'silver', 'gold') from Base.
-- Previously, syncBaseUser accepted tier but silently discarded it.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tier text;
