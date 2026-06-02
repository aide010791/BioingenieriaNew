# Contexto del proyecto — Registro Laboratorio de Bioingeniería (UPIITA-IPN)

## Descripción general
Sistema de registro de material para el laboratorio de Bioingeniería de la UPIITA-IPN. Los alumnos acceden mediante un código QR desde su celular. El encargado del laboratorio tiene un panel de administrador separado.

---

## Estructura de archivos

```
ValeBioingenieriaLetras/
├── index.html         ← Formulario del alumno (móvil)
├── admin.html         ← Panel de administrador
├── js/
│   └── app.js         ← Lógica del formulario
└── css/
    ├── estilos.css    ← Estilos del formulario (heredados, ya casi sin uso)
    ├── IPN.png        ← Logo del IPN
    ├── UPIITA.png     ← Logo de UPIITA
    └── fondo*.jpg     ← Imágenes de fondo (ya no se usan en el diseño actual)
```

---

## Base de datos — Supabase

- **URL:** `https://yzhdtwdwakzcnlergcpk.supabase.co`
- **API Key (pública):** `sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-`
- **Tabla:** `registros`

### Estructura de la tabla `registros`

```sql
CREATE TABLE registros (
  id               TEXT PRIMARY KEY,       -- ID interno de 3 letras (ej: "ABC"), generado automáticamente
  fecha            DATE NOT NULL,           -- Fecha del registro (llenada por el alumno)
  carrera          TEXT,                    -- Biónica | Mecatrónica | Telemática | ISISA
  nombre           TEXT NOT NULL,
  boleta           TEXT NOT NULL,           -- Usado para buscar/modificar registros
  materia          TEXT NOT NULL,           -- Texto libre
  profesor         TEXT NOT NULL,
  mesa_de_trabajo  TEXT,
  equipos          TEXT,                    -- Texto separado por \n, ej: "Osciloscopio\nMultimetro"
  puntas           TEXT,                    -- Texto separado por \n, ej: "Puntas BNC-Caiman: 2"
  herramienta      TEXT,                    -- Texto separado por \n (herramientas adicionales libres)
  estado           TEXT DEFAULT 'pendiente',-- 'pendiente' | 'parcial' | 'entregado'
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()  -- Hora real del registro (UTC)
);

-- Columna agregada después:
ALTER TABLE registros ADD COLUMN carrera TEXT;
```

> **Nota:** Las columnas `tarjeta_stm32f4` y `biofisica` fueron eliminadas del formulario pero pueden seguir existiendo en la tabla sin problema — simplemente se ignoran.

---

## Formulario del alumno (index.html + app.js)

### Flujo de usuario

1. **Pantalla de bienvenida** — dos botones: "Nuevo registro" y "Modificar mi registro"
2. **Wizard de 3 pasos:**
   - Paso 1: Datos personales (fecha, carrera, nombre, boleta, materia, profesor, mesa)
   - Paso 2: Equipos, puntas y herramientas adicionales
   - Paso 3: Resumen para confirmar antes de enviar

### Equipos disponibles (checkboxes, sin cantidad)
- Osciloscopio
- Generador de Funciones
- Fuente de Alimentación
- Multímetro
- Generador AM-FM

### Puntas (checkboxes con cantidad numérica)
- BNC-Caiman
- Banana-Caiman
- Caiman-Caiman

### Herramientas adicionales
- Campo de texto libre con botón "Agregar"
- Se muestran como chips/tags con botón para eliminar

### Modificar registro
- El alumno busca su registro por **número de boleta**
- Solo puede modificar registros del **día de hoy**
- Ventana de modificación: **3 horas** desde `created_at`
- Si pasa el tiempo, debe pedir al encargado que extienda el tiempo desde el admin
- Al encontrar el registro, el formulario se carga en el **Paso 2** directamente

