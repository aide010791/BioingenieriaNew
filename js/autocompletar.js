// ── Autocompletado de Materia y Profesor ──────────────────────────────────────
// Usa window.CATALOGO (js/catalogo.js). Mientras el alumno escribe, muestra
// sugerencias; puede elegir una o seguir escribiendo libremente.
//  - Busca por cualquier palabra, sin importar acentos ni mayúsculas
//    ("inst biom" → "Instrumentación Biomédica", "bayareh" → "Rafael Bayareh Mancilla").
//  - Las materias de la carrera elegida aparecen primero.
//  - Si la materia escrita está en el catálogo, sus profesores aparecen primero
//    (y se muestran al tocar el campo Profesor aunque esté vacío).

(function () {
    const C = window.CATALOGO;
    if (!C) return;

    const MAX = 6;
    const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const palabras = s => norm(s).split(/[\s(),.\-/]+/).filter(Boolean);

    const materias   = C.materias.map(m => ({ ...m, k: norm(m.n), w: palabras(m.n) }));
    const profesores = C.profesores.map(p => ({ ...p, k: norm(p.n), w: palabras(p.n) }));
    const materiaPorNombre = new Map(materias.map(m => [m.k, m]));

    // Todas las palabras escritas deben ser el inicio de alguna palabra del nombre
    function coincide(item, consulta) {
        const q = palabras(consulta);
        return q.length > 0 && q.every(t => item.w.some(w => w.startsWith(t)));
    }

    function buscarMaterias(texto) {
        if (norm(texto).length < 2) return [];
        const carrera = document.getElementById('carrera')?.value || '';
        const q = norm(texto);
        return materias
            .filter(m => coincide(m, texto))
            .map(m => ({ m, score: (m.c.includes(carrera) ? 2 : 0) + (m.k.startsWith(q) ? 1 : 0) }))
            .sort((a, b) => b.score - a.score || a.m.k.localeCompare(b.m.k))
            .slice(0, MAX)
            .map(({ m }) => ({ texto: m.n, detalle: m.c.join(' · ') }));
    }

    function buscarProfesores(texto) {
        const mat = materiaPorNombre.get(norm(document.getElementById('materia')?.value));
        const imparte = new Set(mat ? mat.p : []);
        let lista;
        if (norm(texto).length === 0) {
            if (!mat) return [];
            lista = mat.p.map(i => profesores[i]);                 // campo vacío: quienes imparten la materia
        } else {
            lista = profesores.filter(p => coincide(p, texto));
        }
        return lista
            .map((p, i) => ({ p, score: imparte.has(profesores.indexOf(p)) ? 1 : 0, i }))
            .sort((a, b) => b.score - a.score || a.i - b.i)
            .slice(0, MAX)
            .map(({ p, score }) => ({ texto: p.n, detalle: score && mat ? 'Imparte ' + mat.n : '' }));
    }

    function conectar(input, buscar) {
        if (!input) return;
        input.setAttribute('autocomplete', 'off');
        input.parentElement.classList.add('ac-contenedor');

        const caja = document.createElement('div');
        caja.className = 'ac-lista';
        caja.setAttribute('role', 'listbox');
        input.insertAdjacentElement('afterend', caja);

        let opciones = [], activa = -1;

        function cerrar() { caja.classList.remove('visible'); activa = -1; }

        function elegir(i) {
            if (!opciones[i]) return;
            input.value = opciones[i].texto;
            cerrar();
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function pintar() {
            caja.innerHTML = '';
            opciones.forEach((o, i) => {
                const el = document.createElement('div');
                el.className = 'ac-opcion' + (i === activa ? ' activa' : '');
                el.setAttribute('role', 'option');
                const t = document.createElement('div'); t.className = 'ac-texto'; t.textContent = o.texto;
                el.appendChild(t);
                if (o.detalle) { const d = document.createElement('div'); d.className = 'ac-detalle'; d.textContent = o.detalle; el.appendChild(d); }
                // pointerdown para que funcione antes de que el input pierda el foco (móvil y escritorio)
                el.addEventListener('pointerdown', e => { e.preventDefault(); elegir(i); });
                caja.appendChild(el);
            });
            caja.classList.toggle('visible', opciones.length > 0);
        }

        function actualizar() {
            opciones = buscar(input.value);
            // No sugerir si lo escrito ya es exactamente la única opción
            if (opciones.length === 1 && norm(opciones[0].texto) === norm(input.value)) opciones = [];
            activa = -1;
            pintar();
        }

        input.addEventListener('input', actualizar);
        input.addEventListener('focus', actualizar);
        input.addEventListener('blur', () => setTimeout(cerrar, 120));
        input.addEventListener('keydown', e => {
            if (!caja.classList.contains('visible')) return;
            if (e.key === 'ArrowDown') { activa = (activa + 1) % opciones.length; pintar(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { activa = (activa - 1 + opciones.length) % opciones.length; pintar(); e.preventDefault(); }
            else if (e.key === 'Enter' && activa >= 0) { elegir(activa); e.preventDefault(); }
            else if (e.key === 'Escape') { cerrar(); }
        });
    }

    function iniciar() {
        conectar(document.getElementById('materia'), buscarMaterias);
        conectar(document.getElementById('profesor'), buscarProfesores);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
