-- =====================================================================
-- 0003_seed.sql: Initial bots, knowledge base, approved sources, scoring config
-- =====================================================================

-- 20 bots from PDF section 2 (1-5 enabled for MVP)
insert into bots (id, code, name, department, category, enabled, mvp, config) values
 (1,'website_discovery','Website opportunity discovery','A','website',true,true,
  '{"prompt_hint":"Website design, redevelopment, maintenance and CMS migration","max_queries":3,"max_candidates":25}'::jsonb),
 (2,'mobile_app_discovery','Mobile app opportunity discovery','A','mobile_app',true,true,
  '{"prompt_hint":"Mobile app development for iOS, Android or cross-platform (Flutter/React Native)","max_queries":3,"max_candidates":25}'::jsonb),
 (3,'custom_software_discovery','Custom software discovery','A','custom_software',true,true,
  '{"prompt_hint":"Custom software, client/partner portals, internal web tools and platforms","max_queries":3,"max_candidates":25}'::jsonb),
 (4,'ai_solution_discovery','AI solution discovery','A','ai_solution',true,true,
  '{"prompt_hint":"AI solutions including chatbots, intelligent assistants, document processing and LLM integration","max_queries":3,"max_candidates":25}'::jsonb),
 (5,'workflow_automation_discovery','Workflow automation discovery','A','workflow_automation',true,true,
  '{"prompt_hint":"Workflow automation, process optimization, RPA and API/system integrations","max_queries":3,"max_candidates":25}'::jsonb),
 (6,'public_project_request_finder','Public project request finder','B',null,false,false,'{}'::jsonb),
 (7,'tech_hiring_signal_analyst','Technology hiring signal analyst','B',null,false,false,'{}'::jsonb),
 (8,'crm_erp_opportunity_finder','CRM/ERP opportunity finder','B',null,false,false,'{}'::jsonb),
 (9,'digital_presence_review','Digital presence review','B',null,false,false,'{}'::jsonb),
 (10,'it_outsourcing_partner_finder','IT outsourcing partner finder','B',null,false,false,'{}'::jsonb),
 (11,'company_profile_researcher','Company profile researcher','C',null,false,false,'{}'::jsonb),
 (12,'decision_maker_researcher','Decision-maker researcher','C',null,false,false,'{}'::jsonb),
 (13,'business_contact_channel_finder','Business contact channel finder','C',null,false,false,'{}'::jsonb),
 (14,'technology_footprint_researcher','Technology footprint researcher','C',null,false,false,'{}'::jsonb),
 (15,'opportunity_gap_analyst','Opportunity gap analyst','C',null,false,false,'{}'::jsonb),
 (16,'requirement_extractor','Requirement extractor','D',null,false,false,'{}'::jsonb),
 (17,'complexity_estimator','Complexity estimator','D',null,false,false,'{}'::jsonb),
 (18,'ict_service_matcher','ICT service matcher','D',null,false,false,'{}'::jsonb),
 (19,'verification_deduplication','Verification and deduplication','D',null,false,false,'{}'::jsonb),
 (20,'opportunity_report_writer','Opportunity report writer','D',null,false,false,'{}'::jsonb)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  department = excluded.department,
  category = excluded.category,
  enabled = excluded.enabled,
  mvp = excluded.mvp,
  config = excluded.config;

