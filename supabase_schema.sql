-- Run this in your Supabase SQL editor

-- Students table
create table students (
  id uuid default gen_random_uuid() primary key,
  student_code text unique not null,
  first_name text not null,
  status text default 'waiting', -- waiting | approved | taking | submitted | disqualified
  approved_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  time_limit_minutes int default 60,
  created_at timestamptz default now()
);

-- Tests table
create table tests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  is_active boolean default false,
  created_at timestamptz default now()
);

-- Questions table
create table questions (
  id uuid default gen_random_uuid() primary key,
  test_id uuid references tests(id) on delete cascade,
  question_number int not null,
  question_text text not null,
  question_type text not null, -- 'multiple_choice' | 'short_answer' | 'extended'
  options jsonb, -- for multiple choice: ["A) ...", "B) ...", "C) ...", "D) ..."]
  correct_answer text, -- for multiple choice
  points int default 1,
  created_at timestamptz default now()
);

-- Answers table
create table answers (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  answer_text text,
  is_correct boolean,
  saved_at timestamptz default now(),
  unique(student_id, question_id)
);

-- Insert default student (Izakiah)
insert into students (student_code, first_name) values ('i11HHaE', 'Izakiah');

-- Insert NOST Math Test
insert into tests (title, description, is_active) values (
  'NOST MATH TEST',
  'Non-Official Estatal Test — 60% of final year math grade. 32 questions.',
  true
);

-- Enable realtime for students table
alter publication supabase_realtime add table students;
alter publication supabase_realtime add table answers;
