
-- ============================================================
-- 0005_configure_bots_06_10.sql
-- Configure Bots 06–10 for Infiniti Business Development
-- ============================================================

-- Ensure these bot records exist before configuring them.
-- The original 0003_seed.sql migration should already insert them.

UPDATE public.bots
SET
    config = CASE id

        -- BOT 06: Public Project Request Finder
        WHEN 6 THEN jsonb_build_object(
            'stage', 'public_project_discovery',
            'requires_evidence', true,
            'public_sources_only', true,
            'keywords', jsonb_build_array(
                'tender',
                'request for proposal',
                'RFP',
                'RFQ',
                'procurement',
                'expression of interest',
                'software development',
                'IT services'
            )
        )

        -- BOT 07: Technology Hiring Signal Analyst
        WHEN 7 THEN jsonb_build_object(
            'stage', 'technology_hiring_signals',
            'allow_hiring_signals', true,
            'requires_evidence', true,
            'public_sources_only', true,
            'personal_data_collection', false,
            'keywords', jsonb_build_array(
                'software engineer',
                'AI engineer',
                'machine learning engineer',
                'data engineer',
                'cloud engineer',
                'DevOps engineer',
                'technology team'
            )
        )

        -- BOT 08: CRM/ERP Opportunity Finder
        WHEN 8 THEN jsonb_build_object(
            'stage', 'crm_erp_discovery',
            'requires_evidence', true,
            'public_sources_only', true,
            'keywords', jsonb_build_array(
                'CRM',
                'customer relationship management',
                'ERP',
                'enterprise resource planning',
                'inventory management',
                'business management software',
                'system integration'
            )
        )

        -- BOT 09: Digital Presence Review
        WHEN 9 THEN jsonb_build_object(
            'stage', 'digital_presence_review',
            'requires_evidence', true,
            'public_sources_only', true,
            'keywords', jsonb_build_array(
                'website redesign',
                'website redevelopment',
                'website development',
                'website maintenance',
                'website accessibility',
                'website performance',
                'content management system',
                'digital platform'
            )
        )

        -- BOT 10: IT Outsourcing Partner Finder
        WHEN 10 THEN jsonb_build_object(
            'stage', 'it_outsourcing_discovery',
            'requires_evidence', true,
            'public_sources_only', true,
            'keywords', jsonb_build_array(
                'IT outsourcing',
                'software outsourcing',
                'outsourcing partner',
                'technology partner',
                'managed IT services',
                'application maintenance',
                'software development partner',
                'dedicated development team'
            )
        )

        ELSE config
    END,

    -- Keep disabled until manual testing is complete.
    enabled = false,
    mvp = false,
    updated_at = now()

WHERE id BETWEEN 6 AND 10;


-- Verify configuration
SELECT
    id,
    code,
    name,
    department,
    enabled,
    mvp,
    config
FROM public.bots
WHERE id BETWEEN 6 AND 10
ORDER BY id;
