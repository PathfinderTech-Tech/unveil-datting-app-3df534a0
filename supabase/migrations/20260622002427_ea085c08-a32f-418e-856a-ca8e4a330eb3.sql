UPDATE public.ai_rate_limits SET daily_limit = 0  WHERE tier = 'free';
UPDATE public.ai_rate_limits SET daily_limit = 5  WHERE tier = 'two_week_pass';
UPDATE public.ai_rate_limits SET daily_limit = 20 WHERE tier = 'premium_monthly';
UPDATE public.ai_rate_limits SET daily_limit = 20 WHERE tier = 'premium_quarterly';
UPDATE public.ai_rate_limits SET daily_limit = 50 WHERE tier = 'premium_annual';