### ID interno de 3 letras
- Se genera automáticamente al registrar (ej: "FWX")
- El alumno ya **no lo ve** — es solo para uso interno del admin
- Se usa como PRIMARY KEY en Supabase
- Se guarda en `localStorage` para evitar duplicados en el mismo dispositivo

### Zona horaria
- Toda comparación de fechas usa `America/Mexico_City`
- `new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })`

---

## Panel de administrador (admin.html)

### Acceso
- Protegido por contraseña hasheada con **SHA-256**
- Hash actual (contraseña: `labbioing2024`):
  `ef449652ef4a87a5fad1b8f72a791e371ee4722bd7540dc791ae1ac36af39dfc`
- Para cambiar la contraseña: generar nuevo hash en https://emn178.github.io/online-tools/sha256.html
  y reemplazar `PASSWORD_HASH` en el script de `admin.html`

### Funcionalidades
- **Filtrar por fecha** con botón "Hoy" (usa zona horaria México)
- **Contadores** de registros por estado (Pendientes / Parciales / Entregados)
- **Tabla de registros** con columnas: Hora, Carrera, Nombre, Boleta, Materia, Profesor, Mesa, Estado, Acciones
- **Colores por estado en filas:**
  - Amarillo suave = Pendiente
  - Naranja suave = Parcial
  - Verde suave = Entregado
- **Selector de estado** con color en cada fila (dropdown estilizado)
- **Click en fila** abre panel lateral de detalle
- **Panel lateral de detalle** muestra:
  - ID interno, fecha, carrera, boleta, materia, profesor, mesa, hora
  - Equipos, puntas, herramientas registradas
  - Botón "Editar material" (cambia estado a 'parcial' automáticamente)
  - Botón "+3h alumno" (resetea `created_at` para extender ventana de modificación)
  - Botón "Eliminar registro" (rojo, con confirmación)
- **Exportar a Excel** con rango de fechas (inicio y fin), genera `.xlsx` usando SheetJS
  - Nombre del archivo: `lab_bioing_YYYY-MM-DD_YYYY-MM-DD.xlsx`

### Librerías usadas en admin.html
- `@supabase/supabase-js@2` (CDN)
- `sweetalert2@11` (CDN)
- `xlsx@0.18.5` (CDN, SheetJS para exportar Excel)
- `Inter` (Google Fonts)

---

## Librerías usadas en index.html / app.js
- `@supabase/supabase-js@2` (CDN)
- `sweetalert2@11` (CDN)
- `Inter` (Google Fonts)
- `Material Symbols Outlined` (Google Fonts, para ícono de eliminar herramienta)

---

## Decisiones de diseño tomadas

| Decisión | Razón |
|---|---|
| Búsqueda por boleta (no por ID de 3 letras) | La boleta es única y el alumno siempre la sabe |
| Ventana de 3 horas para modificar | Evita modificaciones tardías, pero el admin puede extender |
| Materia como texto libre | Hay demasiadas materias y alumnos de otras carreras |
| ID de 3 letras solo interno | El alumno no lo necesita, simplifica la UX |
| Contraseña hasheada | Evita que el código fuente exponga la contraseña |
| Zona horaria Mexico_City en todo | Evita bug donde después de las 6pm el sistema cree que es mañana |
| font-size: 16px en inputs | iOS Safari hace zoom automático si es menor a 16px |
| viewport-fit=cover + safe-area-inset | Soporte para iPhone con notch (X en adelante) |

---

## Pendientes / mejoras sugeridas (no implementadas)

1. **Validación de formato de boleta** — actualmente acepta cualquier texto
2. **Consulta de estado para el alumno** — que el alumno pueda ver si su material fue marcado como entregado
3. **Dropdown de materias más comunes** con opción "Otra" para texto libre

---

## Cómo cambiar la contraseña del admin

1. Ve a https://emn178.github.io/online-tools/sha256.html
2. Escribe tu nueva contraseña
3. Copia el hash generado
4. En `admin.html`, busca la línea `const PASSWORD_HASH = '...'` y reemplaza el valor
