# Supabase Setup Instructions for JZV Admission Portal

## 1. Create the Applications Table

Run the following SQL query in your Supabase SQL editor to create the applications table:

```sql
-- Create the applications table
CREATE TABLE applications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  student_name VARCHAR(255) NOT NULL,
  date_of_birth DATE NOT NULL,
  parent_name VARCHAR(255) NOT NULL,
  mobile_no VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  area VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  last_school_attended VARCHAR(255) NOT NULL,
  last_class_attended VARCHAR(50) NOT NULL,
  fathers_education VARCHAR(100) NOT NULL,
  mothers_education VARCHAR(100) NOT NULL,
  fathers_occupation VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  entrance_exam_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on student_name for faster searches
CREATE INDEX idx_applications_student_name ON applications USING GIN(to_tsvector('english', student_name));

-- Create an index on mobile_no for faster searches
CREATE INDEX idx_applications_mobile_no ON applications(mobile_no);

-- Create an index on status for filtering
CREATE INDEX idx_applications_status ON applications(status);

-- Create an index on date_of_birth for searches
CREATE INDEX idx_applications_dob ON applications(date_of_birth);
```

## 2. Enable RLS (Row Level Security) - Optional but Recommended

If you want to enable Row Level Security for the applications table, run:

```sql
-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their own applications (public insert)
CREATE POLICY "Enable public insert for applications"
  ON applications
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read all applications (you may want to restrict this later)
CREATE POLICY "Enable read access for all users"
  ON applications
  FOR SELECT
  USING (true);

-- Allow admin users to update applications
-- Note: You'll need to set up authentication roles for this
CREATE POLICY "Enable update for admin users"
  ON applications
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

## 3. Application Status Values

The application uses the following status values:

- `pending` - Application submitted, awaiting review
- `approved` - Application approved, entrance exam scheduled
- `rejected` - Application rejected
- `completed` - Application process complete

## 4. Updating Application Status

To update an application's status and set the entrance exam date:

```sql
UPDATE applications
SET
  status = 'approved',
  entrance_exam_date = '2024-06-15'
WHERE id = <application_id>;
```

## 5. Viewing All Applications

To see all applications in your database:

```sql
SELECT * FROM applications ORDER BY created_at DESC;
```

## 6. Searching Applications

To search by student name:

```sql
SELECT * FROM applications WHERE student_name ILIKE '%search_term%';
```

To search by mobile number:

```sql
SELECT * FROM applications WHERE mobile_no = '1234567890';
```

To search by date of birth and student name:

```sql
SELECT * FROM applications
WHERE student_name ILIKE '%search_term%'
AND date_of_birth = '2000-01-15';
```

## 7. Environment Variables Setup

Make sure your `.env` file has the correct Supabase credentials:

```
VITE_SUPABASE_URL=https://yefnykdexpnttwhxoibl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_rESJl4ZnSWrABEMkerRkrA_LUf_qCMi
```

## 8. Testing the Connection

To test if your Supabase connection is working, you can run a simple query in the browser console:

```javascript
import { supabase } from "./src/utils/supabase";

// Test connection
const { data, error } = await supabase
  .from("applications")
  .select("count(*)")
  .single();

console.log("Total applications:", data);
```

## Notes

- The `entrance_exam_date` field is optional and will be set by administrators when an application is approved
- The `updated_at` field is automatically updated whenever a record is modified (requires trigger setup)
- All timestamps are stored in UTC timezone
- The mobile number field accepts strings to handle international formats

## 9. Create the Dynamic Form Configs Table

Run the following SQL query in your Supabase SQL editor to create the `dynamic_form_configs` table, enable Row Level Security, and set up access control:

```sql
-- Create the dynamic_form_configs table
CREATE TABLE dynamic_form_configs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  uuid VARCHAR(255) UNIQUE NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security)
ALTER TABLE dynamic_form_configs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (so forms can load dynamically for anonymous/non-admin users)
CREATE POLICY "Enable public read access for dynamic_form_configs"
  ON dynamic_form_configs
  FOR SELECT
  USING (true);

-- Allow all operations for authenticated admin users
-- Note: Adjust this policy if your authentication/role schema uses custom claims
CREATE POLICY "Enable write access for authenticated admin users"
  ON dynamic_form_configs
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

## 10. Create the User Roles Table and Admin Users View

Run the following SQL commands in your Supabase SQL editor to create the `user_roles` table, enable Row Level Security, create RLS policies for role-based reading/writing, and build the `admin_users_view` view:

```sql
-- Create the user_roles table if it does not exist
CREATE TABLE IF NOT EXISTS user_roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_ids VARCHAR(255) DEFAULT '',
  student_ids VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Row Level Security) on the user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles

-- 1. Allow authenticated users to read their own roles (required for app boot up)
CREATE POLICY "Allow users to read their own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Allow admin users to perform all operations on user_roles
CREATE POLICY "Allow admin users to manage all roles"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role_ids ILIKE '%A%'
    )
  );

-- Create the admin_users_view (used by the Admin Portal to fetch users and join metadata)
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  u.id AS user_id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name,
  r.role_ids,
  r.student_ids,
  r.created_at,
  r.updated_at
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.user_id;
```
```