-- D1-DEV-03: Knowledge Base / Service Profile (Approved for Infiniti Code Tech)
insert into service_profile (service_key, name, category, description, keywords, technologies, active, approved_by_owner) values
 ('website_development',
  'Website Design, Redevelopment & Maintenance',
  'website',
  'Modern corporate websites, redesigns, web portals, headless CMS setups, and ongoing maintenance.',
  '{website,web design,redesign,redevelopment,cms,web development,wordpress,nextjs}',
  '{Next.js,React,TailwindCSS,Node.js,WordPress,Headless CMS}',
  true, true),

 ('mobile_app_development',
  'Mobile Application Development (iOS, Android, Cross-platform)',
  'mobile_app',
  'Native and cross-platform mobile apps for consumer and enterprise use.',
  '{mobile app,ios,android,cross-platform,flutter,react native,mobile application}',
  '{Flutter,React Native,Swift,Kotlin}',
  true, true),

 ('custom_software',
  'Custom Software, Web Platforms & Portals',
  'custom_software',
  'Tailored web applications, internal operational tools, B2B portals, and bespoke SaaS platforms.',
  '{custom software,portal,platform,internal tool,web application,bespoke,saas}',
  '{TypeScript,Node.js,Python,PostgreSQL,Supabase,Next.js}',
  true, true),

 ('ai_solutions',
  'AI Solutions, Agents & Intelligent Document Processing',
  'ai_solution',
  'Custom conversational agents, customer service bots, OCR document extraction, and LLM integrations.',
  '{chatbot,ai assistant,document processing,llm,machine learning,ai integration,rag}',
  '{OpenAI,Ollama,LangChain,Python,FastAPI,Vector DBs}',
  true, true),

 ('workflow_automation',
  'Workflow Automation, API Integration & System Sync',
  'workflow_automation',
  'End-to-end process automation connecting CRMs, ERPs, accounting, and communication tools.',
  '{workflow automation,process automation,integration,rpa,automate,webhook,n8n}',
  '{n8n,Zapier,Make,REST APIs,Webhooks}',
  true, true),

 ('crm_erp_integration',
  'CRM & ERP Systems Implementation and Integration',
  'custom_software',
  'Integration and custom extension for CRM/ERP systems including HubSpot, Salesforce, and Zoho.',
  '{crm,erp,customer management,system integration,salesforce,hubspot}',
  '{HubSpot API,Salesforce API,PostgreSQL,REST APIs}',
  true, true),

 ('it_outsourcing',
  'Dedicated IT Delivery & Engineering Partner',
  'other',
  'Dedicated engineering teams, technical staff augmentation, and fractional CTO/advisory.',
  '{outsourcing,development partner,it delivery,staff augmentation,engineering team}',
  '{Full-stack software engineering,DevOps,QA}',
  true, true)
on conflict (service_key) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  keywords = excluded.keywords,
  technologies = excluded.technologies,
  active = excluded.active,
  approved_by_owner = excluded.approved_by_owner;

-- D1-DEV-03: KB Settings
insert into kb_settings (key, value) values
 ('target_industries', '["technology","finance_insurance","healthcare","retail_ecommerce","professional_services","logistics_transport","education","manufacturing"]'::jsonb),
 ('target_markets', '["US","GB","CA","AU","EU","AE","IN"]'::jsonb),
 ('preferred_project_types', '["new_build","modernization","redevelopment","integration","automation"]'::jsonb),
 ('delivery_capabilities', '["fixed_price_milestone","dedicated_team","time_and_materials"]'::jsonb),
 ('min_project_criteria', '{"exclude_keywords":["internship","volunteer","unpaid","free of charge","equity only"],"min_budget_hint":1000}'::jsonb)
on conflict (key) do update set
  value = excluded.value;

-- D1-DEV-05: Register 3 approved, terms-reviewed sources
insert into sources (name, source_type, base_url, terms_url, terms_reviewed, terms_reviewed_at, automated_collection_allowed, reliability_score, enabled, bot_ids, config, notes) values
 ('Brave Search API',
  'search_api',
  'https://api.search.brave.com/res/v1/web/search',
  'https://brave.com/search/api/terms/',
  true, now(), true, 85, true, '{1,2,3,4,5}',
  '{"endpoint":"https://api.search.brave.com/res/v1/web/search","credential":"brave_search_api_key","results_per_query":10,"freshness":"pm"}'::jsonb,
  'Official commercial search API terms permit automated querying within rate limits.'),

 ('Public RFP & Tender RSS Feeds',
  'rss',
  'https://www.contractsfinder.service.gov.uk',
  'https://www.contractsfinder.service.gov.uk/terms-and-conditions',
  true, now(), true, 90, true, '{1,2,3,4,5}',
  '{"feed_url":"https://www.contractsfinder.service.gov.uk/Published/Notices/RSS","map":{"url":"link","title":"title","text":"description","published_at":"pubDate"},"text_origin":"feed"}'::jsonb,
  'Open government procurement notices published under Open Government Licence for automated consumption.'),

 ('ICT Curated Seed List',
  'seed_list',
  null,
  'https://infiniticodetech.com/terms',
  true, now(), true, 95, true, '{1,2,3,4,5}',
  '{"table":"seed_urls"}'::jsonb,
  'Manual owner seed list of verified public organization announcement pages.')
on conflict do nothing;

-- Scoring config v1 (PDF Section 10 rubric)
insert into scoring_config (version, weights, thresholds, active) values
 (1,
  '{"explicit":30,"fit":25,"source":20,"identity":15,"scope":10}'::jsonb,
  '{"high":70,"medium":45,"min_publish":25,"max_age_days":180,"recency":{"d30":8,"d90":5,"d180":2,"unknown":2}}'::jsonb,
  true)
on conflict (version) do update set
  weights = excluded.weights,
  thresholds = excluded.thresholds,
  active = excluded.active;
