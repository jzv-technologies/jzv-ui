| table_name       | columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin_users_view | [{"column":"user_id","type":"uuid","nullable":"YES","default":null},{"column":"email","type":"character varying","nullable":"YES","default":null},{"column":"full_name","type":"text","nullable":"YES","default":null},{"column":"role_ids","type":"text","nullable":"YES","default":null},{"column":"student_ids","type":"text","nullable":"YES","default":null}]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| applications     | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"student_name","type":"character varying","nullable":"NO","default":null},{"column":"date_of_birth","type":"date","nullable":"NO","default":null},{"column":"parent_name","type":"character varying","nullable":"NO","default":null},{"column":"mobile_no","type":"character varying","nullable":"NO","default":null},{"column":"address","type":"text","nullable":"NO","default":null},{"column":"area","type":"character varying","nullable":"NO","default":null},{"column":"city","type":"character varying","nullable":"NO","default":null},{"column":"pincode","type":"character varying","nullable":"NO","default":null},{"column":"last_school_attended","type":"character varying","nullable":"NO","default":null},{"column":"last_class_attended","type":"character varying","nullable":"NO","default":null},{"column":"fathers_education","type":"character varying","nullable":"NO","default":null},{"column":"mothers_education","type":"character varying","nullable":"NO","default":null},{"column":"fathers_occupation","type":"character varying","nullable":"NO","default":null},{"column":"status","type":"character varying","nullable":"NO","default":"'pending'::character varying"},{"column":"entrance_exam_date","type":"date","nullable":"YES","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"},{"column":"updated_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"},{"column":"application_id","type":"character varying","nullable":"NO","default":"''::character varying"}] |

| class_assignments | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"class_id","type":"bigint","nullable":"NO","default":null},{"column":"teacher_id","type":"bigint","nullable":"NO","default":null},{"column":"subject_id","type":"bigint","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| classes | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"name","type":"character varying","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| dynamic_form_configs | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"uuid","type":"character varying","nullable":"NO","default":null},{"column":"fields","type":"jsonb","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"},{"column":"updated_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| periods | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"period_number","type":"integer","nullable":"NO","default":null},{"column":"name","type":"character varying","nullable":"NO","default":null},{"column":"start_time","type":"time without time zone","nullable":"YES","default":null},{"column":"end_time","type":"time without time zone","nullable":"YES","default":null},{"column":"is_break","type":"boolean","nullable":"NO","default":"false"},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| students | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"admission_no","type":"character varying","nullable":"NO","default":null},{"column":"edsoft_id","type":"character varying","nullable":"YES","default":null},{"column":"student_name","type":"character varying","nullable":"NO","default":null},{"column":"birth_date","type":"date","nullable":"YES","default":null},{"column":"age","type":"integer","nullable":"YES","default":null},{"column":"gender","type":"character varying","nullable":"YES","default":null},{"column":"father_name","type":"character varying","nullable":"YES","default":null},{"column":"class_id","type":"bigint","nullable":"YES","default":null},{"column":"mobile1","type":"character varying","nullable":"YES","default":null},{"column":"mobile2","type":"character varying","nullable":"YES","default":null},{"column":"enrollment","type":"character varying","nullable":"YES","default":"'Active'::character varying"},{"column":"hostel","type":"character varying","nullable":"YES","default":"'No'::character varying"},{"column":"transport_point","type":"character varying","nullable":"YES","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"},{"column":"updated_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| subjects | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"name","type":"character varying","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"},{"column":"code","type":"text","nullable":"YES","default":null}] |
| teacher_availability | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"teacher_id","type":"bigint","nullable":"NO","default":null},{"column":"day","type":"character varying","nullable":"NO","default":null},{"column":"period_id","type":"bigint","nullable":"NO","default":null}] |
| teacher_subjects | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"teacher_id","type":"bigint","nullable":"NO","default":null},{"column":"subject_id","type":"bigint","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| teachers | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"name","type":"character varying","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"},{"column":"is_male","type":"boolean","nullable":"YES","default":null}] |
| timetable_settings | [{"column":"key","type":"character varying","nullable":"NO","default":null},{"column":"val","type":"jsonb","nullable":"NO","default":null},{"column":"updated_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| timetable_slots | [{"column":"id","type":"bigint","nullable":"NO","default":null},{"column":"class_id","type":"bigint","nullable":"NO","default":null},{"column":"day","type":"character varying","nullable":"NO","default":null},{"column":"period_id","type":"bigint","nullable":"NO","default":null},{"column":"subject_id","type":"bigint","nullable":"YES","default":null},{"column":"teacher_id","type":"bigint","nullable":"YES","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"YES","default":"CURRENT_TIMESTAMP"}] |
| user_roles | [{"column":"user_id","type":"uuid","nullable":"NO","default":null},{"column":"role_ids","type":"text","nullable":"NO","default":null},{"column":"created_at","type":"timestamp with time zone","nullable":"NO","default":"timezone('utc'::text, now())"},{"column":"student_ids","type":"text","nullable":"YES","default":null}] |

## SQL Migrations

### 1. Add `auth_id` to `teachers` Table
```sql
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

### 2. Syllabus / Curriculum Manager Tables
```sql
-- Create Syllabus Books Table
CREATE TABLE IF NOT EXISTS public.syllabus_books (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id BIGINT NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Syllabus Units Table
CREATE TABLE IF NOT EXISTS public.syllabus_units (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id BIGINT NOT NULL REFERENCES public.syllabus_books(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Syllabus Chapters Table
CREATE TABLE IF NOT EXISTS public.syllabus_chapters (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id BIGINT NOT NULL REFERENCES public.syllabus_units(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create Syllabus Lessons Table
CREATE TABLE IF NOT EXISTS public.syllabus_lessons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chapter_id BIGINT NOT NULL REFERENCES public.syllabus_chapters(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  page_count INTEGER DEFAULT 0,
  complexity VARCHAR(20) CHECK (complexity IN ('Easy', 'Moderate', 'Complex')) DEFAULT 'Easy',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Subject Classifications Table & Relationships
```sql
-- Create Subject Classifications Table
CREATE TABLE IF NOT EXISTS public.subject_classifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed Classifications
INSERT INTO public.subject_classifications (name) VALUES
  ('English Literacy'),
  ('Arabic Literacy'),
  ('Tamil Literacy'),
  ('Urdu Literacy'),
  ('Hadees'),
  ('Tafseer'),
  ('Fiqh'),
  ('10th Board'),
  ('12th Board'),
  ('Modern Education'),
  ('Critical Thinking'),
  ('Personality Development')
ON CONFLICT (name) DO NOTHING;

-- Link subjects table to classifications
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS classification_id BIGINT REFERENCES public.subject_classifications(id) ON DELETE SET NULL;
```


