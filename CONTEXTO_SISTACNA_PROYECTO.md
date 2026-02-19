# CONTEXTO SISTACNA - SISTEMA DE GESTIÓN PARA RESTAURANTES

**Versión**: 2.0
**Fecha**: Febrero 2026
**Estado**: Desarrollo desde cero
**Stack**: HTML5, CSS3, JavaScript Vanilla, Firebase, PWA

---

## DESCRIPCIÓN GENERAL DEL PROYECTO

SISTACNA es una aplicación web progresiva (PWA) completa para gestión integral de restaurantes. Integra página pública, menú digital interactivo, carrito de pedidos, sistema de comandas en tiempo real, caja integrada, gestión de usuarios y auditoria.

**Objetivo principal**: Modernizar operaciones del restaurante, incrementar ingresos (+40%), reducir costos operacionales (-30%) y mejorar experiencia del cliente.

**Duración estimada**: 20 días de desarrollo
**Impacto**: Sistema profesional, modular, escalable y producción-ready

---

## ARQUITECTURA GENERAL

```
CLIENTE (Público)          →    OPERACIONES (Meseros)    →    NEGOCIO (Admin)
        ↓                              ↓                              ↓
    index.html            →      carta.html              →      admin.html
  (Landing Page)          (Menú Digital + Carrito)     (Panel Administrativo)
```

### Capas

```
Presentación:   HTML5 Semántico
Estilos:        CSS3 (Variables, Grid, Flexbox, Animaciones)
Lógica:         JavaScript ES6+ Vanilla (Clases, Async/Await)
Almacenamiento: LocalStorage (cliente) + Firebase (servidor)
Autenticación:  Firebase Auth (Email/Password)
Base de Datos:  Firestore (Documentos en tiempo real)
Hospedaje:      Firebase Hosting (CDN global)
Offline:        Service Worker + PWA
```

---

## ESTRUCTURA DE CARPETAS (DEFINITIVA)

```
sistacna/
│
├── 📄 HTML (En raíz)
│   ├── index.html                 HOME (Landing pública)
│   ├── carta.html                 MENÚ DIGITAL (Clientes)
│   ├── carrito.html               CARRITO (Resumen pedido)
│   └── admin.html                 PANEL ADMIN (Gestión)
│
├── 🎨 css/
│   ├── utils.css                  Estilos globales compartidos
│   ├── index.css                  Estilos HOME
│   ├── carta.css                  Estilos MENÚ
│   ├── carrito.css                Estilos CARRITO
│   └── admin.css                  Estilos ADMIN
│
├── 📜 js/
│   ├── utils.js                   Funciones compartidas (validaciones, formatos, DOM, notificaciones)
│   ├── firebase-config.js         Configuración centralizada Firebase
│   ├── index.js                   Lógica HOME
│   ├── carta.js                   Lógica MENÚ DIGITAL
│   ├── carrito.js                 Lógica CARRITO
│   └── admin.js                   Lógica PANEL ADMIN
│
├── 💾 data/
│   ├── platos.json                Catálogo de platos
│   └── configuracion.json         Datos del restaurante
│
├── 🖼️ imagenes/
│   ├── platos/                    Fotos de platos
│   ├── logos/                     Logo del restaurante
│   └── iconos/                    Iconos SVG
│
├── 🔧 PWA
│   ├── manifest.json              Configuración PWA
│   ├── sw.js                      Service Worker (offline)
│   └── iconos-app/                Iconos 192x192, 512x512
│
└── 📚 Documentación
    ├── README.md
    ├── CONTEXTO_SISTACNA_PROYECTO.md (Este documento)
    └── ... (otros documentos)
```

---

## CONVENCIONES DE CÓDIGO

### General
- **Idioma**: Español en todo el código
- **Sin comentarios**: El código debe ser autoeexplicativo
- **Sin emojis**: En archivos de código
- **Vanilla**: Sin frameworks, librerías mínimas

### Variables
```javascript
const datosMenu = [];
const platoActual = {};
const totalPagar = 0;
const listaItems = [];
const usuarioLogueado = {};
const estadoComanda = 'pendiente';
```

### Funciones
```javascript
function cargarMenu() {}
function filtrarPlatos() {}
const agregarAlCarrito = (item) => {};
const actualizarEstadoComanda = async (id, estado) => {};
const calcularTotal = (items) => items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
```

### IDs HTML
```html
id="btnCarrito"
id="searchBox"
id="modalPlato"
id="gridPlatos"
id="panelCarrito"
id="tabComandas"
id="btnEnviarPedido"
```

### Clases CSS
```css
.contenedor
.encabezado
.nav-menu
.btn-primario
.btn-secundario
.modal
.modal.activo
.tarjeta
.carrito-item
.tabla-datos
.formulario-grupo
.campo-entrada
```

### Variables CSS (en utils.css)
```css
--azul-principal: #0052B4
--azul-oscuro: #003d8a
--azul-suave: #4A90E2
--dorado: #c8a95e
--verde-acento: #2d8659
--gris-claro: #f8f7f5
--gris-medio: #e8e5e0
--blanco: #ffffff
--error: #dc3545
--exito: #28a745
--advertencia: #ffc107
--fuente-principal: 'Poppins', sans-serif
--fuente-titulos: 'Montserrat', sans-serif
--transicion-rapida: 0.3s ease
--transicion-media: 0.4s ease
```

---

## MÓDULO 1: HOME (index.html)

### Responsabilidad
Página pública del restaurante. Presentar marca, ambiente, información contacto, galería de instalaciones.

### Estructura HTML

