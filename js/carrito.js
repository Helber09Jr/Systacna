let carrito = [];
const CLAVE_STORAGE = 'restaurante_carrito';
let datosMenu = null;

function inicializar() {
  cargarDesdeStorage();
  cargarDatosMenu();
  inicializarMenuMovil();

  if (carrito.length === 0) {
    mostrarCarritoVacio();
  } else {
    renderizarTabla();
  }
}

function cargarDesdeStorage() {
  carrito = Almacenamiento.obtener(CLAVE_STORAGE) || [];
}

function guardarEnStorage() {
  Almacenamiento.guardar(CLAVE_STORAGE, carrito);
}

function cargarDatosMenu() {
  fetch('data/platos.json')
    .then(resp => resp.json())
    .then(datos => {
      datosMenu = datos;
      cargarMozos();
    })
    .catch(() => {});
}

function cargarMozos() {
  if (!datosMenu) return;
  const select = DOM.obtener('#selectMozo');
  let html = '<option value="">Seleccionar mozo</option>';
  datosMenu.mozos.forEach(mozo => {
    html += `<option value="${mozo.nombre}">${mozo.nombre}</option>`;
  });
  select.innerHTML = html;
}

function mostrarCarritoVacio() {
  DOM.agregarClase(DOM.obtener('#carritoContenido'), 'oculto');
  DOM.removerClase(DOM.obtener('#carritoVacio'), 'oculto');
}

function mostrarCarritoConContenido() {
  DOM.removerClase(DOM.obtener('#carritoContenido'), 'oculto');
  DOM.agregarClase(DOM.obtener('#carritoVacio'), 'oculto');
}

function renderizarTabla() {
  mostrarCarritoConContenido();
  const contenedor = DOM.obtener('#carritoTabla');

  contenedor.innerHTML = carrito.map((item, idx) => {
    const opcionesTexto = item.opciones.map(o => `${o.valor}`).join(', ');
    const guarnicionesTexto = item.guarniciones.length > 0 ? `+ ${item.guarniciones.join(', ')}` : '';
    const detalles = [opcionesTexto, guarnicionesTexto].filter(Boolean).join(' ');
    const subtotal = item.precio * item.cantidad;

    return `
      <div class="carrito-tabla-item">
        <div class="carrito-tabla-cantidad">
          <button class="cantidad-btn" onclick="actualizarCantidad(${idx}, ${item.cantidad - 1})">-</button>
          <span class="cantidad-valor">${item.cantidad}</span>
          <button class="cantidad-btn" onclick="actualizarCantidad(${idx}, ${item.cantidad + 1})">+</button>
        </div>
        <div class="carrito-tabla-info">
          <h4>${item.nombre}</h4>
          <p>${detalles}${item.observaciones ? ' | ' + item.observaciones : ''}</p>
        </div>
        <div class="carrito-tabla-precio">${Formatos.formatearMoneda(item.precio)}</div>
        <div class="carrito-tabla-subtotal">${Formatos.formatearMoneda(subtotal)}</div>
        <div></div>
        <button class="carrito-tabla-eliminar" onclick="eliminarItem(${idx})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>`;
  }).join('');

  renderizarTotales();
}

function renderizarTotales() {
  const contenedor = DOM.obtener('#carritoTotales');
  const subtotal = calcularSubtotal();
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  contenedor.innerHTML = `
    <div class="totales-linea">
      <span>Subtotal</span>
      <span class="precio">${Formatos.formatearMoneda(subtotal)}</span>
    </div>
    <div class="totales-linea">
      <span>IGV (18%)</span>
      <span class="precio">${Formatos.formatearMoneda(igv)}</span>
    </div>
    <div class="totales-linea total">
      <span>Total a Pagar</span>
      <span class="precio">${Formatos.formatearMoneda(total)}</span>
    </div>`;
}

function calcularSubtotal() {
  return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
}

function actualizarCantidad(indice, nuevaCantidad) {
  if (nuevaCantidad > 0) {
    carrito[indice].cantidad = nuevaCantidad;
  } else {
    carrito.splice(indice, 1);
  }
  guardarEnStorage();

  if (carrito.length === 0) {
    mostrarCarritoVacio();
  } else {
    renderizarTabla();
  }
}

function eliminarItem(indice) {
  carrito.splice(indice, 1);
  guardarEnStorage();

  if (carrito.length === 0) {
    mostrarCarritoVacio();
  } else {
    renderizarTabla();
  }
}

function enviarPedido() {
  const nombreCliente = DOM.obtener('#inputNombreMesa').value.trim();
  const mozo = DOM.obtener('#selectMozo').value;
  const observaciones = DOM.obtener('#txtObservaciones').value.trim();

  if (!nombreCliente) {
    Notificaciones.advertencia('Ingresa nombre o numero de mesa');
    DOM.obtener('#inputNombreMesa').focus();
    return;
  }

  if (carrito.length === 0) {
    Notificaciones.advertencia('El carrito esta vacio');
    return;
  }

  const subtotal = calcularSubtotal();
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  let mensaje = `*NUEVO PEDIDO - SISTACNA*\n`;
  mensaje += `Mesa/Cliente: ${nombreCliente}\n`;
  if (mozo) mensaje += `Mozo: ${mozo}\n`;
  mensaje += `\n*Detalle del Pedido:*\n`;

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
  if (observaciones) mensaje += `\n\n*Observaciones generales:* ${observaciones}`;

  const url = `https://wa.me/${DATOS_RESTAURANTE.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');

  Almacenamiento.eliminar(CLAVE_STORAGE);
  carrito = [];
  Notificaciones.exito('Pedido enviado correctamente');

  setTimeout(() => {
    window.location.href = 'carta.html';
  }, 2000);
}

function cancelarPedido() {
  if (confirm('¿Estas seguro de cancelar el pedido? Se vaciara tu carrito.')) {
    Almacenamiento.eliminar(CLAVE_STORAGE);
    carrito = [];
    Notificaciones.info('Pedido cancelado');
    mostrarCarritoVacio();
  }
}

function inicializarMenuMovil() {
  const btnHamburguesa = DOM.obtener('#btnHamburguesa');
  const navMenu = DOM.obtener('#navMenu');
  DOM.enEvent(btnHamburguesa, 'click', () => {
    DOM.toggleClase(btnHamburguesa, 'activo');
    DOM.toggleClase(navMenu, 'activo');
  });
}

document.addEventListener('DOMContentLoaded', inicializar);
