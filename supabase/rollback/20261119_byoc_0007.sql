-- Owner-run rollback for the BYOC 0.3 due date transfer. Do not run from FORGE.
-- Restores the six transfer RPCs to the definitions of 0002 (with the 0004/0005 search_path)
-- and drops the helper. Safe to run whether or not 0006 is still applied.

begin;

create or replace function public.forge_transfer_preview(
    p_workspace_id uuid, p_document jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, extensions, public
as $$
declare
    version text := p_document->>'schema_version';
    fingerprint text := encode(digest(convert_to(p_document::text, 'utf8'), 'sha256'), 'hex');
begin
    if public.forge_workspace_role(p_workspace_id) is null then
        raise exception 'workspace membership required' using errcode = '42501';
    end if;
    if version not in ('forge-project-import-v1', 'forge-project-transfer-v2') then
        raise exception 'unsupported project import schema' using errcode = '22023';
    end if;
    if nullif(trim(p_document->'project'->>'name'), '') is null then
        raise exception 'project name is required' using errcode = '22023';
    end if;
    if jsonb_typeof(coalesce(p_document->'epics', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(p_document->'features', '[]'::jsonb)) <> 'array'
       or jsonb_typeof(coalesce(p_document->'dependencies', '[]'::jsonb)) <> 'array' then
        raise exception 'import collections must be arrays' using errcode = '22023';
    end if;
    if octet_length(convert_to(p_document::text, 'utf8')) > 7 * 1024 * 1024 then
        raise exception 'import document exceeds the 7 MiB limit' using errcode = '22023';
    end if;
    if jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) > 100
       or jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)) > 500
       or jsonb_array_length(coalesce(p_document->'dependencies', '[]'::jsonb)) > 5000 then
        raise exception 'import document exceeds collection limits' using errcode = '22023';
    end if;
    if exists (
        select 1 from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb)) item
        where jsonb_typeof(item) <> 'object'
    ) or exists (
        select 1 from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) item
        where jsonb_typeof(item) <> 'object'
    ) then
        raise exception 'import collection entries must be objects' using errcode = '22023';
    end if;
    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        where jsonb_typeof(feature) <> 'object'
           or jsonb_typeof(coalesce(feature->'tasks', '[]'::jsonb)) <> 'array'
           or jsonb_typeof(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) <> 'array'
    ) then
        raise exception 'feature child collections must be arrays' using errcode = '22023';
    end if;
    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        cross join jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) task
        where jsonb_typeof(task) <> 'object'
    ) or exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        cross join jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) criterion
        where jsonb_typeof(criterion) <> 'object'
    ) then
        raise exception 'nested import entries must be objects' using errcode = '22023';
    end if;
    if coalesce((
        select sum(jsonb_array_length(coalesce(feature->'tasks', '[]'::jsonb)))
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
    ), 0) > 2000
       or coalesce((
        select sum(jsonb_array_length(coalesce(feature->'acceptance_criteria', '[]'::jsonb)))
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
    ), 0) > 2000 then
        raise exception 'import document exceeds global task or criterion limits' using errcode = '22023';
    end if;
    if exists (
        with refs as (
            select value->>'ref' as ref from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb))
            union all
            select value->>'ref' from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb))
            union all
            select task->>'ref'
            from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
            cross join jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) task
            union all
            select criterion->>'ref'
            from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
            cross join jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) criterion
        )
        select ref from refs group by ref
        having ref is null or trim(ref) = '' or count(*) > 1
    ) then
        raise exception 'references must be unique and explicit' using errcode = '22023';
    end if;
    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature
        where nullif(feature->>'epic_ref', '') is not null
          and not exists (
              select 1 from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb)) epic
              where epic->>'ref' = feature->>'epic_ref'
          )
    ) then
        raise exception 'feature references an unknown epic' using errcode = '22023';
    end if;
    if exists (
        select 1 from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) dependency
        where dependency->>'blocking_feature_ref' = dependency->>'blocked_feature_ref'
           or not exists (select 1 from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature where feature->>'ref' = dependency->>'blocking_feature_ref')
           or not exists (select 1 from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) feature where feature->>'ref' = dependency->>'blocked_feature_ref')
    ) then
        raise exception 'dependency references are invalid' using errcode = '22023';
    end if;
    return jsonb_build_object(
        'schema_version', version,
        'fingerprint', fingerprint,
        'project', p_document->'project',
        'counts', jsonb_build_object(
            'epics', jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)),
            'features', jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)),
            'tasks', coalesce((select sum(jsonb_array_length(coalesce(value->'tasks', '[]'::jsonb))) from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb))), 0),
            'acceptance_criteria', coalesce((select sum(jsonb_array_length(coalesce(value->'acceptance_criteria', '[]'::jsonb))) from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb))), 0),
            'dependencies', jsonb_array_length(coalesce(p_document->'dependencies', '[]'::jsonb))
        )
    );