```html
<header>
  - Logo + nombre restaurante
  - Navegación: Inicio, Nosotros, Galería, Carta, Contacto
  - Ícono Admin (candado)
  - Menú hamburguesa móvil

<section id="hero">
  - Fondo imagen grande + overlay
  - Título principal
  - Subtítulo descriptivo
  - 2 botones CTA:
    * "Ver Nuestra Carta" → carta.html
    * "Reservar Mesa" → WhatsApp

<section id="nosotros">
  - Badge año fundación
  - Descripción (2 párrafos)
  - Botones: "Nuestro Equipo", "Reglamento"
  - Tarjetas: Misión, Visión

<section id="galeria">
  - Grid de tarjetas: imagen, nombre, descripción
  - Click abre modal con galería de fotos

<section id="contacto">
  - Ubicación, teléfono, email
  - Redes sociales
  - Mapa Google Maps embebido
  - Botón flotante WhatsApp
```

### Lógica JavaScript (index.js)

```javascript
Clase ModalGaleria:
  constructor() - capturar elementos del DOM
  abrir(seccion) - abrir modal con galería
  cerrar() - cerrar modal
  navegar(direccion) - avanzar/retroceder imagen
  actualizarGaleria() - actualizar imagen con transición

Funciones inicialización:
  inicializarMenuMovil() - toggle menú hamburguesa
  inicializarScrollSuave() - smooth scroll para links
  inicializarAnimaciones() - Intersection Observer
  inicializarParallax() - efecto parallax en hero
  inicializarServiceWorker() - registrar SW para PWA

Datos de ejemplo:
  const SECCIONES = {
    instalaciones: { imagenes: [], descripciones: [] },
    ambiente: { imagenes: [], descripciones: [] }
  }

Eventos:
  ESC cierra modal
  Flechas navegan galería
  Click overlay cierra
  Scroll para animaciones
```

### Variables CSS (index.css)

Reutilizar variables de utils.css + adicionales:
```css
--altura-hero: 600px
--altura-seccion: 400px
--padding-seccion: 60px
--margen-grid: 30px
```

### Responsive
- Móvil (<480px): 1 columna, hero 300px, menú hamburguesa
- Tablet (480-768px): 2 columnas, hero 400px
- Desktop (>768px): 3-4 columnas, hero 600px

---

## MÓDULO 2: CARTA DIGITAL (carta.html)

### Responsabilidad
Menú digital interactivo. Mostrar platos, permitir personalización, gestionar carrito de pedidos.

### Estructura HTML

```html
<header>
  - Logo + navegación (Carta activa)
  - Botón flotante: Carrito con contador

<section id="heroCarta">
  - Fondo overlay
  - "Nuestra Carta" + descripción

<section id="menuPrincipal">
  - Input búsqueda: ícono lupa + botón limpiar
  - Tabs categorías (dinámicos desde platos.json)
  - Filtros estado: Todos, Disponibles, Promociones, Agotados
  - Toggle vista: Detallada / Simple
  - Contador resultados

  Grid platos (renderizado dinámico):
    Vista detallada:
      - Imagen con overlay hover
      - Nombre + precio
      - Descripción corta
      - Etiquetas: Nuevo, Popular, 2x1, Agotado
      - Botón "Personalizar"

    Vista simple:
      - Fila con nombre, precio
      - Botón "Agregar"

<aside id="panelCarrito">
  - Encabezado: "TU PEDIDO" + número orden
  - Lista items:
    * Nombre + cantidad (con +/- botones)
    * Precio subtotal
    * Botón eliminar (X)
  - Estado vacío si no hay items
  - Total a pagar (con IGV)
  - Campo: Nombre cliente o número mesa
  - Selector mozo (dropdown)
  - Textarea: Observaciones
  - Botón "Enviar Pedido"
  - Botón "Vaciar Carrito"

<div id="modalPlato">
  - Imagen del plato (grande)
  - Nombre + Precio
  - Descripción
  - Sección opciones (radio buttons por grupo)
    * Tamaño, tipo de corte, etc
  - Sección guarniciones (checkboxes, máx 2)
  - Campo observaciones (200 caracteres)
  - Selector cantidad: - / número / +
  - Subtotal en tiempo real
  - Botón "Agregar al Pedido" (verde)
  - Botón "Cancelar" (gris)

<div id="toast">
  - Notificación flotante: "Agregado al carrito"
```

### Lógica JavaScript (carta.js)

