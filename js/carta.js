let datosMenu = null;
let platosFiltrados = [];
let categoriaActual = 'todos';
let filtroEstado = 'todos';
let vistaActual = 'detallada';
let platoActual = null;
let cantidadActual = 1;
let carrito = [];
const CLAVE_STORAGE = 'restaurante_carrito';

function cargarMenu() {
  fetch('data/platos.json')
    .then(resp => resp.json())
    .then(datos => {
      datosMenu = datos;
      renderizarCategorias();
      cargarMozos();
      filtrarYRenderizar();
    })
    .catch(() => {
      Notificaciones.error('Error al cargar el menu');
    });
}

function renderizarCategorias() {
  const contenedor = DOM.obtener('#menuCategorias');
  let html = '<button class="categoria-tab activo" data-categoria="todos"><span class="categoria-icono">🍽️</span> Todos</button>';
  datosMenu.categorias.forEach(cat => {
    html += `<button class="categoria-tab" data-categoria="${cat.id}"><span class="categoria-icono">${cat.icono || ''}</span> ${cat.nombre}</button>`;
  });
  contenedor.innerHTML = html;

  DOM.obtenerTodos('.categoria-tab').forEach(tab => {
    DOM.enEvent(tab, 'click', () => {
      DOM.obtenerTodos('.categoria-tab').forEach(t => DOM.removerClase(t, 'activo'));
      DOM.agregarClase(tab, 'activo');
      categoriaActual = tab.dataset.categoria;
      filtrarYRenderizar();
    });
  });
}

function cargarMozos() {
  const select = DOM.obtener('#selectMozo');
  let html = '<option value="">Seleccionar mozo</option>';
  datosMenu.mozos.forEach(mozo => {
    html += `<option value="${mozo.nombre}">${mozo.nombre}</option>`;
  });
  select.innerHTML = html;
}

function filtrarYRenderizar() {
  const textoBusqueda = DOM.obtener('#inputBusqueda').value.toLowerCase().trim();

  platosFiltrados = datosMenu.platos.filter(plato => {
    const coincideCategoria = categoriaActual === 'todos' || plato.categoria === categoriaActual;

    let coincideEstado = true;
    if (filtroEstado === 'disponible') coincideEstado = plato.estado === 'disponible';
    else if (filtroEstado === 'agotado') coincideEstado = plato.estado === 'agotado';
    else if (filtroEstado === 'promocion') coincideEstado = plato.etiquetas.includes('2x1');

    const coincideBusqueda = !textoBusqueda ||
      plato.nombre.toLowerCase().includes(textoBusqueda) ||
      plato.descripcion.toLowerCase().includes(textoBusqueda);

    return coincideCategoria && coincideEstado && coincideBusqueda;
  });

  DOM.obtener('#resultadoContador').innerHTML = `<strong>${platosFiltrados.length}</strong> platos encontrados`;
  renderizarPlatos();
}

function renderizarPlatos() {
  const grid = DOM.obtener('#gridPlatos');

  if (platosFiltrados.length === 0) {
    grid.innerHTML = `
      <div class="vacio" style="grid-column:1/-1">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <p>No se encontraron platos</p>
      </div>`;
    return;
  }

  if (vistaActual === 'detallada') {
    grid.className = 'menu-grid';
    grid.innerHTML = platosFiltrados.map(plato => renderizarTarjeta(plato)).join('');
  } else {
    grid.className = 'menu-grid vista-simple';
    grid.innerHTML = platosFiltrados.map(plato => renderizarFila(plato)).join('');
  }
}

function obtenerNombreCategoria(categoriaId) {
  if (!datosMenu || !datosMenu.categorias) return '';
  const cat = datosMenu.categorias.find(c => c.id === categoriaId);
  return cat ? cat.nombre : categoriaId;
}

