-- =========================================================
-- BITCRAFT - PROCEDIMIENTOS DE EJECUCIONES
-- Ejecutar después de database/tables.sql
-- =========================================================

CREATE OR REPLACE PROCEDURE public.sp_create_automation_execution(
    IN p_automation_id BIGINT,
    IN p_user_id BIGINT,
    IN p_idempotency_key VARCHAR(255),
    IN p_input_data JSONB,

    OUT p_execution_id BIGINT,
    OUT p_created BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_idempotency_key IS NULL
       OR BTRIM(p_idempotency_key) = '' THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'IDEMPOTENCY_KEY_REQUIRED';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.automations
        WHERE id = p_automation_id
          AND user_id = p_user_id
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'AUTOMATION_NOT_FOUND_OR_INACTIVE';
    END IF;

    INSERT INTO public.automation_executions (
        automation_id,
        user_id,
        idempotency_key,
        status,
        input_data,
        attempts
    )
    VALUES (
        p_automation_id,
        p_user_id,
        BTRIM(p_idempotency_key),
        'pending',
        COALESCE(p_input_data, '{}'::jsonb),
        0
    )
    ON CONFLICT (
        user_id,
        automation_id,
        idempotency_key
    )
    DO NOTHING
    RETURNING id
    INTO p_execution_id;

    IF p_execution_id IS NULL THEN
        SELECT id
        INTO p_execution_id
        FROM public.automation_executions
        WHERE user_id = p_user_id
          AND automation_id = p_automation_id
          AND idempotency_key = BTRIM(p_idempotency_key)
        LIMIT 1;

        p_created := FALSE;
    ELSE
        p_created := TRUE;
    END IF;
END;
$$;