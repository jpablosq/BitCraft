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

-- 2. ACTUALIZAR ESTADO DE UNA EJECUCIÓN
CREATE OR REPLACE PROCEDURE public.sp_update_automation_execution_status(
    IN p_execution_id BIGINT,
    IN p_user_id BIGINT,
    IN p_status VARCHAR(20),
    IN p_output_data JSONB,
    IN p_error_message TEXT,

    OUT p_updated BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
    v_affected_rows INTEGER;
BEGIN
    v_status := LOWER(BTRIM(p_status));

    IF v_status NOT IN (
        'processing',
        'success',
        'failed'
    ) THEN
        RAISE EXCEPTION USING
            ERRCODE = '22023',
            MESSAGE = 'INVALID_EXECUTION_STATUS';
    END IF;

    UPDATE public.automation_executions
    SET
        status = v_status,

        attempts = CASE
            WHEN v_status = 'processing'
                THEN attempts + 1
            ELSE attempts
        END,

        started_at = CASE
            WHEN v_status = 'processing'
                THEN COALESCE(
                    started_at,
                    CURRENT_TIMESTAMP
                )
            ELSE started_at
        END,

        finished_at = CASE
            WHEN v_status IN ('success', 'failed')
                THEN CURRENT_TIMESTAMP
            WHEN v_status = 'processing'
                THEN NULL
            ELSE finished_at
        END,

        output_data = CASE
            WHEN v_status = 'success'
                THEN COALESCE(
                    p_output_data,
                    '{}'::jsonb
                )
            ELSE output_data
        END,

        error_message = CASE
            WHEN v_status = 'failed'
                THEN p_error_message
            ELSE NULL
        END

    WHERE id = p_execution_id
      AND user_id = p_user_id;

    GET DIAGNOSTICS
        v_affected_rows = ROW_COUNT;

    p_updated := v_affected_rows > 0;
END;
$$;

-- 3. OBTENER HISTORIAL DE EJECUCIONES
CREATE OR REPLACE PROCEDURE public.sp_get_automation_executions(
    IN p_user_id BIGINT,
    IN p_automation_id BIGINT,
    IN p_limit INTEGER,

    OUT p_executions JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_limit INTEGER;
BEGIN
    v_limit := LEAST(
        GREATEST(COALESCE(p_limit, 50), 1),
        100
    );

    SELECT COALESCE(
        JSONB_AGG(
            TO_JSONB(execution_history)
            ORDER BY execution_history.created_at DESC
        ),
        '[]'::jsonb
    )
    INTO p_executions
    FROM (
        SELECT
            execution.id,
            execution.automation_id,
            automation.name AS automation_name,
            execution.idempotency_key,
            execution.status,
            execution.input_data,
            execution.output_data,
            execution.error_message,
            execution.attempts,
            execution.created_at,
            execution.started_at,
            execution.finished_at,

            CASE
                WHEN execution.started_at IS NULL THEN NULL
                ELSE ROUND(
                    EXTRACT(
                        EPOCH FROM (
                            COALESCE(
                                execution.finished_at,
                                CURRENT_TIMESTAMP
                            ) - execution.started_at
                        )
                    ) * 1000
                )::BIGINT
            END AS duration_ms

        FROM public.automation_executions AS execution

        INNER JOIN public.automations AS automation
            ON automation.id = execution.automation_id

        WHERE execution.user_id = p_user_id
          AND automation.user_id = p_user_id
          AND (
              p_automation_id IS NULL
              OR execution.automation_id = p_automation_id
          )

        ORDER BY execution.created_at DESC
        LIMIT v_limit
    ) AS execution_history;
END;
$$;