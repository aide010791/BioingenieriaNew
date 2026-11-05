// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://yzhdtwdwakzcnlergcpk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Pantalla de bienvenida ────────────────────────────────────────────────────

function mostrarFormulario() {
    document.getElementById('pantalla-bienvenida').style.display = 'none';
    document.getElementById('contenedor-formulario').style.display = 'block';
    document.getElementById('progress-container').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function volverBienvenida() {
    document.getElementById('pantalla-bienvenida').style.display = 'block';
    document.getElementById('contenedor-formulario').style.display = 'none';
}

// ── Navegación entre pasos ────────────────────────────────────────────────────

function irPaso(num) {
    if (num === 2 && !validarPaso1()) return;
    if (num === 3) generarResumen();

    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.getElementById(`paso-${num}`).classList.add('active');

    // Progreso
    const porcentajes = { 1: '33%', 2: '66%', 3: '100%' };
    document.getElementById('progress-fill').style.width = porcentajes[num];

    // Labels
    ['1','2','3'].forEach(i => {
        const el = document.getElementById(`label-${i}`);
        el.classList.remove('active','done');
        if (parseInt(i) < num)  el.classList.add('done');
        if (parseInt(i) === num) el.classList.add('active');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarPaso1() {
    const campos = ['fecha','carrera','nombre','boleta','materia','profesor','mesa_trabajo','integrantes'];
    for (const id of campos) {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
            el.focus();
            el.style.borderColor = '#ef4444';
            setTimeout(() => el.style.borderColor = '', 2000);
            Swal.fire({ toast: true, position: 'top', icon: 'warning',
                title: 'Completa todos los campos', showConfirmButton: false, timer: 2000 });
            return false;
        }
    }
    return true;
}

// ── Generar resumen en paso 3 ─────────────────────────────────────────────────

function generarResumen() {
    // Datos personales
    const datos = {
        'Fecha':         document.getElementById('fecha').value,
        'Carrera':       document.getElementById('carrera').value,
        'Nombre':        document.getElementById('nombre').value,
        'Boleta':        document.getElementById('boleta').value,
        'Materia':       document.getElementById('materia').value,
        'Profesor':      document.getElementById('profesor').value,
        'Mesa':          document.getElementById('mesa_trabajo').value,
        'Integrantes':   document.getElementById('integrantes').value,
    };

    document.getElementById('resumen-datos').innerHTML =
        Object.entries(datos).map(([k,v]) =>
            `<div class="resumen-fila"><span class="resumen-key">${k}</span><span class="resumen-val">${v || '—'}</span></div>`
        ).join('');

    // Equipos seleccionados
    let equiposTexto = [];
    document.querySelectorAll('.contenedor-equipos-wrap input[type="checkbox"]').forEach(cb => {
        if (cb.checked) equiposTexto.push(cb.value);
    });

    // Puntas
    document.querySelectorAll('.contenedor-puntas-wrap input[type="checkbox"]').forEach(cb => {
        if (cb.checked) {
            const cantInput = document.getElementById(cb.id.replace('_check',''));
            const cant = cantInput ? cantInput.value || '1' : '1';
            equiposTexto.push(`${cb.value}: ${cant}`);
        }
    });

    // Herramientas
    const herramientas = Array.from(document.querySelectorAll('#lista-herramientas .herramienta-tag'))
        .map(t => t.dataset.valor).filter(Boolean);

    const equiposResumen = equiposTexto.length ? equiposTexto.join('\n') : '—';
    const herramientasResumen = herramientas.length ? herramientas.join(', ') : '—';

    document.getElementById('resumen-equipos').innerHTML = `
        <div class="resumen-fila"><span class="resumen-key">Equipos</span><span class="resumen-val">${equiposResumen}</span></div>
        <div class="resumen-fila"><span class="resumen-key">Herramientas</span><span class="resumen-val">${herramientasResumen}</span></div>
    `;
}

// ── Recopilar datos del formulario ────────────────────────────────────────────

function recopilarDatos() {
    let datosEquipos = [];
    document.querySelectorAll('#paso-2 input[type="checkbox"][name="herramientas"]').forEach(cb => {
        if (cb.checked && !cb.id.includes('puntas')) {
            datosEquipos.push(cb.value);
        }
    });

    let datosPuntas = [];
    document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
        if (cb.checked && cb.id.includes('puntas')) {
            const cantInput = document.getElementById(cb.id.replace('_check',''));
            const cant = cantInput ? cantInput.value || '1' : '1';
            datosPuntas.push(`${cb.value}: ${cant}`);
        }
    });

    const herramientas = Array.from(document.querySelectorAll('#lista-herramientas .herramienta-tag'))
        .map(t => t.dataset.valor).filter(Boolean).join('\n');

    return {
        equipos: datosEquipos.join('\n'),
        puntas: datosPuntas.join('\n'),
        herramienta: herramientas
    };
}

// ── Enviar registro ───────────────────────────────────────────────────────────

document.getElementById('formulario-registro').addEventListener('submit', async (e) => {
    e.preventDefault();

    const { equipos, puntas, herramienta } = recopilarDatos();

    // Capturar datos para el resumen ANTES de limpiar el formulario
    const nombre      = document.getElementById('nombre').value;
    const mesa        = document.getElementById('mesa_trabajo').value;
    const integrantes = document.getElementById('integrantes').value;

    const { error } = await insertarConIdUnico({
        fecha:           document.getElementById('fecha').value,
        carrera:         document.getElementById('carrera').value,
        nombre,
        boleta:          document.getElementById('boleta').value,
        materia:         document.getElementById('materia').value,
        profesor:        document.getElementById('profesor').value,
        mesa_de_trabajo: mesa,
        integrantes:     parseInt(integrantes) || 1,
        equipos,
        puntas,
        herramienta,
        estado: 'pendiente'
    });

    // Si el service worker guardó en cola (sin internet), la respuesta trae {queued: true}
    const sinInternet = error && error.message && error.message.includes('fetch');

    if (error && !sinInternet) {
        Swal.fire('Error al registrar', error.message, 'error');
        return;
    }

    // Limpiar y volver a bienvenida antes de mostrar el popup
    limpiarFormulario();
    irPaso(1);
    volverBienvenida();

    // Construir lista de material registrado
    const todosMateriales = [
        ...(equipos     ? equipos.split('\n')     : []),
        ...(puntas      ? puntas.split('\n')      : []),
        ...(herramienta ? herramienta.split('\n') : [])
    ].filter(Boolean);

    const materialHtml = todosMateriales.length
        ? todosMateriales.map(m => `<li style="margin-bottom:4px">${m}</li>`).join('')
        : '<li style="color:#94a3b8">— Sin material seleccionado —</li>';

    if (sinInternet) {
        Swal.fire({
            title: '¡Guardado sin conexión!',
            html: `<p style="color:#64748b; font-size:14px; font-family:Inter,sans-serif;">Sin internet ahora, pero tu registro se enviará automáticamente cuando te reconectes.</p>`,
            icon: 'info',
            confirmButtonText: 'Listo',
            confirmButtonColor: '#2563eb'
        });
    } else {
        Swal.fire({
            title: '¡Registro exitoso! ✓',
            html: `
                <div style="text-align:left; font-family:Inter,sans-serif; font-size:14px;">
                    <div style="background:#f8fafc; border-radius:10px; padding:14px 16px; margin-bottom:10px;">
                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Datos registrados</div>
                        <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f1f5f9;">
                            <span style="color:#64748b; font-weight:500;">Alumno</span>
                            <span style="color:#1e293b; font-weight:600;">${nombre}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #f1f5f9;">
                            <span style="color:#64748b; font-weight:500;">Mesa</span>
                            <span style="color:#1e293b; font-weight:600;">${mesa}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; padding:5px 0;">
                            <span style="color:#64748b; font-weight:500;">Integrantes</span>
                            <span style="color:#1e293b; font-weight:600;">${integrantes}</span>
                        </div>
                    </div>
                    <div style="background:#f8fafc; border-radius:10px; padding:14px 16px;">
                        <div style="color:#64748b; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Material solicitado</div>
                        <ul style="margin:0; padding-left:18px; color:#334155; font-size:13px; line-height:1.7;">
                            ${materialHtml}
                        </ul>
                    </div>
                </div>`,
            icon: 'success',
            confirmButtonText: 'Listo',
            confirmButtonColor: '#2563eb'
        });
    }
});

// ── Generar ID único ──────────────────────────────────────────────────────────

function generarIdUnico(longitud = 3) {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = '';
    do {
        id = '';
        for (let i = 0; i < longitud; i++) id += letras[Math.floor(Math.random() * letras.length)];
    } while (idYaExiste(id));
    guardarId(id);
    return id;
}

// Inserta el registro; si el ID ya lo tiene otro registro (error 23505),
// genera otro y reintenta. Tras varios choques usa 4 letras (456,976 combinaciones).
async function insertarConIdUnico(datos) {
    let error = null;
    for (let intento = 0; intento < 15; intento++) {
        const id = generarIdUnico(intento < 8 ? 3 : 4);
        ({ error } = await db.from('registros').insert([{ id, ...datos }]));
        if (!error || error.code !== '23505') return { id, error };
    }
    return { error };
}

function idYaExiste(id) {
    return JSON.parse(localStorage.getItem('idsGenerados') || '[]').includes(id);
}

function guardarId(id) {
    const ids = JSON.parse(localStorage.getItem('idsGenerados') || '[]');
    ids.push(id);
    localStorage.setItem('idsGenerados', JSON.stringify(ids));
}

// ── Limpiar formulario ────────────────────────────────────────────────────────

function limpiarFormulario() {
    document.querySelectorAll('#formulario-registro input[type="text"], #formulario-registro input[type="number"], #formulario-registro input[type="date"]').forEach(i => i.value = '');
    document.querySelectorAll('#formulario-registro select').forEach(s => s.selectedIndex = 0);
    document.querySelectorAll('#formulario-registro input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('.check-item input[type="number"]').forEach(i => i.style.display = 'none');
    document.getElementById('lista-herramientas').innerHTML = '';

    // Restaurar fecha de hoy
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    document.getElementById('fecha').value = hoy;
}

// ── Modificar registro del día ────────────────────────────────────────────────

document.getElementById('btn-modificar').addEventListener('click', async () => {
    const { value: boleta } = await Swal.fire({
        title: 'Modificar registro',
        input: 'text',
        inputLabel: 'Ingresa tu número de boleta',
        inputPlaceholder: 'Ej: 2023630001',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        inputValidator: v => {
            if (!v) return '¡Necesitas ingresar tu boleta!';
        }
    });

    if (!boleta) return;

    // Búsqueda segura: el servidor solo devuelve el registro de HOY con esa boleta
    const { data: filas, error } = await db.rpc('buscar_mi_registro', { p_boleta: boleta.trim() });
    const data = filas && filas[0];

    if (error || !data) {
        Swal.fire('No encontrado', 'No hay un registro tuyo del día de hoy.', 'error');
        return;
    }

    // Verificar ventana de 3 horas
    const creado = new Date(data.created_at);
    const ahora = new Date();
    const diferenciaHoras = (ahora - creado) / (1000 * 60 * 60);

    if (diferenciaHoras > 3) {
        Swal.fire({
            title: 'Tiempo expirado',
            text: 'El período de modificación de 3 horas ya pasó. Contacta al encargado del laboratorio si necesitas hacer cambios.',
            icon: 'warning',
            confirmButtonColor: '#2563eb'
        });
        return;
    }

    llenarFormularioConDatos(data);

    document.getElementById('btn-registro').style.display = 'none';
    document.getElementById('btn-guardar').style.display = 'block';
    document.getElementById('formulario-registro').dataset.idModificando = data.id;
    document.getElementById('formulario-registro').dataset.boletaOriginal = data.boleta;

    mostrarFormulario();
    irPaso(2);
    Swal.fire({ toast: true, position: 'top', icon: 'info',
        title: 'Registro cargado. Modifica y confirma.', showConfirmButton: false, timer: 3000 });
});

// ── Guardar modificación ──────────────────────────────────────────────────────

async function guardarModificacion() {
    const id = document.getElementById('formulario-registro').dataset.idModificando;
    if (!id) return;

    const { equipos, puntas, herramienta } = recopilarDatos();

    const form = document.getElementById('formulario-registro');

    // Modificación segura: el servidor verifica boleta y ventana de 3 horas
    const { data: ok, error } = await db.rpc('modificar_mi_registro', {
        p_id: id,
        p_boleta_original: form.dataset.boletaOriginal || '',
        p_datos: {
            fecha:           document.getElementById('fecha').value,
            carrera:         document.getElementById('carrera').value,
            nombre:          document.getElementById('nombre').value,
            boleta:          document.getElementById('boleta').value,
            materia:         document.getElementById('materia').value,
            profesor:        document.getElementById('profesor').value,
            mesa_de_trabajo: document.getElementById('mesa_trabajo').value,
            integrantes:     parseInt(document.getElementById('integrantes').value) || 1,
            equipos, puntas, herramienta
        }
    });

    if (error) { Swal.fire('Error', error.message, 'error'); return; }
    if (!ok) {
        Swal.fire({
            title: 'No se pudo modificar',
            text: 'El período de 3 horas ya pasó. Contacta al encargado del laboratorio.',
            icon: 'warning', confirmButtonColor: '#2563eb'
        });
        return;
    }

    Swal.fire({ title: '¡Actualizado!', icon: 'success', confirmButtonColor: '#2563eb' });

    document.getElementById('btn-registro').style.display = 'block';
    document.getElementById('btn-guardar').style.display = 'none';
    delete form.dataset.idModificando;
    delete form.dataset.boletaOriginal;

    limpiarFormulario();
    irPaso(1);
}

// ── Llenar formulario con datos existentes ────────────────────────────────────

function llenarFormularioConDatos(datos) {
    document.getElementById('fecha').value        = datos.fecha || '';
    document.getElementById('carrera').value      = datos.carrera || '';
    document.getElementById('nombre').value       = datos.nombre || '';
    document.getElementById('boleta').value       = datos.boleta || '';
    document.getElementById('materia').value      = datos.materia || '';
    document.getElementById('profesor').value     = datos.profesor || '';
    document.getElementById('mesa_trabajo').value = datos.mesa_de_trabajo || '';
    document.getElementById('integrantes').value  = datos.integrantes || '';

    // Equipos
    const equipos = datos.equipos ? datos.equipos.split('\n') : [];
    equipos.forEach(e => {
        const cb = document.querySelector(`input[name="herramientas"][value="${e.trim()}"]`);
        if (cb) cb.checked = true;
    });

    // Puntas
    const puntas = datos.puntas ? datos.puntas.split('\n') : [];
    puntas.forEach(p => {
        const [nombre, cant] = p.split(':').map(x => x.trim());
        const cb = document.querySelector(`input[name="herramientas"][value="${nombre}"]`);
        if (cb) {
            cb.checked = true;
            const cantInput = document.getElementById(cb.id.replace('_check',''));
            if (cantInput) { cantInput.style.display = 'block'; cantInput.value = cant || 1; }
        }
    });

    // Herramientas
    const herramientas = datos.herramienta ? datos.herramienta.split('\n') : [];
    const lista = document.getElementById('lista-herramientas');
    lista.innerHTML = '';
    herramientas.forEach(h => { if (h.trim()) agregarHerramientaTag(h.trim()); });
}

// ── Puntas: mostrar/ocultar cantidad ─────────────────────────────────────────

document.querySelectorAll('.check-item input[type="checkbox"]').forEach(cb => {
    if (!cb.id.includes('puntas')) return;
    cb.addEventListener('change', function() {
        const cantInput = document.getElementById(cb.id.replace('_check',''));
        if (cantInput) cantInput.style.display = cb.checked ? 'block' : 'none';
    });
});

// ── Herramientas ──────────────────────────────────────────────────────────────

function agregarHerramientaTag(texto) {
    const lista = document.getElementById('lista-herramientas');
    const tag = document.createElement('span');
    tag.classList.add('herramienta-tag');
    tag.dataset.valor = texto;
    tag.innerHTML = `${texto} <button type="button" onclick="this.parentElement.remove()">✕</button>`;
    lista.appendChild(tag);
}

document.addEventListener('DOMContentLoaded', () => {
    // Auto-llenar fecha de hoy (zona horaria México)
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });
    document.getElementById('fecha').value = hoy;

    const input = document.getElementById('herramienta-input');
    const boton = document.getElementById('agregar-herramienta');

    function agregar() {
        const val = input.value.trim();
        if (!val) return;
        agregarHerramientaTag(val);
        input.value = '';
    }

    boton.addEventListener('click', agregar);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); agregar(); } });
});
