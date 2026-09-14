drop policy if exists "route_estimation_history_delete_own" on public.route_estimation_history;
create policy "route_estimation_history_delete_own"
on public.route_estimation_history
for delete
to authenticated
using (auth.uid() = user_id);
