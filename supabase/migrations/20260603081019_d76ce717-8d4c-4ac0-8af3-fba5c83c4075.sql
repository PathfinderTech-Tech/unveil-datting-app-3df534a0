
ALTER TABLE public.daily_questions DROP CONSTRAINT IF EXISTS daily_questions_category_check;
ALTER TABLE public.daily_questions ADD CONSTRAINT daily_questions_category_check
  CHECK (category IN ('relationship','values','personality','challenge'));