```javascript
Variables globales:
  let datosMenu = null
  let platosFiltrados = []
  let categoriaActual = 'todos'
  let vistaActual = 'detallada'
  let platoActual = null
  let cantidadActual = 1
  let carrito = []
  const CLAVE_STORAGE = 'restaurante_carrito'

Funciones principales:

  cargarMenu()
    fetch('data/platos.json')
    parsear datos en datosMenu
    renderizarCategorias()
    filtrarYRenderizar()

  renderizarCategorias()
    crear tabs dinámicos desde categorías
    agregar event listeners a cada tab

  filtrarYRenderizar()
    aplicar filtro: búsqueda + categoría + estado
    actualizar contador de resultados
    renderizarPlatos()

  renderizarPlatos()
    si vista === 'detallada': crear tarjetas con imagen
    si vista === 'simple': crear lista compacta
    cada plato tiene onclick → abrirModalPlato(platoId)

  abrirModalPlato(platoId)
    buscar plato en datosMenu
    renderizar opciones dinámicamente
    renderizar guarniciones si aplica
    mostrar modal
    reset cantidad = 1

  actualizarSubtotal()
    calcular: (precio base + opciones) * cantidad
    actualizar en tiempo real en el modal

  agregarAlCarrito()
    validar selecciones obligatorias
    construir objeto item:
      {
        platoId, nombre, precio, cantidad,
        opciones: [{grupo, valor}],
        guarniciones: [nombres],
        observaciones: string
      }
    carrito.push(item)
    guardarCartolStorage()
    mostrar toast
    cerrar modal
    actualizar interfaz

  cargarDesdeStorage()
    JSON.parse(localStorage.getItem(CLAVE_STORAGE))
    asignar a carrito global

  guardarEnStorage()
    localStorage.setItem(CLAVE_STORAGE, JSON.stringify(carrito))

  renderizarCarrito()
    si carrito vacío: mostrar mensaje "Tu carrito está vacío"
    si hay items:
      crear fila por item con:
        - nombre + opciones
        - cantidad con +/- botones
        - precio subtotal
        - botón eliminar
    renderizar total final (con IGV 18%)

  actualizarCantidadItem(indice, nuevaCantidad)
    si nuevaCantidad > 0:
      carrito[indice].cantidad = nuevaCantidad
    si nuevaCantidad = 0:
      carrito.splice(indice, 1)
    guardarEnStorage()
    renderizarCarrito()

  eliminarDelCarrito(indice)
    carrito.splice(indice, 1)
    guardarEnStorage()
    renderizarCarrito()

  calcularTotal()
    return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

  abrirPanelCarrito()
    panel.classList.add('activo')
    body.style.overflow = 'hidden'

  cerrarPanelCarrito()
    panel.classList.remove('activo')
    body.style.overflow = 'auto'

  enviarPedido()
    validar: nombre/mesa y carrito no vacío
    construir mensaje formateado:
      Mesa: XX
      Mozo: XXX
      Items:
        - X unidad de Plato (opciones, guarniciones)
      Total: S/.XX
    enviar por WhatsApp (API) O registrar en Firebase
    vaciarCarrito()
    mostrar confirmación

  vaciarCarrito()
    carrito = []
    guardarEnStorage()
    renderizarCarrito()
    mostrar toast "Carrito vaciado"

Eventos:
  input búsqueda → debounce → filtrarYRenderizar()
  click tabs categorías → filtrarYRenderizar()
  click plato → abrirModalPlato()
  click ± cantidad → actualizarCantidadItem()
  click X eliminar → eliminarDelCarrito()
  click "Enviar Pedido" → enviarPedido()
  click "Enviar" → cerrarPanelCarrito()
  ESC → cerrarModalPlato()
```

### Estructura de datos (platos.json)

```json
{
  "categorias": [
    { "id": "entradas", "nombre": "Entradas" },
    { "id": "carnes", "nombre": "Carnes" },
    { "id": "pescados", "nombre": "Pescados" },
    { "id": "bebidas", "nombre": "Bebidas" },
    { "id": "postres", "nombre": "Postres" }
  ],

  "guarniciones": [
    "Papas fritas",
    "Arroz blanco",
    "Arroz con verduras",
    "Ensalada mixta",
    "Zarza criolla"
  ],

  "mozos": [
    { "id": 1, "nombre": "Carlos", "telefono": "910000001" },
    { "id": 2, "nombre": "Juan", "telefono": "910000002" },
    { "id": 3, "nombre": "María", "telefono": "910000003" }
  ],

  "platos": [
    {
      "id": "ceviche-clasico",
      "nombre": "Ceviche Clásico",
      "categoria": "pescados",
      "precio": 45.00,
      "descripcion": "Ceviche fresco con limón y leche de tigre, cebollita roja",
      "imagen": "imagenes/platos/ceviche-clasico.jpg",
      "estado": "disponible",
      "etiquetas": ["popular", "recomendado"],
      "opciones": [
        {
          "id": "tamano",
          "nombre": "Tamaño",
          "tipo": "radio",
          "valores": [
            { "nombre": "Regular (400g)", "precio": 0 },
            { "nombre": "Especial (600g)", "precio": 10 }
          ]
        },
        {
          "id": "nivel-picante",
          "nombre": "Nivel de Picante",
          "tipo": "radio",
          "valores": [
            { "nombre": "Suave", "precio": 0 },
            { "nombre": "Picante", "precio": 0 }
          ]
        }
      ],
      "guarniciones": true,
      "tieneObservaciones": true
    },
    {
      "id": "causa-limenha",
      "nombre": "Causa Limeña",
      "categoria": "entradas",
      "precio": 35.00,
      "descripcion": "Causa amarilla tradicional con relleno de palta",
      "imagen": "imagenes/platos/causa.jpg",
      "estado": "disponible",
      "etiquetas": ["popular"],
      "opciones": [],
      "guarniciones": false,
      "tieneObservaciones": true
    }
  ]
}
```

### Responsive
- Móvil: 1 columna platos, panel carrito modal
- Tablet: 2 columnas platos, panel carrito sidebar
- Desktop: 3 columnas platos, panel carrito sidebar permanente

---

## MÓDULO 3: CARRITO (carrito.html)

### Responsabilidad
Página independiente para revisar y procesar el carrito. Resumen detallado del pedido antes de enviar.

### Estructura HTML

```html
<header>
  - Logo + navegación

<section id="resumenPedido">
  - Título "Resumen de tu Pedido"
  - Tabla de items:
    Columnas: Cantidad | Plato | Opciones | Precio Unitario | Subtotal | Acción
    Cada fila:
      - Cantidad con ± botones
      - Nombre plato + especificaciones
      - Opciones seleccionadas (pequeño)
      - Precio unitario
      - Subtotal (cantidad × precio)
      - Botón eliminar (X)
  - Link "Agregar más platos" → carta.html

  Resumen totales:
    - Subtotal: S/.XXX.XX
    - IGV (18%): S/.XXX.XX
    - Total: S/.XXX.XX (resaltado)

  Datos del pedido:
    - Campo: Nombre cliente o número mesa (obligatorio)
    - Selector: Mozo (dropdown)
    - Textarea: Observaciones (200 caracteres máximo)

  Botones acción:
    - "Enviar Pedido" (verde, grande)
    - "Editar Carrito" (gris)
    - "Cancelar Pedido" (gris)
```

