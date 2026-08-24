-- Drop the existing incomplete policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with both USING and WITH CHECK
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);