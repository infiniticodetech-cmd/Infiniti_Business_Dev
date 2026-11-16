-- =====================================================================
-- 0002_security.sql: Functions, triggers, RLS, RPCs, views
-- =====================================================================

-- helpers
create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['bots','service_profile','kb_settings','sources','domain_policy',
                           'companies','opportunities']
  loop
    execute format('drop trigger if exists trg_%1$s_updated on %1$I', t);
    execute format('create trigger trg_%1$s_updated before update on %1$I
                    for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- audit trigger
create or replace function audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(table_name, record_id, action, actor_id, actor_type, old_data, new_data)
  values (
    tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id',
             to_jsonb(new)->>'key', to_jsonb(old)->>'key',
             to_jsonb(new)->>'domain', to_jsonb(old)->>'domain'),
    tg_op,
    auth.uid(),
    case when auth.uid() is null then 'system' else 'user' end,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['opportunities','companies','sources','service_profile','kb_settings',
                           'domain_policy','suppression_list','bots','scoring_config','seed_urls']
  loop
    execute format('drop trigger if exists trg_%1$s_audit on %1$I', t);
    execute format('create trigger trg_%1$s_audit after insert or update or delete on %1$I
                    for each row execute function audit_row_change()', t);
  end loop;
end $$;

-- lead status transitions: humans only, validated, logged (C8, C11)
create or replace function change_lead_status(p_id uuid, p_to lead_status, p_note text default null)
returns opportunities language plpgsql security definer set search_path = public as $$
declare 
  cur lead_status; 
  r opportunities;
begin
  if not is_staff() then 
    raise exception 'not authorized'; 
  end if;

  select status into cur from opportunities where id = p_id for update;
  if cur is null then 
    raise exception 'lead not found'; 
  end if;

  if not (
       (cur = 'new'        and p_to in ('review','not_a_fit'))
    or (cur = 'review'     and p_to in ('approved','not_a_fit'))
    or (cur = 'approved'   and p_to in ('contacted','not_a_fit'))
    or (cur = 'contacted'  and p_to in ('interested','not_a_fit','lost'))
    or (cur = 'interested' and p_to in ('won','lost','not_a_fit'))
  ) then
    raise exception 'invalid status transition % -> %', cur, p_to;
  end if;

  update opportunities set status = p_to where id = p_id returning * into r;
  insert into lead_status_history(opportunity_id, from_status, to_status, changed_by, note)
  values (p_id, cur, p_to, auth.uid(), p_note);

  return r;
end $$;

create or replace function update_reviewer_notes(p_id uuid, p_notes text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then 
    raise exception 'not authorized'; 
  end if;
  update opportunities set reviewer_notes = p_notes where id = p_id;
end $$;

-- seen-URL filter used by n8n (saves fetches and AI calls)
create or replace function filter_unseen_urls(p_urls text[], p_days int default 14)
returns setof text language sql stable as $$
  select u from unnest(p_urls) as u
  where not exists (
    select 1 from source_evidence e
    where e.canonical_url = u and e.date_checked > now() - make_interval(days => p_days)
  );
$$;

-- RLS: read for staff everywhere; writes only via service role or RPCs
do $$
declare t text;
begin
  foreach t in array array['bots','service_profile','kb_settings','sources','seed_urls','domain_policy',
                           'suppression_list','agent_runs','companies','source_evidence','ai_analyses',
                           'scoring_config','opportunities','lead_status_history']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists staff_read on %I', t);
    execute format('create policy staff_read on %I for select to authenticated using (is_staff())', t);
  end loop;

  -- admin-managed configuration tables
  foreach t in array array['bots','service_profile','kb_settings','sources','seed_urls',
                           'domain_policy','suppression_list']
  loop
    execute format('drop policy if exists admin_write on %I', t);
    execute format('create policy admin_write on %I for all to authenticated
                    using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

alter table profiles enable row level security;
drop policy if exists self_read on profiles;
create policy self_read on profiles for select to authenticated using (id = auth.uid() or is_admin());

alter table audit_log enable row level security;
drop policy if exists admin_read_audit on audit_log;
create policy admin_read_audit on audit_log for select to authenticated using (is_admin());
revoke update, delete, truncate on audit_log from anon, authenticated;
revoke update, delete, truncate on lead_status_history from anon, authenticated;

-- dashboard view (respects RLS of the caller)
create or replace view v_leads with (security_invoker = true) as
select o.id,
       c.name                as company_name,
       c.official_website,
       c.industry,
       o.category,
       e.source_url,
       e.source_published_at,
       e.date_checked,
       o.stated_requirement  as evidence_summary,
       o.evidence_quote,
       o.signal,
       c.contact_route_type,
       coalesce(c.contact_route_url, c.contact_email_generic) as contact_route,
       o.priority,
       o.score,
       o.confidence,
       o.verification,
       o.assigned_bot_id,
       b.name                as assigned_bot_name,
       o.also_found_by,
       o.status,
       o.matched_service_keys,
       o.created_at
from opportunities o
join companies c on c.id = o.company_id
join source_evidence e on e.id = o.evidence_id
join bots b on b.id = o.assigned_bot_id;