function renderizarTarjeta(plato) {
  const etiquetasHTML = plato.etiquetas.map(et => {
    const clases = { nuevo: 'etiqueta-nuevo', popular: 'etiqueta-popular', '2x1': 'etiqueta-2x1', recomendado: 'etiqueta-recomendado' };
    return `<span class="etiqueta ${clases[et] || ''}">${et}</span>`;
  }).join('');

  const esAgotado = plato.estado === 'agotado';
  const agotadoClase = esAgotado ? ' agotado' : '';
  const nombreCategoria = obtenerNombreCategoria(plato.categoria);

  return `
    <div class="plato-tarjeta${agotadoClase}" onclick="abrirModalPlato('${plato.id}')">
      <div class="plato-imagen">
        <div class="galeria-placeholder">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
        </div>
        <span class="plato-categoria-badge">${nombreCategoria}</span>
        ${esAgotado ? '<span class="plato-agotado-overlay">✕ AGOTADO</span><div class="plato-agotado-banner">Temporalmente agotado</div>' : ''}
        <div class="plato-etiquetas">${etiquetasHTML}</div>
      </div>
      <div class="plato-info">
        <h3 class="plato-nombre">${plato.nombre}</h3>
        <p class="plato-descripcion">${plato.descripcion}</p>
        <div class="plato-footer">
          <span class="plato-precio">${Formatos.formatearMoneda(plato.precio)}</span>
          <button class="plato-btn-agregar">${esAgotado ? 'Agotado' : 'Personalizar'}</button>
          ${esAgotado ? '' : '<button class="plato-btn-agregar-redondo">+</button>'}
        </div>
      </div>
    </div>`;
}

function renderizarFila(plato) {
  const etiquetasHTML = plato.etiquetas.map(et => {
    const clases = { nuevo: 'etiqueta-nuevo', popular: 'etiqueta-popular', '2x1': 'etiqueta-2x1', recomendado: 'etiqueta-recomendado' };
    return `<span class="etiqueta ${clases[et] || ''}">${et}</span>`;
  }).join('');

  const agotadoClase = plato.estado === 'agotado' ? ' agotado' : '';

  return `
    <div class="plato-fila${agotadoClase}" onclick="abrirModalPlato('${plato.id}')">
      <div class="plato-fila-info">
        <span class="plato-fila-nombre">${plato.nombre}</span>
        <div class="plato-fila-etiquetas">${etiquetasHTML}</div>
      </div>
      <div class="plato-fila-acciones">
        <span class="plato-precio">${Formatos.formatearMoneda(plato.precio)}</span>
        <button class="plato-btn-agregar btn-pequeno">${plato.estado === 'agotado' ? 'Agotado' : 'Agregar'}</button>
      </div>
    </div>`;
}

function cambiarVista(vista) {
  vistaActual = vista;
  DOM.obtener('#btnVistaDetallada').className = `vista-btn${vista === 'detallada' ? ' activo' : ''}`;
  DOM.obtener('#btnVistaSimple').className = `vista-btn${vista === 'simple' ? ' activo' : ''}`;
  renderizarPlatos();
}

function abrirModalPlato(platoId) {
  platoActual = datosMenu.platos.find(p => p.id === platoId);
  if (!platoActual || platoActual.estado === 'agotado') return;

  cantidadActual = 1;

  DOM.obtener('#modalPlatoNombre').textContent = platoActual.nombre;
  DOM.obtener('#modalPlatoDescripcion').textContent = platoActual.descripcion;
  DOM.obtener('#modalPlatoPrecioBase').textContent = Formatos.formatearMoneda(platoActual.precio);
  DOM.obtener('#cantidadModal').textContent = '1';

  renderizarOpciones();
  renderizarGuarniciones();
  renderizarObservacionesPlato();
  actualizarSubtotal();

  DOM.agregarClase(DOM.obtener('#modalPlato'), 'activo');
  document.body.style.overflow = 'hidden';
}