### Lógica JavaScript (carrito.js)

```javascript
Variables globales:
  let carrito = []
  const CLAVE_STORAGE = 'restaurante_carrito'
  let pedidoActual = null

Funciones principales:

  inicializar()
    cargarDesdeStorage()
    if carrito vacío → mostrar "Tu carrito está vacío"
    else → renderizarTabla()

  cargarDesdeStorage()
    carrito = JSON.parse(localStorage.getItem(CLAVE_STORAGE)) || []

  renderizarTabla()
    crear fila por cada item en carrito
    cada fila:
      - cantidad con +/- botones
      - nombre + opciones
      - precio unitario
      - subtotal
      - botón eliminar
    renderizarResumenTotales()

  renderizarResumenTotales()
    const subtotal = calcularSubtotal()
    const igv = subtotal * 0.18
    const total = subtotal + igv
    actualizar en HTML:
      Subtotal: S/.XX
      IGV (18%): S/.XX
      Total: S/.XX

  calcularSubtotal()
    return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

  actualizarCantidad(indice, nuevaCantidad)
    if nuevaCantidad > 0:
      carrito[indice].cantidad = nuevaCantidad
    else:
      carrito.splice(indice, 1)
    guardarEnStorage()
    location.reload() o renderizarTabla()

  eliminarItem(indice)
    carrito.splice(indice, 1)
    guardarEnStorage()
    if carrito vacío: mostrar "Tu carrito está vacío"
    else: renderizarTabla()

  enviarPedido()
    nombreCliente = input.value.trim()
    mozo = select.value
    observaciones = textarea.value

    if !nombreCliente:
      mostrar toast "Ingresa nombre o mesa"
      return

    construir objeto pedido:
      {
        items: carrito,
        nombreCliente,
        mozo,
        observaciones,
        subtotal: calcularSubtotal(),
        igv: calcularSubtotal() * 0.18,
        total: calcularSubtotal() * 1.18,
        fecha: new Date(),
        estado: 'pendiente'
      }

    enviar a Firebase:
      db.collection('comandas').add(pedido)
      .then(() => {
        localStorage.removeItem(CLAVE_STORAGE)
        mostrar confirmación
        redirect a carta.html después de 2 segundos
      })
      .catch(error => mostrar error)

  cancelarPedido()
    if confirm("¿Estás seguro de cancelar el pedido?"):
      localStorage.removeItem(CLAVE_STORAGE)
      redirect a carta.html

Eventos:
  DOMContentLoaded → inicializar()
  click +/- cantidad → actualizarCantidad()
  click X eliminar → eliminarItem()
  click "Enviar Pedido" → enviarPedido()
  click "Cancelar" → cancelarPedido()
```

---

## MÓDULO 4: ADMIN (admin.html)

### Responsabilidad
Panel administrativo completo. Gestionar comandas, caja, usuarios, carta, auditoria. Multi-rol.

### Estructura HTML

```html
<div id="pantallaLogin">
  - Fondo animado gradiente
  - Card glassmorphism:
    * Logo restaurante
    * "Panel de Administración"
    * Input email + ícono
    * Input password + toggle mostrar/ocultar
    * Checkbox "Recordar sesión"
    * Botón "Acceder" + spinner
    * Mensaje error dinámico

<div id="panelAdmin" style="display:none">

  <header>
    - Logo + "Panel de Administración"
    - Info usuario: nombre + rol badge
    - Botón "Salir"
    - Menú hamburguesa móvil

  <nav id="navPestanas">
    Tab 1: COMANDAS (📋) - Mozo, Admin, Chef
    Tab 2: CAJA (💰) - Cajero, Admin
    Tab 3: GESTION CARTA (🍽️) - Admin, Super Admin
    Tab 4: USUARIOS (👥) - Super Admin
    Tab 5: AUDITORIA (📊) - Super Admin

  <div id="tabComandas">
    Tarjetas estadísticas (4 tarjetas):
      - Pendientes: cantidad
      - En preparación: cantidad
      - Listos: cantidad
      - Entregados hoy: cantidad

    Filtros:
      - Estado: select (Todos, Pendientes, Preparación, Listos, Entregados)
      - Mesa: input número
      - Mozo: select dinámico
      - Buscar comanda: input

    Grid comandas (tarjetas):
      Cada comanda:
        - Número comanda (#001)
        - Mesa + Mozo
        - Hora creación
        - Estado badge (color)
        - Items: lista simple
        - Observaciones (si aplica)
        - Botones acción según estado:
          * Pendiente: "Preparar" → En Preparación
          * Preparación: "Listo" → Listo
          * Listo: "Entregar" → Entregado
          * Entregado: "Cobrar" → Caja
        - Botón "Imprimir comanda" (ticket 80mm)
        - Botón "Cancelar comanda"

    Botón "Nueva Comanda Manual":
      Modal para crear comanda desde admin:
        - Select mesa
        - Select mozo
        - Input búsqueda platos
        - Selector cantidad por plato
        - Botón agregar plato
        - Textarea observaciones
        - Botón "Crear Comanda"

  <div id="tabCaja">
    Resumen del día (4 tarjetas):
      - Ventas totales
      - Cantidad boletas
      - Ticket promedio
      - Mesas atendidas

    Comandas listas para cobrar:
      Tabla/Grid:
        - Comanda #
        - Mesa
        - Total
        - Botón "Generar Boleta"

    Modal Generar Boleta:
      - Datos restaurante (RUC, Razón Social)
      - Número boleta (auto-correlativo)
      - Detalle items:
        Tabla: Cantidad | Descripción | Precio Unitario | Subtotal
      - Subtotal
      - IGV (18%)
      - Total
      - Select método pago: Efectivo, Tarjeta, Yape/Plin, Mixto
      - Si Efectivo: Input "Pago con" + cálculo vuelto
      - Botones: "Emitir Boleta", "Cancelar"

    Historial boletas del día:
      Tabla: Número | Hora | Mesa | Total | Método Pago | Acciones
      Acciones: Reimprimir, Anular

    Cierre de caja:
      - Resumen totales por método
      - Total esperado vs total real
      - Textarea observaciones
      - Botón "Cerrar Caja del Día"
      - Opción exportar a Excel

  <div id="tabCarta">
    Estadísticas (4 tarjetas):
      - Disponibles: cantidad
      - Agotados: cantidad
      - Promociones: cantidad
      - Total: cantidad

    Filtros:
      - Categoría: select dinámico
      - Búsqueda nombre
      - Etiqueta: checkboxes (Agotado, Nuevo, Popular)

    Lista/Grid platos:
      Tarjeta por plato:
        - Imagen
        - Nombre + Precio
        - Disponibilidad badge
        - Etiquetas
        - Botón "Editar Estado"

    Modal Editar Estado:
      - Radio: Disponible | Agotado | Próximamente
      - Checkboxes: Nuevo, Popular, 2x1, Recomendado
      - Checkboxes: Solo Fin de Semana, Solo Almuerzo
      - Botones: Guardar, Cancelar

  <div id="tabUsuarios">
    Tabla usuarios:
      Columnas: Email | Nombre | Rol | Estado | Último Acceso | Acciones
      Acciones: Editar, Desactivar

    Botón "Agregar Usuario":
      Modal:
        - Input email
        - Input nombre completo
        - Select rol: Super Admin, Admin, Mozo, Cajero
        - Checkbox "Requerir cambio contraseña"
        - Botones: Crear, Cancelar

  <div id="tabAuditoria">
    Filtros:
      - Usuario (email)
      - Fecha desde / hasta (datepicker)
      - Tipo acción: select (Comandas, Boletas, Usuarios, Acceso)

    Tabla logs:
      Columnas: Fecha/Hora | Usuario | Acción | Recurso | Detalles
      Botón "Exportar" Excel
```