end;
$$;

create or replace function public.forge_transfer_commit(
    p_workspace_id uuid, p_document jsonb, p_expected_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, extensions, public
as $$
declare
    preview jsonb;
    project_id uuid := gen_random_uuid();
    import_session_id uuid;
    epic_id uuid;
    feature_id uuid;
    task jsonb;
    criterion jsonb;
    epic jsonb;
    feature jsonb;
    dependency jsonb;
    epic_map jsonb := '{}'::jsonb;
    feature_map jsonb := '{}'::jsonb;
    now_value timestamptz := now();
    reference_rows jsonb := '[]'::jsonb;
begin
    if auth.uid() is null or public.forge_workspace_role(p_workspace_id) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    preview := public.forge_transfer_preview(p_workspace_id, p_document);
    if preview->>'fingerprint' <> p_expected_fingerprint then
        raise exception 'import fingerprint does not match the reviewed document' using errcode = '40001';
    end if;
    insert into public.projects(id, workspace_id, name, description)
    values (project_id, p_workspace_id, trim(p_document->'project'->>'name'), p_document->'project'->>'description');
    insert into public.forge_import_sessions(workspace_id, project_id, created_by)
    values (p_workspace_id, project_id, auth.uid())
    returning id into import_session_id;
    for epic in select value from jsonb_array_elements(coalesce(p_document->'epics', '[]'::jsonb)) loop
        epic_id := gen_random_uuid();
        epic_map := epic_map || jsonb_build_object(epic->>'ref', epic_id::text);
        insert into public.epics(id, project_id, title, description, priority, tags)
        values (epic_id, project_id, trim(epic->>'title'), epic->>'description', coalesce(epic->>'priority', 'medium'),
            coalesce(array(select jsonb_array_elements_text(epic->'tags')), '{}'::text[]));
        reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', epic->>'ref', 'generated_id', epic_id));
    end loop;
    for feature in select value from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) loop
        feature_id := gen_random_uuid();
        feature_map := feature_map || jsonb_build_object(feature->>'ref', feature_id::text);
        insert into public.features(
            id, project_id, epic_id, title, description, goal, priority, status, kind,
            bug_severity, steps_to_reproduce, expected_result, actual_result, tags, notes
        ) values (
            feature_id, project_id,
            nullif(epic_map->>(feature->>'epic_ref'), '')::uuid,
            trim(feature->>'title'), feature->>'description', feature->>'goal',
            coalesce(feature->>'priority', 'medium'), coalesce(feature->>'status', 'backlog'),
            case when feature->>'kind' = 'feature' then 'story' else coalesce(feature->>'kind', 'story') end, feature->>'bug_severity',
            feature->>'steps_to_reproduce', feature->>'expected_result', feature->>'actual_result',
            coalesce(array(select jsonb_array_elements_text(feature->'tags')), '{}'::text[]), feature->>'notes'
        );
        reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', feature->>'ref', 'generated_id', feature_id));
        for task in select value from jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) loop
            insert into public.tasks(feature_id, title, description, status, position)
            values (feature_id, trim(task->>'title'), task->>'description', coalesce(task->>'status', 'todo'), coalesce((task->>'position')::integer, 0));
        end loop;
        for criterion in select value from jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) loop
            insert into public.acceptance_criteria(feature_id, description, satisfied, position)
            values (feature_id, trim(criterion->>'description'), coalesce((criterion->>'satisfied')::boolean, false), coalesce((criterion->>'position')::integer, 0));
        end loop;
    end loop;
    for dependency in select value from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) loop
        perform public.forge_create_dependency(
            project_id,
            (feature_map->>(dependency->>'blocking_feature_ref'))::uuid,
            (feature_map->>(dependency->>'blocked_feature_ref'))::uuid
        );
    end loop;
    return jsonb_build_object(
        'schema_version', preview->>'schema_version', 'workspace_id', p_workspace_id,
        'project_id', project_id, 'import_id', import_session_id,
        'fingerprint', preview->>'fingerprint',
        'references', reference_rows, 'counts', preview->'counts'
    );