function renderizarOpciones() {
  const contenedor = DOM.obtener('#modalPlatoOpciones');
  if (!platoActual.opciones || platoActual.opciones.length === 0) {
    contenedor.innerHTML = '';
    return;
  }

  let html = '';
  platoActual.opciones.forEach(grupo => {
    html += `<div class="opcion-grupo"><h4>${grupo.nombre}</h4>`;
    grupo.valores.forEach((valor, idx) => {
      const precioExtra = valor.precio !== 0 ? `<span class="opcion-precio-extra">${valor.precio > 0 ? '+' : ''}${Formatos.formatearMoneda(valor.precio)}</span>` : '';
      html += `
        <div class="opcion-item" onclick="seleccionarOpcion(this, '${grupo.id}')">
          <label>
            <input type="radio" name="opcion_${grupo.id}" value="${idx}" ${idx === 0 ? 'checked' : ''} style="accent-color:var(--azul-principal)">
            ${valor.nombre}
          </label>
          ${precioExtra}
        </div>`;
    });
    html += '</div>';
  });
  contenedor.innerHTML = html;

  DOM.obtenerTodos('.opcion-item').forEach(item => {
    const radio = item.querySelector('input[type="radio"]');
    if (radio && radio.checked) DOM.agregarClase(item, 'seleccionado');
  });
}

function seleccionarOpcion(elemento, grupoId) {
  const radio = elemento.querySelector('input[type="radio"]');
  radio.checked = true;

  const grupo = elemento.closest('.opcion-grupo');
  grupo.querySelectorAll('.opcion-item').forEach(item => DOM.removerClase(item, 'seleccionado'));
  DOM.agregarClase(elemento, 'seleccionado');

  actualizarSubtotal();
}

function renderizarGuarniciones() {
  const contenedor = DOM.obtener('#modalPlatoGuarniciones');
  const lista = DOM.obtener('#listaGuarniciones');

  if (!platoActual.guarniciones) {
    DOM.agregarClase(contenedor, 'oculto');
    return;
  }

  DOM.removerClase(contenedor, 'oculto');
  lista.innerHTML = datosMenu.guarniciones.map(g =>
    `<div class="guarnicion-item" onclick="toggleGuarnicion(this)">
      <input type="checkbox" value="${g}" style="accent-color:var(--verde-acento)">
      ${g}
    </div>`
  ).join('');
}

function toggleGuarnicion(elemento) {
  const checkbox = elemento.querySelector('input[type="checkbox"]');
  const seleccionados = DOM.obtenerTodos('.guarnicion-item.seleccionado');

  if (!checkbox.checked && seleccionados.length >= 2) {
    Notificaciones.advertencia('Maximo 2 guarniciones');
    return;
  }

  checkbox.checked = !checkbox.checked;
  DOM.toggleClase(elemento, 'seleccionado');
}

function renderizarObservacionesPlato() {
  const contenedor = DOM.obtener('#modalPlatoObservaciones');
  const input = DOM.obtener('#inputObservacionesPlato');

  if (platoActual.tieneObservaciones) {
    DOM.removerClase(contenedor, 'oculto');
    input.value = '';
  } else {
    DOM.agregarClase(contenedor, 'oculto');
  }
}

function cambiarCantidadModal(delta) {
  cantidadActual = Math.max(1, cantidadActual + delta);
  DOM.obtener('#cantidadModal').textContent = cantidadActual;
  actualizarSubtotal();
}

function actualizarSubtotal() {
  let precioBase = platoActual.precio;

  if (platoActual.opciones) {
    platoActual.opciones.forEach(grupo => {
      const radioSeleccionado = document.querySelector(`input[name="opcion_${grupo.id}"]:checked`);
      if (radioSeleccionado) {
        const idx = parseInt(radioSeleccionado.value);
        precioBase += grupo.valores[idx].precio;
      }
    });
  }

  const subtotal = precioBase * cantidadActual;
  DOM.obtener('#modalSubtotal').textContent = Formatos.formatearMoneda(subtotal);
}

function agregarAlCarrito() {
  if (!platoActual) return;

  const opcionesSeleccionadas = [];
  if (platoActual.opciones) {
    platoActual.opciones.forEach(grupo => {
      const radio = document.querySelector(`input[name="opcion_${grupo.id}"]:checked`);
      if (radio) {
        const idx = parseInt(radio.value);
        const valor = grupo.valores[idx];
        opcionesSeleccionadas.push({
          grupo: grupo.nombre,
          valor: valor.nombre,
          precio: valor.precio
        });
      }
    });
  }

  const guarnicionesSeleccionadas = [];
  DOM.obtenerTodos('.guarnicion-item.seleccionado').forEach(item => {
    const checkbox = item.querySelector('input[type="checkbox"]');
    guarnicionesSeleccionadas.push(checkbox.value);
  });

  const observaciones = DOM.obtener('#inputObservacionesPlato')?.value?.trim() || '';

  let precioUnitario = platoActual.precio;
  opcionesSeleccionadas.forEach(op => { precioUnitario += op.precio; });

  const item = {
    id: generarUUID(),
    platoId: platoActual.id,
    nombre: platoActual.nombre,
    precio: precioUnitario,
    cantidad: cantidadActual,
    opciones: opcionesSeleccionadas,
    guarniciones: guarnicionesSeleccionadas,
    observaciones: observaciones
  };

  carrito.push(item);
  guardarEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
  cerrarModalPlato();
  Notificaciones.exito(`${platoActual.nombre} agregado al pedido`);
}