### Lógica JavaScript (admin.js)

```javascript
Variables globales:
  let usuarioActual = null
  let permisos = []
  let comandasData = []
  let boletasData = []
  let platosData = []
  let usuariosData = []
  let vistaActual = 'comandas'
  let filtrosActivos = {}

Flujo Autenticación:

  DOMContentLoaded:
    if localStorage['token']:
      verificarAuth()
    else:
      mostrar pantallaLogin

  verificarAuth():
    firebase.auth().onAuthStateChanged(usuario => {
      if usuario:
        usuarioActual = usuario
        obtenerDatosAdmin()
        mostrar panelAdmin
        inicializarListeners()
      else:
        mostrar pantallaLogin
    })

  obtenerDatosAdmin():
    db.collection('usuarios_admin').doc(usuarioActual.uid).get()
      .then(doc => {
        if !doc.exists:
          if esElPrimero():
            crearComoSuperAdmin()
          else:
            mostrar error
        else:
          permisos = obtenerPermisos(doc.data().rol)
          protegerPestanas()
          registrarAuditoria('ACCESO_SISTEMA', 'login')
      })

CRUD Comandas:

  inicializarListenerComandas():
    db.collection('comandas')
      .orderBy('fechaCreacion', 'desc')
      .onSnapshot(snapshot => {
        comandasData = []
        snapshot.forEach(doc => {
          comandasData.push({id: doc.id, ...doc.data()})
        })
        renderizarComandas()
      })

  crearComanda(datos):
    db.collection('comandas').add({
      ...datos,
      estado: 'pendiente',
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
      creadoPor: usuarioActual.uid,
      numComanda: generarNumeroComanda()
    })
    .then(ref => {
      imprimirComanda(ref.id)
      registrarAuditoria('COMANDA_CREADA', `comanda:${ref.id}`)
      mostrar toast éxito
    })

  cambiarEstadoComanda(comandaId, nuevoEstado):
    db.collection('comandas').doc(comandaId).update({
      estado: nuevoEstado,
      fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      if nuevoEstado === 'listo':
        reproducirSonido()
      registrarAuditoria('COMANDA_ACTUALIZADA', `comanda:${comandaId}`)
    })

  cancelarComanda(comandaId):
    if confirm("¿Cancelar comanda?"):
      db.collection('comandas').doc(comandaId).update({
        estado: 'cancelado',
        motivoCancelacion: prompt("Motivo:") || ""
      })
      .then(() => {
        registrarAuditoria('COMANDA_CANCELADA', `comanda:${comandaId}`)
      })

Lógica Caja:

  obtenerComandasParaCobrar():
    return comandasData.filter(c => c.estado === 'entregado' && !c.boletaId)

  generarBoleta(comandaId):
    const comanda = comandasData.find(c => c.id === comandaId)
    const subtotal = calcularTotal(comanda.items)
    const igv = subtotal * 0.18
    const total = subtotal + igv

    db.collection('boletas').add({
      numBoleta: generarNumeroBoleta(),
      comandaId,
      items: comanda.items,
      subtotal,
      igv,
      total,
      metodoPago: form.metodoPago.value,
      montoPago: form.montoPago.value,
      vuelto: form.montoPago.value - total,
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      cajero: usuarioActual.uid
    })
    .then(ref => {
      db.collection('comandas').doc(comandaId).update({
        estado: 'cobrado',
        boletaId: ref.id
      })
      imprimirBoleta(ref.id)
      registrarAuditoria('BOLETA_GENERADA', `boleta:${ref.id}`)
    })

  imprimirBoleta(boletaId):
    db.collection('boletas').doc(boletaId).get()
      .then(doc => {
        const html = generarHTMLBoleta(doc.data())
        const ventana = window.open()
        ventana.document.write(html)
        ventana.print()
      })

  cierreCaja():
    const boletasHoy = boletasData.filter(b =>
      esMismodía(b.fecha, new Date())
    )
    const totales = {
      efectivo: sumarPor('efectivo'),
      tarjeta: sumarPor('tarjeta'),
      digital: sumarPor('digital'),
      general: sumarTodos()
    }

    db.collection('cierres_caja').add({
      fecha: firebase.firestore.FieldValue.serverTimestamp(),
      cajero: usuarioActual.uid,
      ...totales,
      cantidadBoletas: boletasHoy.length,
      observaciones: form.observaciones.value
    })
    .then(ref => {
      registrarAuditoria('CIERRE_CAJA', `cierre:${ref.id}`)
      mostrar confirmación
      exportarExcel(totales)
    })

Gestión Carta:

  actualizarEstadoPlato(platoId, nuevoEstado):
    db.collection('platos_etiquetas').doc(platoId).update({
      disponibilidad: nuevoEstado,
      ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadoPor: usuarioActual.uid
    })
    .then(() => {
      registrarAuditoria('PLATO_ACTUALIZADO', `plato:${platoId}`)
    })

  actualizarEtiquetas(platoId, etiquetas):
    db.collection('platos_etiquetas').doc(platoId).update({
      etiquetas
    })

Gestión Usuarios:

  crearUsuario(datosFormulario):
    firebase.auth().createUserWithEmailAndPassword(
      datosFormulario.email,
      generarContraseñaTemporal()
    )
    .then(userCred => {
      db.collection('usuarios_admin').doc(userCred.user.uid).set({
        email: datosFormulario.email,
        nombre: datosFormulario.nombre,
        rol: datosFormulario.rol,
        estado: 'activo',
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        creadoPor: usuarioActual.uid
      })
      enviarEmailChangePassword(userCred.user.email)
      registrarAuditoria('USUARIO_CREADO', `user:${userCred.user.uid}`)
    })

Auditoria:

  registrarAuditoria(accion, recurso, detalles = ""):
    db.collection('auditoria').add({
      usuario: usuarioActual.email,
      accion,
      recurso,
      detalles,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      tipo: 'EXITO'
    })

Renderización:

  renderizarComandas():
    limpiar contenedor
    comandasData.forEach(comanda => {
      crear tarjeta con datos
      agregar botones acción según estado
      agregar event listeners
    })

  renderizarBoletasParaCobrar():
    obtenerComandasParaCobrar().forEach(comanda => {
      crear fila con botón "Generar Boleta"
    })

  renderizarHistorialBoletas():
    boletasData
      .filter(b => esMismodía(b.fecha, hoy))
      .forEach(boleta => {
        crear fila con datos
        agregar botones Reimprimir, Anular
      })

Utilidades:

  generarNumeroComanda():
    return String(ultimoNumero + 1).padStart(3, '0')

  generarNumeroBoleta():
    return `B001-${String(ultimoNumero + 1).padStart(6, '0')}`

  calcularTotal(items):
    return items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)

  imprimirComanda(comandaId):
    generar HTML formato ticket 80mm
    enviar a impresora zona (Cloud Function)

  reproducirSonido():
    reproducir sonido notificación cuando comanda está lista

Eventos:
  DOMContentLoaded → verificarAuth()
  click "Acceder" → autenticar con email/password
  click "Salir" → logout
  click tab pestana → cambiar vista
  click "Preparar/Listo/Entregar" → cambiarEstadoComanda()
  click "Generar Boleta" → abrirModalBoleta()
  click "Crear Comanda Manual" → abrirModalNuevaComanda()
  etc
```

