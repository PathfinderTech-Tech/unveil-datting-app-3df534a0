
ALTER TABLE public.daily_answers DROP CONSTRAINT IF EXISTS daily_answers_user_id_day_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS daily_answers_user_day_question_uq
  ON public.daily_answers (user_id, day_key, question_id);
