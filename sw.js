const CACHE_NAME = 'lab-bioing-v1';

// Archivos que se guardan en el celular la primera vez
const ARCHIVOS_CACHE = [
    '/BioingenieriaNew/',
    '/BioingenieriaNew/index.html',
    '/BioingenieriaNew/js/app.js',
    '/BioingenieriaNew/css/estilos.css',
    '/BioingenieriaNew/css/IPN.png',
    '/BioingenieriaNew/css/UPIITA.png'
];

// Instalar: guardar archivos en caché
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ARCHIVOS_CACHE))
    );
    self.skipWaiting();
});

// Activar: limpiar cachés viejos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Cola de registros pendientes cuando no hay internet
const QUEUE_KEY = 'registros-pendientes';

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Si es una petición a Supabase (guardar registro), manejar offline
    if (url.hostname.includes('supabase.co') && event.request.method === 'POST') {
        event.respondWith(
            fetch(event.request.clone()).catch(async () => {
                // Sin internet: guardar en cola
                const body = await event.request.clone().json();
                const queue = await getQueue();
                queue.push({ url: url.href, body, timestamp: Date.now() });
                await saveQueue(queue);

                // Responder al formulario como si hubiera funcionado
                return new Response(JSON.stringify({ queued: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // Para el resto: intentar red primero, si falla usar caché
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});

// Cuando regresa la conexión: enviar registros pendientes
self.addEventListener('sync', event => {
    if (event.tag === 'sync-registros') {
        event.waitUntil(sincronizarPendientes());
    }
});

async function sincronizarPendientes() {
    const queue = await getQueue();
    if (!queue.length) return;

    const enviados = [];
    for (const item of queue) {
        try {
            await fetch(item.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json',
                           'apikey': 'sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-',
                           'Authorization': 'Bearer sb_publishable_7-8BuHvJF63KH6T2xavAEA_euEHKqC-' },
                body: JSON.stringify(item.body)
            });
            enviados.push(item);
        } catch (e) {
            // Si sigue sin internet, lo deja en cola
        }
    }

    // Quitar los enviados de la cola
    const restantes = queue.filter(i => !enviados.includes(i));
    await saveQueue(restantes);
}

async function getQueue() {
    const db = await openDB();
    return new Promise(resolve => {
        const tx = db.transaction('queue', 'readonly');
        tx.objectStore('queue').getAll().onsuccess = e => resolve(e.target.result || []);
    });
}

async function saveQueue(items) {
    const db = await openDB();
    return new Promise(resolve => {
        const tx = db.transaction('queue', 'readwrite');
        const store = tx.objectStore('queue');
        store.clear();
        items.forEach(item => store.add(item));
        tx.oncomplete = resolve;
    });
}

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('lab-bioing-offline', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('queue', { autoIncrement: true });
        req.onsuccess = e => resolve(e.target.result);
        req.onerror = reject;
    });
}
