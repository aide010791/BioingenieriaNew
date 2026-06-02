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
    const campos = ['fecha','carrera','nombre','boleta','materia','profesor','mesa_trabajo'];
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
        'Fecha':    document.getElementById('fecha').value,
        'Carrera':  document.getElementById('carrera').value,
        'Nombre':   document.getElementById('nombre').value,
        'Boleta':   document.getElementById('boleta').value,
        'Materia':  document.getElementById('materia').value,
        'Profesor': document.getElementById('profesor').value,
        'Mesa':     document.getElementById('mesa_trabajo').value,
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

    const id = generarIdUnico();
    const { equipos, puntas, herramienta } = recopilarDatos();

    const { error } = await db.from('registros').insert([{
        id,
        fecha:          document.getElementById('fecha').value,
        carrera:        document.getElementById('carrera').value,
        nombre:         document.getElementById('nombre').value,
        boleta:         document.getElementById('boleta').value,
        materia:        document.getElementById('materia').value,
        profesor:       document.getElementById('profesor').value,
        mesa_de_trabajo: document.getElementById('mesa_trabajo').value,
        equipos,
        puntas,
        herramienta,
        estado: 'pendiente'
    }]);

    // Si el service worker guardó en cola (sin internet), la respuesta trae {queued: true}
    const sinInternet = error && error.message && error.message.includes('fetch');

    if (error && !sinInternet) {
        Swal.fire('Error al registrar', error.message, 'error');
        return;
    }

    if (sinInternet) {
        Swal.fire({
            title: '¡Registro guardado!',
            text: 'No hay conexión ahora, pero tu registro se enviará automáticamente cuando recuperes internet.',
            icon: 'info',
            confirmButtonText: 'OK',
            confirmButtonColor: '#2563eb'
        });
    } else {
        Swal.fire({
            title: '¡Registro exitoso!',
            text: 'Tu información fue guardada correctamente.',
            icon: 'success',
            confirmButtonText: 'OK',
            confirmButtonColor: '#2563eb'
        });
    }

    limpiarFormulario();
    irPaso(1);
    volverBienvenida();
});

// ── Generar ID único ──────────────────────────────────────────────────────────

function generarIdUnico() {
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = '';
    do {
        id = '';
        for (let i = 0; i < 3; i++) id += letras[Math.floor(Math.random() * letras.length)];
    } while (idYaExiste(id));
    guardarId(id);
    return id;
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
    document.querySelectorAll('#formulario-registro input[type="number"]').forEach(i => i.style.display = 'none');
    document.getElementById('lista-herramientas').innerHTML = '';
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

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

    const { data, error } = await db
        .from('registros')
        .select('*')
        .eq('boleta', boleta.trim())
        .eq('fecha', hoy)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

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

    const { error } = await db.from('registros').update({
        fecha:          document.getElementById('fecha').value,
        carrera:        document.getElementById('carrera').value,
        nombre:         document.getElementById('nombre').value,
        boleta:         document.getElementById('boleta').value,
        materia:        document.getElementById('materia').value,
        profesor:       document.getElementById('profesor').value,
        mesa_de_trabajo: document.getElementById('mesa_trabajo').value,
        equipos, puntas, herramienta
    }).eq('id', id);

    if (error) { Swal.fire('Error', error.message, 'error'); return; }

    Swal.fire({ title: '¡Actualizado!', icon: 'success', confirmButtonColor: '#2563eb' });

    document.getElementById('btn-registro').style.display = 'block';
    document.getElementById('btn-guardar').style.display = 'none';
    delete document.getElementById('formulario-registro').dataset.idModificando;

    limpiarFormulario();
    irPaso(1);
}

// ── Llenar formulario con datos existentes ────────────────────────────────────

function llenarFormularioConDatos(datos) {
    document.getElementById('fecha').value       = datos.fecha || '';
    document.getElementById('carrera').value     = datos.carrera || '';
    document.getElementById('nombre').value      = datos.nombre || '';
    document.getElementById('boleta').value      = datos.boleta || '';
    document.getElementById('materia').value     = datos.materia || '';
    document.getElementById('profesor').value    = datos.profesor || '';
    document.getElementById('mesa_trabajo').value = datos.mesa_de_trabajo || '';

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
