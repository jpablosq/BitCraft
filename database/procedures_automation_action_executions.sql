-- PROCEDIMIENTOS PARA EJECUCIONES INDIVIDUALES DE ACCIONES


-- 1. INICIAR O RECUPERAR UNA EJECUCIÓN DE ACCIÓN
CREATE OR REPLACE PROCEDURE public.sp_start_automation_action_execution(
    IN p_execution_id BIGINT,
    IN p_action_position INTEGER,
    IN p_provider VARCHAR(50),
    IN p_action_name VARCHAR(100),

    OUT p_action_execution_id BIGINT,
    OUT p_should_execute BOOLEAN,
    OUT p_result_data JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_status VARCHAR(20);
BEGIN
    p_action_execution_id := NULL;
    p_should_execute := FALSE;
    p_result_data := NULL;

    INSERT INTO public.automation_action_executions (
        execution_id,
        action_position,
        provider,
        action_name
    )
    VALUES (
        p_execution_id,
        p_action_position,
        LOWER(BTRIM(p_provider)),
        LOWER(BTRIM(p_action_name))
    )
    ON CONFLICT (
        execution_id,
        action_position
    )
    DO NOTHING;

    SELECT
        id,
        status,
        result_data
    INTO
        p_action_execution_id,
        v_status,
        p_result_data
    FROM public.automation_action_executions
    WHERE execution_id = p_execution_id
      AND action_position = p_action_position;

    IF p_action_execution_id IS NULL THEN
        RAISE EXCEPTION
            'ACTION_EXECUTION_NOT_FOUND';
    END IF;

    /*
     * Ya fue ejecutada correctamente en un intento anterior:
     * no se vuelve a llamar al proveedor.
     */
    IF v_status = 'success' THEN
        p_should_execute := FALSE;
        RETURN;
    END IF;

    UPDATE public.automation_action_executions
    SET
        status = 'processing',
        attempts = attempts + 1,
        error_message = NULL,
        started_at = CURRENT_TIMESTAMP,
        finished_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_action_execution_id;

    p_should_execute := TRUE;
    p_result_data := NULL;
END;
$$;


-- 2. MARCAR ACCIÓN COMO EXITOSA
CREATE OR REPLACE PROCEDURE public.sp_complete_automation_action_execution(
    IN p_action_execution_id BIGINT,
    IN p_result_data JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.automation_action_executions
    SET
        status = 'success',
        result_data =
            COALESCE(
                p_result_data,
                '{}'::jsonb
            ),
        error_message = NULL,
        finished_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_action_execution_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'ACTION_EXECUTION_NOT_FOUND';
    END IF;
END;
$$;


-- 3. MARCAR ACCIÓN COMO FALLIDA
CREATE OR REPLACE PROCEDURE public.sp_fail_automation_action_execution(
    IN p_action_execution_id BIGINT,
    IN p_error_message TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.automation_action_executions
    SET
        status = 'failed',
        error_message =
            COALESCE(
                NULLIF(
                    BTRIM(p_error_message),
                    ''
                ),
                'UNKNOWN_ACTION_ERROR'
            ),
        finished_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_action_execution_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'ACTION_EXECUTION_NOT_FOUND';
    END IF;
END;
$$;