end;
$$;

create or replace function public.forge_transfer_export(
    p_workspace_id uuid, p_project_id uuid, p_schema_version text default 'forge-project-import-v1'
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    project_row public.projects;
    document jsonb;
    epics jsonb := '[]'::jsonb;
    features jsonb := '[]'::jsonb;
    dependencies jsonb := '[]'::jsonb;
    epic_map jsonb := '{}'::jsonb;
    feature_map jsonb := '{}'::jsonb;
    item jsonb;
    row_record record;
    index_value integer := 0;
    feature_index integer;
    task_json jsonb;
    criterion_json jsonb;
begin
    if public.forge_workspace_role(p_workspace_id) is null then
        raise exception 'workspace membership required' using errcode = '42501';
    end if;
    select * into project_row from public.projects where id = p_project_id and workspace_id = p_workspace_id;
    if not found then raise exception 'project not found'; end if;
    for row_record in select * from public.epics where project_id = p_project_id order by created_at, id loop
        index_value := index_value + 1;
        epic_map := epic_map || jsonb_build_object(row_record.id::text, format('epic:%s', lpad(index_value::text, 3, '0')));
        epics := epics || jsonb_build_array(jsonb_build_object(
            'ref', format('epic:%s', lpad(index_value::text, 3, '0')), 'title', row_record.title,
            'description', row_record.description,
            'priority', row_record.priority, 'tags', to_jsonb(row_record.tags)
        ) - case when p_schema_version = 'forge-project-import-v1' then array['priority','tags'] else array[]::text[] end);
    end loop;
    index_value := 0;
    for row_record in select * from public.features where project_id = p_project_id order by created_at, id loop
        index_value := index_value + 1;
        feature_map := feature_map || jsonb_build_object(row_record.id::text, format('feature:%s', lpad(index_value::text, 3, '0')));
        task_json := coalesce((select jsonb_agg(jsonb_build_object(
            'ref', format('task:%s', lpad(task_number::text, 3, '0')), 'title', task_row.title,
            'description', task_row.description, 'status', task_row.status, 'position', task_row.position
        ) order by task_row.position, task_row.id)
        from (select tasks.*, row_number() over (order by position, id) task_number from public.tasks where feature_id = row_record.id) task_row), '[]'::jsonb);
        criterion_json := coalesce((select jsonb_agg(jsonb_build_object(
            'ref', format('criterion:%s', lpad(criterion_number::text, 3, '0')), 'description', criterion_row.description,
            'satisfied', criterion_row.satisfied, 'position', criterion_row.position
        ) order by criterion_row.position, criterion_row.id)
        from (select acceptance_criteria.*, row_number() over (order by position, id) criterion_number from public.acceptance_criteria where feature_id = row_record.id) criterion_row), '[]'::jsonb);
        item := jsonb_build_object(
            'ref', feature_map->>row_record.id::text, 'title', row_record.title, 'description', row_record.description,
            'goal', row_record.goal, 'priority', row_record.priority, 'status', row_record.status,
            'epic_ref', epic_map->>row_record.epic_id::text, 'tasks', task_json, 'acceptance_criteria', criterion_json,
            'kind', row_record.kind, 'bug_severity', row_record.bug_severity,
            'steps_to_reproduce', row_record.steps_to_reproduce, 'expected_result', row_record.expected_result,
            'actual_result', row_record.actual_result, 'notes', row_record.notes, 'tags', to_jsonb(row_record.tags)
        );
        if p_schema_version = 'forge-project-import-v1' then
            item := item - array['kind','bug_severity','steps_to_reproduce','expected_result','actual_result','notes','tags'];
        end if;
        features := features || jsonb_build_array(item);
    end loop;
    for row_record in select * from public.feature_dependencies where project_id = p_project_id order by created_at, id loop
        dependencies := dependencies || jsonb_build_array(jsonb_build_object(
            'blocking_feature_ref', feature_map->>row_record.blocking_feature_id::text,
            'blocked_feature_ref', feature_map->>row_record.blocked_feature_id::text
        ));
    end loop;
    document := jsonb_build_object(
        'schema_version', p_schema_version,
        'project', jsonb_build_object('name', project_row.name, 'description', project_row.description),
        'epics', epics, 'features', features, 'dependencies', dependencies
    );
    return document;
end;
$$;

create or replace function public.forge_transfer_contextual_preview(
    p_workspace_id uuid, p_project_id uuid, p_scope text, p_destination_id uuid, p_document jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, extensions, public
as $$
declare
    preview jsonb;
    contextual_fingerprint text;
begin
    if public.forge_project_role(p_project_id) is null then
        raise exception 'project membership required' using errcode = '42501';
    end if;
    if p_scope = 'epics' then
        if p_destination_id <> p_project_id and not exists (select 1 from public.epics where id = p_destination_id and project_id = p_project_id) then
            raise exception 'destination Epic not found in this project';
        end if;
    elsif p_scope = 'work-items' then
        if not exists (select 1 from public.epics where id = p_destination_id and project_id = p_project_id) then
            raise exception 'destination Epic not found in this project';
        end if;
    elsif p_scope = 'tasks' then
        if not exists (select 1 from public.features where id = p_destination_id and project_id = p_project_id) then
            raise exception 'destination Work Item not found in this project';
        end if;
    else
        raise exception 'unsupported contextual transfer scope' using errcode = '22023';
    end if;
    preview := public.forge_transfer_preview(p_workspace_id, p_document);
    if p_scope = 'epics' and jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) <> 1 then
        raise exception 'Epic transfer must contain exactly one Epic' using errcode = '22023';
    end if;
    if p_scope = 'work-items' and (jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) <> 0 or jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)) = 0) then
        raise exception 'Work Item transfer must contain Work Items and no Epics' using errcode = '22023';
    end if;
    if p_scope = 'tasks' and (jsonb_array_length(coalesce(p_document->'epics', '[]'::jsonb)) <> 0 or jsonb_array_length(coalesce(p_document->'features', '[]'::jsonb)) <> 1) then
        raise exception 'Task transfer must contain one Work Item and no Epics' using errcode = '22023';
    end if;
    if p_scope = 'tasks' and (
        jsonb_array_length(coalesce((p_document->'features'->0)->'tasks', '[]'::jsonb)) = 0
        or jsonb_array_length(coalesce((p_document->'features'->0)->'acceptance_criteria', '[]'::jsonb)) <> 0
    ) then
        raise exception 'Task transfer must contain Tasks for exactly one Work Item' using errcode = '22023';
    end if;
    contextual_fingerprint := encode(
        digest(
            convert_to(
                jsonb_build_object(
                    'scope', p_scope,
                    'workspace_id', p_workspace_id,
                    'project_id', p_project_id,
                    'destination_id', p_destination_id,
                    'document', p_document
                )::text,
                'utf8'
            ),
            'sha256'
        ),
        'hex'
    );
    return preview || jsonb_build_object(
        'fingerprint', contextual_fingerprint,
        'destination', jsonb_build_object('scope', p_scope, 'id', p_destination_id)
    );
