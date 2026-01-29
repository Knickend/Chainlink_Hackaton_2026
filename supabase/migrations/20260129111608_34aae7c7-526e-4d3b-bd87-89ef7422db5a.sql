-- Allow admins to view all profiles for analytics
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read all asset data for analytics
CREATE POLICY "Admins can view all assets for analytics"
  ON assets FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to read all debt data for analytics
CREATE POLICY "Admins can view all debts for analytics"
  ON debts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));