---

## FIREBASE FIRESTORE - ESTRUCTURA DE DATOS

### Colección: usuarios_admin

```javascript
Documento: {uid}
{
  uid: "abc123xyz",
  email: "admin@restaurante.com",
  nombre: "Juan Carlos",
  rol: "super_admin",
  estado: "activo",
  fechaCreacion: Timestamp,
  ultimoAcceso: Timestamp,
  creadoPor: "uid_creador",
  permisosCustom: {}
}

Roles disponibles:
- super_admin: Acceso total
- admin: Comandas, Caja, Carta, lectura Usuarios y Auditoria
- mozo: Crear comandas, cambiar estado, lectura Carta
- cajero: Generar boletas, cierre caja, lectura Carta
```

### Colección: comandas

```javascript
Documento: {autoId}
{
  id: "autoId",
  numComanda: 1,
  mesa: "Mesa 5",
  mozo: "Carlos",
  nombreCliente: "Juan Pérez",
  zona: "cocina",
  items: [
    {
      platoId: "ceviche-clasico",
      nombre: "Ceviche Clásico",
      cantidad: 2,
      precio: 45.00,
      opciones: [
        { nombre: "Tamaño", valor: "Especial" },
        { nombre: "Picante", valor: "Sí" }
      ],
      guarniciones: ["Arroz", "Ensalada"],
      observaciones: "Sin cebollita"
    }
  ],
  observaciones: "Cliente alergico a mariscos",
  estado: "pendiente",
  fechaCreacion: Timestamp,
  creadoPor: "uid_mozo",
  fechaActualizacion: Timestamp,
  fechaListo: Timestamp,
  fechaEntrega: Timestamp,
  boletaId: null
}

Estados:
- pendiente: Recién creada
- preparando: Cocina confirmó
- listo: Plato listo para servir
- entregado: Mozo entregó en mesa
- cobrado: Cajero generó boleta
- cancelado: Comanda cancelada
```

### Colección: boletas

