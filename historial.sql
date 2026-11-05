-- ════════════════════════════════════════════════════════════════════════════
--  Historial de cambios — Lab Bioingeniería
--  Requiere haber corrido antes seguridad.sql (usa la función es_admin()).
--  Pega TODO este archivo en Supabase → SQL Editor → Run.
--
--  Cada vez que un registro se modifica o se elimina (por el alumno o por el
--  administrador), la base de datos guarda automáticamente qué cambió,
--  cuándo y quién lo hizo. Solo los administradores pueden leer el historial.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.historial_registros (
    id           bigint generated always as identity primary key,
    registro_id  text        not null,
    fecha_cambio timestamptz not null default now(),
    autor        text        not null,   -- 'alumno' o el correo del administrador
    accion       text        not null,   -- 'modificado' | 'eliminado'
    cambios      jsonb       not null    -- { campo: { "antes": ..., "despues": ... } }
);

create index if not exists historial_registro_idx on public.historial_registros (registro_id);
create index if not exists historial_fecha_idx    on public.historial_registros (fecha_cambio);

alter table public.historial_registros enable row level security;

drop policy if exists "admin_lee_historial" on public.historial_registros;
create policy "admin_lee_historial" on public.historial_registros
    for select to authenticated using (public.es_admin());
grant select on public.historial_registros to authenticated;
revoke insert, update, delete, truncate on public.historial_registros from anon, authenticated;
-- (No hay políticas de insert/update/delete: nadie puede alterar el historial
--  desde la página; solo lo escribe el trigger de abajo.)


create or replace function public.registrar_historial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    -- Correo del administrador; 'alumno' si viene de la página sin sesión;
    -- 'sistema' si el cambio se hizo directo en el panel de Supabase
    v_autor   text := case
                        when coalesce(auth.jwt() ->> 'email', '') <> '' then auth.jwt() ->> 'email'
                        when auth.jwt() ->> 'role' = 'anon'               then 'alumno'
                        else 'sistema'
                      end;
    v_cambios jsonb;
begin
    if tg_op = 'UPDATE' then
        select jsonb_object_agg(o.key, jsonb_build_object('antes', o.value, 'despues', n.value))
          into v_cambios
          from jsonb_each(to_jsonb(old)) o
          join jsonb_each(to_jsonb(new)) n using (key)
         where o.value is distinct from n.value;

        if v_cambios is not null then
            insert into public.historial_registros (registro_id, autor, accion, cambios)
            values (new.id, v_autor, 'modificado', v_cambios);
        end if;
        return new;

    elsif tg_op = 'DELETE' then
        -- Se guarda una copia completa del registro eliminado
        select jsonb_object_agg(key, jsonb_build_object('antes', value, 'despues', null))
          into v_cambios
          from jsonb_each(to_jsonb(old));

        insert into public.historial_registros (registro_id, autor, accion, cambios)
        values (old.id, v_autor, 'eliminado', v_cambios);
        return old;
    end if;
    return null;
end;
$$;

drop trigger if exists trg_historial_registros on public.registros;
create trigger trg_historial_registros
    after update or delete on public.registros
    for each row execute function public.registrar_historial();


-- ── Ajuste de seguridad: el ID que manda el alumno debe ser de 3 o 4 letras 
-- (evita que alguien inserte un ID con código que se ejecute en el panel)
drop policy if exists "alumnos_insertan" on public.registros;
create policy "alumnos_insertan" on public.registros
    for insert to anon
    with check (estado = 'pendiente' and id ~ '^[A-Z]{3,4}$');
