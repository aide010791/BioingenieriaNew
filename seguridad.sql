-- ════════════════════════════════════════════════════════════════════════════
--  Seguridad — Lab Bioingeniería
--  Pega TODO este archivo en Supabase → SQL Editor → Run.
--  ANTES cambia 'CORREO_DEL_ADMIN@ejemplo.com' (abajo) por el correo con el
--  que creaste el usuario administrador en Authentication → Users.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. Lista de administradores ────────────────────────────────────────────
-- Solo los correos que estén en esta tabla pueden ver, editar y borrar todo.
create table if not exists public.administradores (
    email text primary key
);
alter table public.administradores enable row level security;
-- (Sin políticas: nadie puede leerla desde la página; solo tú desde el panel de Supabase)

insert into public.administradores (email)
values ('CORREO_DEL_ADMIN@ejemplo.com')
on conflict do nothing;


-- ── 2. Función que dice si quien hace la petición es administrador ────────
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.administradores
        where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;


-- ── 3. Activar seguridad por filas en la tabla de registros ────────────────
alter table public.registros enable row level security;

-- Borrar políticas anteriores con el mismo nombre (por si se corre dos veces)
drop policy if exists "alumnos_insertan"  on public.registros;
drop policy if exists "admin_lee"         on public.registros;
drop policy if exists "admin_inserta"     on public.registros;
drop policy if exists "admin_actualiza"   on public.registros;
drop policy if exists "admin_elimina"     on public.registros;

-- Alumnos (sin sesión): SOLO pueden crear registros nuevos, siempre como 'pendiente'
create policy "alumnos_insertan" on public.registros
    for insert to anon
    with check (estado = 'pendiente' and id ~ '^[A-Z]{3,4}$');

-- Administrador (con sesión iniciada): puede hacer todo
create policy "admin_lee"       on public.registros for select to authenticated using (public.es_admin());
create policy "admin_inserta"   on public.registros for insert to authenticated with check (public.es_admin());
create policy "admin_actualiza" on public.registros for update to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin_elimina"   on public.registros for delete to authenticated using (public.es_admin());


-- ── 4. Funciones para que el alumno busque y modifique SU registro ─────────
-- El alumno ya no puede leer la tabla completa. Solo puede pedir "mi registro
-- de hoy con esta boleta", y modificarlo dentro de las 3 horas.

create or replace function public.buscar_mi_registro(p_boleta text)
returns setof public.registros
language sql
stable
security definer
set search_path = public
as $$
    select *
    from public.registros
    where boleta = trim(p_boleta)
      and fecha  = (now() at time zone 'America/Mexico_City')::date
    order by created_at desc
    limit 1;
$$;

create or replace function public.modificar_mi_registro(
    p_id              text,
    p_boleta_original text,
    p_datos           jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    filas int;
begin
    update public.registros set
        fecha           = coalesce((p_datos ->> 'fecha')::date, fecha),
        carrera         = p_datos ->> 'carrera',
        nombre          = coalesce(p_datos ->> 'nombre', nombre),
        boleta          = coalesce(p_datos ->> 'boleta', boleta),
        materia         = coalesce(p_datos ->> 'materia', materia),
        profesor        = coalesce(p_datos ->> 'profesor', profesor),
        mesa_de_trabajo = p_datos ->> 'mesa_de_trabajo',
        integrantes     = coalesce((p_datos ->> 'integrantes')::int, integrantes),
        equipos         = p_datos ->> 'equipos',
        puntas          = p_datos ->> 'puntas',
        herramienta     = p_datos ->> 'herramienta'
        -- 'estado' y 'created_at' NO se pueden cambiar desde aquí
    where id = p_id
      and boleta = trim(p_boleta_original)
      and created_at > now() - interval '3 hours';

    get diagnostics filas = row_count;
    return filas > 0;
end;
$$;

revoke all on function public.buscar_mi_registro(text)                 from public;
revoke all on function public.modificar_mi_registro(text, text, jsonb) from public;
grant execute on function public.buscar_mi_registro(text)                 to anon, authenticated;
grant execute on function public.modificar_mi_registro(text, text, jsonb) to anon, authenticated;