```javascript
Documento: {autoId}
{
  id: "autoId",
  numBoleta: "B001-000001",
  comandaId: "id_comanda",
  items: [
    {
      nombre: "Ceviche Clásico",
      cantidad: 2,
      precioUnit: 45.00,
      subtotal: 90.00
    }
  ],
  subtotal: 90.00,
  igv: 16.20,
  total: 106.20,
  metodoPago: "efectivo",
  montoPago: 120.00,
  vuelto: 13.80,
  fecha: Timestamp,
  cajero: "uid_cajero",
  anulada: false,
  motivoAnulacion: null
}
```

### Colección: platos_etiquetas

```javascript
Documento: {platoId}
{
  id: "plato_id",
  disponibilidad: "disponible",
  etiquetas: ["nuevo", "popular"],
  ultimaActualizacion: Timestamp,
  actualizadoPor: "uid_admin"
}

Valores disponibilidad:
- disponible
- agotado
- proximamente

Etiquetas disponibles:
- nuevo
- popular
- 2x1
- recomendado
- solo-fin-de-semana
- solo-almuerzo
- de-temporada
```

### Colección: cierres_caja

```javascript
Documento: {autoId}
{
  id: "autoId",
  fecha: Timestamp,
  cajero: "uid_cajero",
  totalEfectivo: 1500.00,
  totalTarjeta: 800.00,
  totalDigital: 350.00,
  totalGeneral: 2650.00,
  cantidadBoletas: 45,
  observaciones: "Sin novedades",
  boletasAnuladas: 1
}
```

### Colección: auditoria

```javascript
Documento: {autoId}
{
  id: "autoId",
  usuario: "admin@restaurante.com",
  accion: "COMANDA_CREADA",
  recurso: "comanda:abc123",
  detalles: "Mesa 5, 3 platos",
  timestamp: Timestamp,
  tipo: "EXITO"
}

Tipos de acción:
- COMANDA_CREADA
- COMANDA_ACTUALIZADA
- COMANDA_CANCELADA
- BOLETA_GENERADA
- BOLETA_ANULADA
- CIERRE_CAJA
- PLATO_ACTUALIZADO
- USUARIO_CREADO
- USUARIO_MODIFICADO
- ACCESO_SISTEMA
- ACCESO_DENEGADO
```

---

## UTILIDADES COMPARTIDAS

### utils.js - Funciones reutilizables

```javascript
Clase Validaciones:
  validarEmail(email) → boolean
  validarTelefono(telefono) → boolean
  validarRUC(ruc) → boolean
  validarMoneda(monto) → boolean
  validarObservacion(texto, maxLongitud) → boolean

Clase Formatos:
  formatearMoneda(monto) → string "S/.XXX.XX"
  formatearFecha(fecha) → string "DD/MM/YYYY"
  formatearHora(fecha) → string "HH:MM"
  formatearTelefono(telefono) → string "+51 XXX-XXX-XXX"

Clase Almacenamiento:
  guardar(clave, datos) → void
  obtener(clave) → datos o null
  eliminar(clave) → void
  limpiar() → void

Clase Notificaciones:
  exito(mensaje) → mostrar toast verde
  error(mensaje) → mostrar toast rojo
  advertencia(mensaje) → mostrar toast amarillo
  info(mensaje) → mostrar toast azul

Clase DOM:
  obtener(selector) → element
  obtenerTodos(selector) → elements[]
  crear(etiqueta, atributos) → element
  agregar(elemento, padre) → void
  remover(elemento) → void
  limpiar(elemento) → void
  agregarClase(elemento, clase) → void
  removerClase(elemento, clase) → void
  toggleClase(elemento, clase) → void
  enEvent(elemento, evento, callback) → void

Funciones utilidad:
  generarUUID() → string
  debounce(funcion, espera) → funcion
  throttle(funcion, espera) → funcion
  scrollSuave(elemento) → void
  copiarAlPortapapeles(texto) → void
  abrirEnlapePestana(url) → void
  descargarArchivo(nombre, contenido) → void

Funciones PWA:
  registrarServiceWorker() → void
  solicitarPermisosNotificacion() → void
```

### firebase-config.js - Configuración centralizada

```javascript
const CONFIGURACION_FIREBASE = {
  apiKey: "XXX",
  authDomain: "proyecto.firebaseapp.com",
  projectId: "proyecto",
  storageBucket: "proyecto.appspot.com",
  messagingSenderId: "XXX",
  appId: "XXX"
}

const DATOS_RESTAURANTE = {
  nombre: "SISTACNA",
  telefono: "+51910000000",
  email: "info@sistacna.com",
  direccion: "Av. Principal 123, Tacna",
  ruc: "20123456789",
  horarios: {
    almuerzo: "11:00 - 15:00",
    cena: "18:00 - 23:00"
  }
}

export { db, auth, storage }
export const inicializarFirebase = () => { }
```

---

## PLAN DE DESARROLLO (20 DÍAS)

### SEMANA 1

**Días 1-2: ESTRUCTURA BASE**
- Configurar Firebase project
- Crear estructura carpetas
- Configurar firebase-config.js
- Crear utils.css + utils.js
- Configurar manifest.json + sw.js

**Días 3-4: HOME**
- Crear index.html
- Estilos index.css
- Lógica index.js
- Menú móvil, galería, animaciones

**Días 5-7: MENÚ DIGITAL**
- Crear carta.html
- Estilos carta.css
- Lógica carta.js
- Crear platos.json
- Búsqueda, filtros, modal
- Carrito en localStorage

### SEMANA 2

**Días 8-10: ADMIN P1 - COMANDAS**
- Crear admin.html estructura
- Login Firebase
- Tab Comandas
- Listeners en tiempo real
- Estado de comandas
- Impresión automática

**Días 11-12: ADMIN P2 - CAJA**
- Tab Caja
- Generación boletas
- IGV automático
- Cierre de caja
- Exportar Excel

