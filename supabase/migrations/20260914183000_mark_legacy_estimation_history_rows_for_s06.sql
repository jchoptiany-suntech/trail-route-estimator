update public.route_estimation_history
set is_legacy = true
where created_at < statement_timestamp();