end;
$$;

create or replace function public.forge_transfer_contextual_commit(
    p_workspace_id uuid, p_project_id uuid, p_scope text, p_destination_id uuid,
    p_document jsonb, p_expected_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, extensions, public
as $$
declare
    preview jsonb;
    epic jsonb;
    feature jsonb;
    task jsonb;
    criterion jsonb;
    dependency jsonb;
    new_epic_id uuid;
    new_feature_id uuid;
    target_epic_id uuid;
    target_feature_id uuid;
    epic_map jsonb := '{}'::jsonb;
    feature_map jsonb := '{}'::jsonb;
    reference_rows jsonb := '[]'::jsonb;
begin
    if public.forge_project_role(p_project_id) not in ('owner', 'editor') then
        raise exception 'editor membership required' using errcode = '42501';
    end if;
    preview := public.forge_transfer_contextual_preview(p_workspace_id, p_project_id, p_scope, p_destination_id, p_document);
    if preview->>'fingerprint' <> p_expected_fingerprint then
        raise exception 'import fingerprint does not match the reviewed destination and document' using errcode = '40001';
    end if;
    if p_scope = 'epics' then
        target_epic_id := p_destination_id;
        for epic in select value from jsonb_array_elements(p_document->'epics') loop
            new_epic_id := gen_random_uuid();
            target_epic_id := new_epic_id;
            epic_map := epic_map || jsonb_build_object(epic->>'ref', new_epic_id::text);
            insert into public.epics(id, project_id, title, description, priority, tags)
            values (new_epic_id, p_project_id, trim(epic->>'title'), epic->>'description', coalesce(epic->>'priority', 'medium'), coalesce(array(select jsonb_array_elements_text(epic->'tags')), '{}'::text[]));
            reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', epic->>'ref', 'generated_id', new_epic_id));
        end loop;
    elsif p_scope = 'work-items' then
        target_epic_id := p_destination_id;
    end if;
    if p_scope in ('epics', 'work-items') then
        for feature in select value from jsonb_array_elements(coalesce(p_document->'features', '[]'::jsonb)) loop
            new_feature_id := gen_random_uuid();
            feature_map := feature_map || jsonb_build_object(feature->>'ref', new_feature_id::text);
            insert into public.features(
                id, project_id, epic_id, title, description, goal, priority, status, kind,
                bug_severity, steps_to_reproduce, expected_result, actual_result, tags, notes
            ) values (
                new_feature_id, p_project_id, target_epic_id, trim(feature->>'title'), feature->>'description', feature->>'goal',
                coalesce(feature->>'priority', 'medium'), coalesce(feature->>'status', 'backlog'), case when feature->>'kind' = 'feature' then 'story' else coalesce(feature->>'kind', 'story') end,
                feature->>'bug_severity', feature->>'steps_to_reproduce', feature->>'expected_result', feature->>'actual_result',
                coalesce(array(select jsonb_array_elements_text(feature->'tags')), '{}'::text[]), feature->>'notes'
            );
            reference_rows := reference_rows || jsonb_build_array(jsonb_build_object('ref', feature->>'ref', 'generated_id', new_feature_id));
            for task in select value from jsonb_array_elements(coalesce(feature->'tasks', '[]'::jsonb)) loop
                insert into public.tasks(feature_id, title, description, status, position)
                values (new_feature_id, trim(task->>'title'), task->>'description', coalesce(task->>'status', 'todo'), coalesce((task->>'position')::integer, 0));
            end loop;
            for criterion in select value from jsonb_array_elements(coalesce(feature->'acceptance_criteria', '[]'::jsonb)) loop
                insert into public.acceptance_criteria(feature_id, description, satisfied, position)
                values (new_feature_id, trim(criterion->>'description'), coalesce((criterion->>'satisfied')::boolean, false), coalesce((criterion->>'position')::integer, 0));
            end loop;
        end loop;
    else
        target_feature_id := p_destination_id;
        for task in select value from jsonb_array_elements(coalesce((p_document->'features'->0)->'tasks', '[]'::jsonb)) loop
            insert into public.tasks(feature_id, title, description, status, position)
            values (target_feature_id, trim(task->>'title'), task->>'description', coalesce(task->>'status', 'todo'), coalesce((task->>'position')::integer, 0));
        end loop;
    end if;
    for dependency in select value from jsonb_array_elements(coalesce(p_document->'dependencies', '[]'::jsonb)) loop
        perform public.forge_create_dependency(
            p_project_id,
            coalesce((feature_map->>(dependency->>'blocking_feature_ref'))::uuid, null),
            coalesce((feature_map->>(dependency->>'blocked_feature_ref'))::uuid, null)
        );
    end loop;
    return jsonb_build_object(
        'schema_version', preview->>'schema_version', 'workspace_id', p_workspace_id,
        'project_id', p_project_id, 'fingerprint', preview->>'fingerprint',
        'references', reference_rows, 'counts', preview->'counts'
    );
end;
$$;

create or replace function public.forge_transfer_contextual_export(
    p_workspace_id uuid, p_project_id uuid, p_scope text, p_destination_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
    document jsonb := public.forge_transfer_export(p_workspace_id, p_project_id, 'forge-project-transfer-v2');
    target_ref text;
    selected_features jsonb;
    selected_epics jsonb;
begin
    if public.forge_project_role(p_project_id) is null then
        raise exception 'project membership required' using errcode = '42501';
    end if;
    if p_scope = 'epics' then
        select format('epic:%s', lpad(position::text, 3, '0')) into target_ref
        from (select id, row_number() over (order by created_at, id) as position from public.epics where project_id = p_project_id) item
        where id = p_destination_id;
        if target_ref is null then raise exception 'Epic not found in this project'; end if;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_epics from jsonb_array_elements(document->'epics') where value->>'ref' = target_ref;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_features from jsonb_array_elements(document->'features') where value->>'epic_ref' = target_ref;
        document := jsonb_set(jsonb_set(document, '{epics}', selected_epics), '{features}', selected_features);
    elsif p_scope = 'work-items' then
        select format('epic:%s', lpad(position::text, 3, '0')) into target_ref
        from (select id, row_number() over (order by created_at, id) as position from public.epics where project_id = p_project_id) item
        where id = p_destination_id;
        if target_ref is null then raise exception 'Epic not found in this project'; end if;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_features from jsonb_array_elements(document->'features') where value->>'epic_ref' = target_ref;
        document := jsonb_set(jsonb_set(document, '{epics}', '[]'::jsonb), '{features}', selected_features);
    elsif p_scope = 'tasks' then
        select format('feature:%s', lpad(position::text, 3, '0')) into target_ref
        from (select id, row_number() over (order by created_at, id) as position from public.features where project_id = p_project_id) item
        where id = p_destination_id;
        if target_ref is null then raise exception 'Work Item not found in this project'; end if;
        select coalesce(jsonb_agg(value), '[]'::jsonb) into selected_features from jsonb_array_elements(document->'features') where value->>'ref' = target_ref;
        selected_features := jsonb_set(selected_features, '{0,acceptance_criteria}', '[]'::jsonb);
        document := jsonb_set(jsonb_set(document, '{epics}', '[]'::jsonb), '{features}', selected_features);
    else
        raise exception 'unsupported contextual transfer scope' using errcode = '22023';
    end if;
    return document;
end;
$$;

drop function if exists public.forge_is_iso_date(text);

commit;
