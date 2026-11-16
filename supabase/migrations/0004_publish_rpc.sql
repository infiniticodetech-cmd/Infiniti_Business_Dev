-- =====================================================================
-- 0004_publish_rpc.sql: Atomic opportunity publication RPC
-- =====================================================================

create or replace function publish_opportunity(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_evidence_id uuid;
  v_opportunity_id uuid;
  v_company_name text;
  v_norm_name text;
  v_domain text;
  v_canonical_url text;
  v_category opportunity_category;
  v_dedupe_key text;
  v_existing_opp_id uuid;
  v_existing_also_found smallint[];
  v_recent_opp_id uuid;
  v_bot_id smallint;
  v_verification verification_status;
begin
  v_bot_id := (p->>'bot_id')::smallint;
  v_canonical_url := p->>'canonical_url';
  v_category := (p->'opportunity'->>'category')::opportunity_category;
  v_company_name := trim(coalesce(p->'company'->>'name', 'Unknown Company'));
  v_norm_name := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]', '', 'g'));
  v_domain := nullif(trim(p->'company'->>'domain'), '');
  v_verification := coalesce((p->'opportunity'->>'verification')::verification_status, 'verified');

  -- 1. Upsert Company (by domain, or by normalized_name if domain is null)
  if v_domain is not null then
    select id into v_company_id from companies where domain = v_domain;
    if v_company_id is null then
      insert into companies (
        name, normalized_name, domain, official_website, industry, country, city,
        contact_route_type, contact_route_url, contact_email_generic, date_checked
      ) values (
        v_company_name, v_norm_name, v_domain,
        p->'company'->>'official_website',
        p->'company'->>'industry',
        p->'company'->>'country',
        p->'company'->>'city',
        coalesce((p->'company'->>'contact_route_type')::contact_route_type, 'none'),
        p->'company'->>'contact_route_url',
        p->'company'->>'contact_email_generic',
        now()
      ) returning id into v_company_id;
    else
      -- Update without overwriting existing non-null fields with null
      update companies set
        official_website = coalesce(p->'company'->>'official_website', official_website),
        contact_route_type = case when contact_route_type = 'none' then coalesce((p->'company'->>'contact_route_type')::contact_route_type, 'none') else contact_route_type end,
        contact_route_url = coalesce(p->'company'->>'contact_route_url', contact_route_url),
        contact_email_generic = coalesce(p->'company'->>'contact_email_generic', contact_email_generic),
        date_checked = now()
      where id = v_company_id;
    end if;
  else
    select id into v_company_id from companies where domain is null and normalized_name = v_norm_name;
    if v_company_id is null then
      insert into companies (
        name, normalized_name, domain, official_website, industry, country, city,
        contact_route_type, contact_route_url, contact_email_generic, date_checked
      ) values (
        v_company_name, v_norm_name, null,
        p->'company'->>'official_website',
        p->'company'->>'industry',
        p->'company'->>'country',
        p->'company'->>'city',
        coalesce((p->'company'->>'contact_route_type')::contact_route_type, 'none'),
        p->'company'->>'contact_route_url',
        p->'company'->>'contact_email_generic',
        now()
      ) returning id into v_company_id;
    end if;
  end if;

  -- 2. Insert source_evidence
  insert into source_evidence (
    run_id, bot_id, source_id, company_id,
    source_url, canonical_url, source_published_at, date_checked,
    http_status, capture_status, robots_allowed, content_hash, excerpt
  ) values (
    nullif(p->>'run_id', '')::uuid,
    v_bot_id,
    nullif(p->>'source_id', '')::uuid,
    v_company_id,
    p->>'source_url',
    v_canonical_url,
    nullif(p->>'source_published_at', '')::date,
    now(),
    (p->>'http_status')::int,
    'captured',
    coalesce((p->>'robots_allowed')::boolean, true),
    p->>'content_hash',
    p->>'excerpt'
  ) returning id into v_evidence_id;

  -- 3. Compute dedupe_key
  v_dedupe_key := encode(digest(coalesce(v_domain, v_norm_name) || '|' || v_category::text || '|' || v_canonical_url, 'sha256'), 'hex');

  -- 4. Check for existing identical opportunity
  select id, also_found_by into v_existing_opp_id, v_existing_also_found
  from opportunities where dedupe_key = v_dedupe_key;

  if v_existing_opp_id is not null then
    -- Cross-bot duplicate: append bot_id to also_found_by if not present
    if v_bot_id is not null and not (v_bot_id = any(v_existing_also_found)) then
      update opportunities set
        also_found_by = array_append(also_found_by, v_bot_id),
        last_researched_at = now()
      where id = v_existing_opp_id;
    end if;

    return jsonb_build_object(
      'outcome', 'duplicate',
      'opportunity_id', v_existing_opp_id,
      'dedupe_key', v_dedupe_key
    );
  end if;

  -- 5. Check for same company + category within 30 days
  select id into v_recent_opp_id from opportunities
  where company_id = v_company_id
    and category = v_category
    and created_at > now() - interval '30 days'
  order by created_at desc limit 1;

  if v_recent_opp_id is not null then
    v_verification := 'needs_review';
  end if;

  -- 6. Insert Opportunity with status 'new'
  insert into opportunities (
    company_id, evidence_id, assigned_bot_id, also_found_by,
    category, signal, title, stated_requirement, evidence_quote,
    ai_hypotheses, matched_service_keys, scope_clarity,
    score, score_breakdown, score_version, priority, confidence,
    verification, verification_checks, status, dedupe_key,
    possible_duplicate_of, last_researched_at
  ) values (
    v_company_id,
    v_evidence_id,
    v_bot_id,
    '{}',
    v_category,
    (p->'opportunity'->>'signal')::signal_strength,
    p->'opportunity'->>'title',
    p->'opportunity'->>'stated_requirement',
    p->'opportunity'->>'evidence_quote',
    coalesce(p->'opportunity'->'ai_hypotheses', '[]'::jsonb),
    coalesce(array(select jsonb_array_elements_text(p->'opportunity'->'matched_service_keys')), '{}'),
    p->'opportunity'->>'scope_clarity',
    (p->'opportunity'->>'score')::smallint,
    p->'opportunity'->'score_breakdown',
    coalesce((p->'opportunity'->>'score_version')::int, 1),
    (p->'opportunity'->>'priority')::priority_level,
    (p->'opportunity'->>'confidence')::smallint,
    v_verification,
    coalesce(p->'opportunity'->'verification_checks', '{}'::jsonb),
    'new',
    v_dedupe_key,
    v_recent_opp_id,
    now()
  ) returning id into v_opportunity_id;

  -- Record initial status transition in history
  insert into lead_status_history (opportunity_id, from_status, to_status, note)
  values (v_opportunity_id, null, 'new', 'Published by pipeline');

  return jsonb_build_object(
    'outcome', 'published',
    'opportunity_id', v_opportunity_id,
    'dedupe_key', v_dedupe_key
  );
end;
$$;

revoke execute on function publish_opportunity from anon, authenticated;