function cerrarModalPlato() {
  DOM.removerClase(DOM.obtener('#modalPlato'), 'activo');
  document.body.style.overflow = 'auto';
  platoActual = null;
}

function cargarDesdeStorage() {
  carrito = Almacenamiento.obtener(CLAVE_STORAGE) || [];
}

function guardarEnStorage() {
  Almacenamiento.guardar(CLAVE_STORAGE, carrito);
}

function actualizarContadorCarrito() {
  const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  DOM.obtener('#carritoContador').textContent = total;
  const badgeFlotante = DOM.obtener('#carritoFlotanteBadge');
  if (badgeFlotante) badgeFlotante.textContent = total;
}

function renderizarCarrito() {
  const contenedorItems = DOM.obtener('#carritoItems');
  const contenedorResumen = DOM.obtener('#carritoResumen');

  if (carrito.length === 0) {
    contenedorItems.innerHTML = `
      <div class="carrito-vacio">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
        <p>Tu carrito esta vacio</p>
        <p style="font-size:0.8rem;margin-top:4px;">Agrega platos desde el menu</p>
      </div>`;
    contenedorResumen.innerHTML = '';
    return;
  }

  contenedorItems.innerHTML = carrito.map((item, idx) => {
    const opcionesTexto = item.opciones.map(o => `${o.grupo}: ${o.valor}`).join(' | ');
    const guarnicionesTexto = item.guarniciones.length > 0 ? `Guarniciones: ${item.guarniciones.join(', ')}` : '';
    const detalles = [opcionesTexto, guarnicionesTexto, item.observaciones].filter(Boolean).join(' - ');

    return `
      <div class="carrito-item">
        <div class="carrito-item-info">
          <div class="carrito-item-nombre">${item.nombre}</div>
          ${detalles ? `<div class="carrito-item-opciones">${detalles}</div>` : ''}
          <div class="carrito-item-cantidad">
            <button class="cantidad-btn" onclick="actualizarCantidadItem(${idx}, ${item.cantidad - 1})">-</button>
            <span class="cantidad-valor">${item.cantidad}</span>
            <button class="cantidad-btn" onclick="actualizarCantidadItem(${idx}, ${item.cantidad + 1})">+</button>
          </div>
        </div>
        <div class="carrito-item-acciones">
          <span class="carrito-item-precio">${Formatos.formatearMoneda(item.precio * item.cantidad)}</span>
          <button class="carrito-item-eliminar" onclick="eliminarDelCarrito(${idx})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  const subtotal = calcularTotal();
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  contenedorResumen.innerHTML = `
    <div class="resumen-linea"><span>Subtotal</span><span>${Formatos.formatearMoneda(subtotal)}</span></div>
    <div class="resumen-linea"><span>IGV (18%)</span><span>${Formatos.formatearMoneda(igv)}</span></div>
    <div class="resumen-linea resumen-total"><span>Total</span><span>${Formatos.formatearMoneda(total)}</span></div>`;
}

function actualizarCantidadItem(indice, nuevaCantidad) {
  if (nuevaCantidad > 0) {
    carrito[indice].cantidad = nuevaCantidad;
  } else {
    carrito.splice(indice, 1);
  }
  guardarEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function eliminarDelCarrito(indice) {
  carrito.splice(indice, 1);
  guardarEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function calcularTotal() {
  return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
}

function abrirPanelCarrito() {
  DOM.agregarClase(DOM.obtener('#panelCarrito'), 'activo');
  document.body.style.overflow = 'hidden';
}

function cerrarPanelCarrito() {
  DOM.removerClase(DOM.obtener('#panelCarrito'), 'activo');
  document.body.style.overflow = 'auto';
}

function enviarPedido() {
  const nombreCliente = DOM.obtener('#inputMesaCliente').value.trim();
  const mozo = DOM.obtener('#selectMozo').value;
  const observaciones = DOM.obtener('#txtObservaciones').value.trim();

  if (!nombreCliente) {
    Notificaciones.advertencia('Ingresa nombre o numero de mesa');
    return;
  }

  if (carrito.length === 0) {
    Notificaciones.advertencia('El carrito esta vacio');
    return;
  }

  const subtotal = calcularTotal();
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  let mensaje = `*NUEVO PEDIDO - SISTACNA*\n`;
  mensaje += `Mesa/Cliente: ${nombreCliente}\n`;
  if (mozo) mensaje += `Mozo: ${mozo}\n`;
  mensaje += `\n*Detalle:*\n`;

  carrito.forEach(item => {
    mensaje += `- ${item.cantidad}x ${item.nombre}`;
    if (item.opciones.length > 0) {
      mensaje += ` (${item.opciones.map(o => o.valor).join(', ')})`;
    }
    if (item.guarniciones.length > 0) {
      mensaje += ` + ${item.guarniciones.join(', ')}`;
    }
    mensaje += ` - ${Formatos.formatearMoneda(item.precio * item.cantidad)}\n`;
    if (item.observaciones) mensaje += `  Obs: ${item.observaciones}\n`;
  });

  mensaje += `\n*Subtotal:* ${Formatos.formatearMoneda(subtotal)}`;
  mensaje += `\n*IGV (18%):* ${Formatos.formatearMoneda(igv)}`;
  mensaje += `\n*TOTAL:* ${Formatos.formatearMoneda(total)}`;
  if (observaciones) mensaje += `\n\n*Observaciones:* ${observaciones}`;

  const url = `https://wa.me/${DATOS_RESTAURANTE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  vaciarCarrito();
  cerrarPanelCarrito();
  Notificaciones.exito('Pedido enviado correctamente');
}

function vaciarCarrito() {
  carrito = [];
  guardarEnStorage();
  actualizarContadorCarrito();
  renderizarCarrito();
}

function limpiarBusqueda() {
  DOM.obtener('#inputBusqueda').value = '';
  DOM.agregarClase(DOM.obtener('#btnLimpiarBusqueda'), 'oculto');
  filtrarYRenderizar();
}

function inicializarMenuMovil() {
  const btnHamburguesa = DOM.obtener('#btnHamburguesa');
  const navMenu = DOM.obtener('#navMenu');
  DOM.enEvent(btnHamburguesa, 'click', () => {
    DOM.toggleClase(btnHamburguesa, 'activo');
    DOM.toggleClase(navMenu, 'activo');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  cargarDesdeStorage();
  cargarMenu();
  actualizarContadorCarrito();
  renderizarCarrito();
  inicializarMenuMovil();

  const inputBusqueda = DOM.obtener('#inputBusqueda');
  DOM.enEvent(inputBusqueda, 'input', debounce(() => {
    const valor = inputBusqueda.value.trim();
    if (valor) {
      DOM.removerClase(DOM.obtener('#btnLimpiarBusqueda'), 'oculto');
    } else {
      DOM.agregarClase(DOM.obtener('#btnLimpiarBusqueda'), 'oculto');
    }
    filtrarYRenderizar();
  }, 300));

  DOM.obtenerTodos('.filtro-btn').forEach(btn => {
    DOM.enEvent(btn, 'click', () => {
      DOM.obtenerTodos('.filtro-btn').forEach(b => DOM.removerClase(b, 'activo'));
      DOM.agregarClase(btn, 'activo');
      filtroEstado = btn.dataset.filtro;
      filtrarYRenderizar();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.obtener('#modalPlato').classList.contains('activo')) cerrarModalPlato();
      if (DOM.obtener('#panelCarrito').classList.contains('activo')) cerrarPanelCarrito();
    }
  });

  registrarServiceWorker();
});