**Días 13-14: ADMIN P3 - GESTIÓN**
- Tab Carta (editar disponibilidad)
- Tab Usuarios (CRUD)
- Tab Auditoria (logs)
- Permisos por rol

### SEMANA 3

**Día 15: AUDITORIA**
- Registrar todas las acciones
- Exportar reportes

**Días 16-17: OPTIMIZACIONES**
- PWA offline
- Lazy loading
- Caché inteligente
- Rendimiento

**Día 18: TESTING**
- Pruebas todos los flujos
- Documentación usuario

**Días 19-20: DEPLOY**
- Deploy a Firebase Hosting
- Capacitación personal
- Go live

---

## FLUJOS PRINCIPALES

### Flujo 1: Cliente/Mozo realiza pedido

```
carta.html
  ↓
Cliente selecciona plato
  ↓
Abre modal personalización
  ↓
Selecciona opciones, guarniciones, cantidad
  ↓
Click "Agregar al Pedido"
  ↓
Item se agrega a carrito (localStorage)
  ↓
Repite con más platos
  ↓
Click botón flotante carrito
  ↓
Abre panel carrito
  ↓
Ingresa nombre/mesa, mozo, observaciones
  ↓
Click "Enviar Pedido"
  ↓
Se crea documento en Firestore 'comandas'
  ↓
Estado inicial: 'pendiente'
  ↓
Se vacía carrito
  ↓
Toast de confirmación
```

### Flujo 2: Cocina recibe comanda (sin acceso sistema)

```
Mozo crea comanda en admin.html
  ↓
Sistema detecta comanda nueva
  ↓
Cloud Function imprime ticket
  ↓
Impresora térmica en cocina
  ↓
Chef recibe ticket en papel
  ↓
Prepara según especificaciones
  ↓
Avisa verbalmente o timbre
```

### Flujo 3: Mozo marca comanda como lista

```
admin.html - Tab Comandas
  ↓
Mozo ve comandas pendientes
  ↓
Chef avisa que plato está listo
  ↓
Mozo click "Listo"
  ↓
Estado cambio a 'listo'
  ↓
Mozo retira plato
  ↓
Click "Entregar"
  ↓
Estado cambio a 'entregado'
  ↓
Comanda disponible para cobro
```

### Flujo 4: Cajero genera boleta

```
admin.html - Tab Caja
  ↓
Cajero ve comandas entregadas
  ↓
Click "Generar Boleta"
  ↓
Abre modal con detalle items, IGV, total
  ↓
Selecciona método pago
  ↓
Si efectivo: ingresa monto, calcula vuelto
  ↓
Click "Emitir Boleta"
  ↓
Se crea en Firestore 'boletas'
  ↓
Comanda estado 'cobrado'
  ↓
Opción imprimir boleta
```

---

## RESPONSIVE DESIGN

### Breakpoints

```
Móvil:    < 480px
Tablet:   480px - 768px
Desktop:  > 768px
```

### Adaptaciones por dispositivo

**Móvil (<480px)**
- 1 columna layout
- Menú hamburguesa
- Carrito como modal superpuesto
- Hero 300px
- Botones full-width
- Sidebar oculto en admin

**Tablet (480-768px)**
- 2 columnas
- Hero 400px
- Carrito sidebar reducido
- Interfaz táctil optimizada

**Desktop (>768px)**
- 3-4 columnas
- Hero 600px
- Sidebar completo permanente
- Todas las características visibles

---

## SEGURIDAD

### Cliente
- Validaciones en utils.js
- Sanitización de inputs
- Sin datos sensibles en localStorage

### Servidor (Firebase)
- Firebase Security Rules
- HTTPS obligatorio
- Autenticación Email/Password
- Backups automáticos

### Auditoria
- Registro de todas las acciones
- Timestamps precisos
- Usuario responsable
- Tipo de acción

---

## COLORES Y TIPOGRAFÍA

### Paleta de colores

```
Primario:   #0052B4 (Azul)
Oscuro:     #003d8a (Azul oscuro)
Suave:      #4A90E2 (Azul suave)
Dorado:     #c8a95e (Dorado)
Acento:     #2d8659 (Verde)
Claro:      #f8f7f5 (Gris claro)
Medio:      #e8e5e0 (Gris medio)
Blanco:     #ffffff
Error:      #dc3545 (Rojo)
Éxito:      #28a745 (Verde)
Advertencia:#ffc107 (Amarillo)
```

### Tipografía

```
Títulos:    Montserrat
Cuerpo:     Poppins
Monospace:  Courier New (para números moneda)
Tamaños:
  H1: 32px
  H2: 24px
  H3: 20px
  H4: 18px
  Cuerpo: 14px-16px
  Pequeño: 12px
```

---

## PRÓXIMAS MEJORAS (POST-MVP)

1. Notificaciones WhatsApp automáticas
2. QR para mesas
3. Sistema de combos y promociones
4. Dashboard con KPIs
5. Descuentos automáticos
6. Historial de pedidos cliente
7. Multi-ubicación
8. API REST
9. Mobile app nativa
10. Machine Learning (recomendaciones)

---

## CHECKLIST ANTES DE EMPEZAR

- [ ] Credenciales Firebase obtenidas
- [ ] Dominio configurado
- [ ] Imágenes productos fotografiadas
- [ ] Logo en SVG
- [ ] Menú base en JSON
- [ ] Información restaurante completa
- [ ] Usuarios iniciales creados
- [ ] Horarios definidos
- [ ] Métodos de pago definidos
- [ ] Política privacidad redactada

---

**Documento versión**: 2.0
**Última actualización**: Febrero 2026
**Estado**: Listo para desarrollo desde cero
**Responsable**: Equipo de Desarrollo
