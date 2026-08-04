-- PROCEDURE de Automatizaciones

-- 1. Crear automatizacion
CREATE OR REPLACE PROCEDURE public.sp_create_automation(
    IN p_user_id BIGINT,
    IN p_name VARCHAR(150),
    IN p_trigger_type VARCHAR(20),
    IN p_trigger_provider VARCHAR(50),
    IN p_trigger_event VARCHAR(100),
    IN p_trigger_configuration JSONB,
    IN p_conditions JSONB,
    IN p_actions JSONB,

    OUT p_automation_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_action JSONB;
    v_position INTEGER := 1;
    v_provider VARCHAR(50);
    v_action_name VARCHAR(100);
BEGIN
    IF p_name IS NULL OR BTRIM(p_name) = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'AUTOMATION_NAME_REQUIRED';
    END IF;

    IF p_trigger_type NOT IN ('event', 'schedule') THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_TRIGGER_TYPE';
    END IF;

    IF p_trigger_type = 'event'
       AND (
           p_trigger_provider <> 'github'
           OR p_trigger_event <> 'issue.created'
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_EVENT_TRIGGER';
    END IF;

    IF p_trigger_type = 'schedule'
       AND (
           p_trigger_provider <> 'system'
           OR p_trigger_event <> 'cron'
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_SCHEDULE_TRIGGER';
    END IF;

    IF p_actions IS NULL
       OR JSONB_TYPEOF(p_actions) <> 'array'
       OR JSONB_ARRAY_LENGTH(p_actions) = 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'AT_LEAST_ONE_ACTION_REQUIRED';
    END IF;

    INSERT INTO public.automations (
        user_id,
        name,
        trigger_type,
        trigger_provider,
        trigger_event,
        trigger_configuration,
        conditions
    )
    VALUES (
        p_user_id,
        BTRIM(p_name),
        LOWER(BTRIM(p_trigger_type)),
        LOWER(BTRIM(p_trigger_provider)),
        LOWER(BTRIM(p_trigger_event)),
        COALESCE(p_trigger_configuration, '{}'::jsonb),
        COALESCE(p_conditions, '[]'::jsonb)
    )
    RETURNING id
    INTO p_automation_id;

    FOR v_action IN
        SELECT value
        FROM JSONB_ARRAY_ELEMENTS(p_actions)
    LOOP
        v_provider := LOWER(BTRIM(v_action ->> 'provider'));
        v_action_name := LOWER(BTRIM(v_action ->> 'actionName'));

        IF NOT (
            (v_provider = 'google' AND v_action_name = 'send_email')
            OR
            (
                v_provider = 'github'
                AND v_action_name IN ('create_issue', 'add_comment')
            )
        ) THEN
            RAISE EXCEPTION USING
                ERRCODE = '22023',
                MESSAGE = 'INVALID_ACTION';
        END IF;

        INSERT INTO public.automation_actions (
            automation_id,
            position,
            provider,
            action_name,
            configuration
        )
        VALUES (
            p_automation_id,
            v_position,
            v_provider,
            v_action_name,
            COALESCE(v_action -> 'configuration', '{}'::jsonb)
        );

        v_position := v_position + 1;
    END LOOP;
END;
$$;

-- 2. Obtener automatizacion
CREATE OR REPLACE PROCEDURE public.sp_get_automations(
    IN p_user_id BIGINT,
    OUT p_automations JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT COALESCE(
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'id', automation.id,
                'name', automation.name,

                'triggerType',
                    automation.trigger_type,

                'triggerProvider',
                    automation.trigger_provider,

                'triggerEvent',
                    automation.trigger_event,

                'triggerConfiguration',
                    automation.trigger_configuration,

                'conditions',
                    automation.conditions,

                'isActive',
                    automation.is_active,

                'createdAt',
                    automation.created_at,

                'updatedAt',
                    automation.updated_at,

                'actions',
                    COALESCE(
                        (
                            SELECT JSONB_AGG(
                                JSONB_BUILD_OBJECT(
                                    'id', action.id,
                                    'position', action.position,
                                    'provider', action.provider,
                                    'actionName', action.action_name,
                                    'configuration', action.configuration
                                )
                                ORDER BY action.position
                            )
                            FROM public.automation_actions AS action
                            WHERE action.automation_id = automation.id
                        ),
                        '[]'::JSONB
                    )
            )
            ORDER BY automation.id DESC
        ),
        '[]'::JSONB
    )
    INTO p_automations
    FROM public.automations AS automation
    WHERE automation.user_id = p_user_id;
END;
$$;

-- 3. Editar automatizaciones
CREATE OR REPLACE PROCEDURE public.sp_update_automation(
    IN p_automation_id BIGINT,
    IN p_user_id BIGINT,
    IN p_name VARCHAR(150),
    IN p_trigger_type VARCHAR(20),
    IN p_trigger_provider VARCHAR(50),
    IN p_trigger_event VARCHAR(100),
    IN p_trigger_configuration JSONB,
    IN p_conditions JSONB,
    IN p_actions JSONB,
    IN p_is_active BOOLEAN,

    OUT p_updated BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_action JSONB;
    v_position INTEGER := 1;
    v_provider VARCHAR(50);
    v_action_name VARCHAR(100);

    v_trigger_type VARCHAR(20);
    v_trigger_provider VARCHAR(50);
    v_trigger_event VARCHAR(100);
BEGIN
    p_updated := FALSE;

    v_trigger_type :=
        LOWER(BTRIM(p_trigger_type));

    v_trigger_provider :=
        LOWER(BTRIM(p_trigger_provider));

    v_trigger_event :=
        LOWER(BTRIM(p_trigger_event));

    IF p_name IS NULL
       OR BTRIM(p_name) = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'AUTOMATION_NAME_REQUIRED';
    END IF;

    IF v_trigger_type NOT IN (
        'event',
        'schedule'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_TRIGGER_TYPE';
    END IF;

    IF v_trigger_type = 'event'
       AND (
           v_trigger_provider <> 'github'
           OR v_trigger_event <> 'issue.created'
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_EVENT_TRIGGER';
    END IF;

    IF v_trigger_type = 'schedule'
       AND (
           v_trigger_provider <> 'system'
           OR v_trigger_event <> 'cron'
       ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_SCHEDULE_TRIGGER';
    END IF;

    IF p_conditions IS NOT NULL
       AND JSONB_TYPEOF(p_conditions) <> 'array' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_CONDITIONS';
    END IF;

    IF p_actions IS NULL
       OR JSONB_TYPEOF(p_actions) <> 'array'
       OR JSONB_ARRAY_LENGTH(p_actions) = 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'AT_LEAST_ONE_ACTION_REQUIRED';
    END IF;

    UPDATE public.automations
    SET
        name = BTRIM(p_name),
        trigger_type = v_trigger_type,
        trigger_provider = v_trigger_provider,
        trigger_event = v_trigger_event,
        trigger_configuration =
            COALESCE(
                p_trigger_configuration,
                '{}'::jsonb
            ),
        conditions =
            COALESCE(
                p_conditions,
                '[]'::jsonb
            ),
        is_active =
            COALESCE(
                p_is_active,
                TRUE
            ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_automation_id
      AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    DELETE FROM public.automation_actions
    WHERE automation_id = p_automation_id;

    FOR v_action IN
        SELECT value
        FROM JSONB_ARRAY_ELEMENTS(p_actions)
    LOOP
        v_provider :=
            LOWER(
                BTRIM(v_action ->> 'provider')
            );

        v_action_name :=
            LOWER(
                BTRIM(v_action ->> 'actionName')
            );

        IF NOT (
            (
                v_provider = 'google'
                AND v_action_name = 'send_email'
            )
            OR
            (
                v_provider = 'github'
                AND v_action_name IN (
                    'create_issue',
                    'add_comment'
                )
            )
        ) THEN
            RAISE EXCEPTION USING
                ERRCODE = '22023',
                MESSAGE = 'INVALID_ACTION';
        END IF;

        INSERT INTO public.automation_actions (
            automation_id,
            position,
            provider,
            action_name,
            configuration
        )
        VALUES (
            p_automation_id,
            v_position,
            v_provider,
            v_action_name,
            COALESCE(
                v_action -> 'configuration',
                '{}'::jsonb
            )
        );

        v_position := v_position + 1;
    END LOOP;

    p_updated := TRUE;
END;
$$;

-- 4. Eliminar automatizaciones
CREATE OR REPLACE PROCEDURE public.sp_delete_automation(
    IN p_automation_id BIGINT,
    IN p_user_id BIGINT,

    OUT p_deleted BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    DELETE FROM public.automations
    WHERE id = p_automation_id
      AND user_id = p_user_id;

    GET DIAGNOSTICS
        v_affected_rows = ROW_COUNT;

    p_deleted := v_affected_rows > 0;
END;
$$;

-- 5 Desactivar o activar automatizacion
CREATE OR REPLACE PROCEDURE public.sp_toggle_automation(
    IN p_automation_id BIGINT,
    IN p_user_id BIGINT,
    IN p_is_active BOOLEAN,

    OUT p_updated BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    UPDATE public.automations
    SET
        is_active = p_is_active,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_automation_id
      AND user_id = p_user_id;

    GET DIAGNOSTICS
        v_affected_rows = ROW_COUNT;

    p_updated := v_affected_rows > 0;
END;
$$;