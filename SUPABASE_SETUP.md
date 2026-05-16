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
