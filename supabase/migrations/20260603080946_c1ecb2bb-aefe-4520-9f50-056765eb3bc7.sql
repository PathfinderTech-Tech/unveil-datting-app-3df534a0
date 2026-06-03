
ALTER TABLE public.personality_blueprint ADD COLUMN IF NOT EXISTS leadership_style text;

CREATE OR REPLACE FUNCTION public.compute_readiness_score(_uid uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ans int; _ans_rel int; _ans_val int; _ans_per int;
  _bp int; _onb_data jsonb;
  _comm int; _commit int; _emo int; _vals int; _goals int; _total int;
  _emo_game int;
BEGIN
  SELECT count(*) INTO _ans FROM public.daily_answers WHERE user_id = _uid;
  SELECT count(*) INTO _ans_rel FROM public.daily_answers da
    JOIN public.daily_questions dq ON dq.id = da.question_id
    WHERE da.user_id = _uid AND dq.category = 'relationship';
  SELECT count(*) INTO _ans_val FROM public.daily_answers da
    JOIN public.daily_questions dq ON dq.id = da.question_id
    WHERE da.user_id = _uid AND dq.category = 'values';
  SELECT count(*) INTO _ans_per FROM public.daily_answers da
    JOIN public.daily_questions dq ON dq.id = da.question_id
    WHERE da.user_id = _uid AND dq.category = 'personality';

  SELECT answers INTO _onb_data FROM public.onboarding_answers WHERE user_id = _uid;
  SELECT count(*) FILTER (WHERE communication_style IS NOT NULL)
       + count(*) FILTER (WHERE attachment_style IS NOT NULL)
       + count(*) FILTER (WHERE conflict_style IS NOT NULL)
       + count(*) FILTER (WHERE relationship_style IS NOT NULL)
       + count(*) FILTER (WHERE leadership_style IS NOT NULL)
    INTO _bp FROM public.personality_blueprint WHERE user_id = _uid;

  SELECT COALESCE(MAX(emotional_score),0) INTO _emo_game FROM public.game_results WHERE user_id = _uid;

  _comm   := LEAST(100, 40 + _ans_rel * 5 + (CASE WHEN _bp >= 1 THEN 25 ELSE 0 END));
  _commit := LEAST(100, 40 + _ans_rel * 4 + (CASE WHEN _onb_data->'discover'->>'intent' IS NOT NULL THEN 30 ELSE 0 END));
  _emo    := LEAST(100, 30 + _bp * 10 + _ans_per * 3 + LEAST(20, _emo_game/5));
  _vals   := LEAST(100, 30 + _ans_val * 6
                          + (CASE WHEN _onb_data->'discover'->'politics' IS NOT NULL THEN 15 ELSE 0 END)
                          + (CASE WHEN _onb_data->'discover'->'priorities' IS NOT NULL THEN 15 ELSE 0 END));
  _goals  := LEAST(100, 40 + (CASE WHEN _onb_data->'discover'->>'horizon' IS NOT NULL THEN 25 ELSE 0 END)
                          + (CASE WHEN _onb_data->'discover'->>'speed' IS NOT NULL THEN 20 ELSE 0 END)
                          + _ans_val * 3);
  _total := ROUND(_comm*0.22 + _commit*0.22 + _emo*0.20 + _vals*0.18 + _goals*0.18);

  UPDATE public.profiles SET
    readiness_score = _total,
    readiness_breakdown = jsonb_build_object(
      'communication', _comm,
      'emotional_intelligence', _emo,
      'commitment', _commit,
      'goals', _goals,
      'values', _vals
    )
  WHERE id = _uid;

  RETURN _total;
END $function$;
