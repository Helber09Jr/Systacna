// ============================================================================
// MOZO PANEL - Panel de pedidos para mozos
// ============================================================================

let usuarioMozo = null;
let datosMenu = null;
let datosConfig = null;
let pedidoActual = [];
let mesaSeleccionada = '';
let categoriaActual = 'todos';
let platoActual = null;
let cantidadActual = 1;
let listenerComandas = null;
let ultimaComandaEnviada = null;

// ============================================================================
// AUTENTICACION
// ============================================================================

function iniciarSesionMozo() {
  const email = DOM.obtener('#loginEmail').value.trim();
  const password = DOM.obtener('#loginPassword').value;

  if (!email || !password) {
    mostrarErrorLogin('Completa todos los campos');
    return;
  }

  DOM.agregarClase(DOM.obtener('#loginBtnTexto'), 'oculto');
  DOM.removerClase(DOM.obtener('#loginSpinner'), 'oculto');
  DOM.obtener('#btnLogin').disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .then(credencial => {
      return db.collection('usuarios').doc(credencial.user.uid).get()
        .then(doc => {
          if (doc.exists) return { doc, credencial };
          // Fallback: buscar por email
          return db.collection('usuarios').where('email', '==', credencial.user.email).limit(1).get()
            .then(snapshot => {
              if (!snapshot.empty) {
                const docExistente = snapshot.docs[0];
                return db.collection('usuarios').doc(credencial.user.uid).set(docExistente.data())
                  .then(() => ({ doc: { exists: true, data: () => docExistente.data() }, credencial }));
              }
              return { doc, credencial };
            });
        });
    })
    .then(({ doc, credencial }) => {
      if (!doc.exists) {
        // Auto-registro primer usuario
        const nuevoUsuario = {
          email: credencial.user.email,
          nombre: credencial.user.email.split('@')[0],
          rol: 'mozo',
          activo: true,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        };
        return db.collection('usuarios').doc(credencial.user.uid).set(nuevoUsuario)
          .then(() => nuevoUsuario);
      }
      const datos = doc.data();
      if (datos.activo === false) {
        throw new Error('Tu cuenta esta desactivada');
      }
      return datos;
    })
    .then(datos => {
      usuarioMozo = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        nombre: datos.nombre,
        rol: datos.rol
      };
      iniciarPanel();
    })
    .catch(error => {
      let mensaje = 'Error al iniciar sesion';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        mensaje = 'Email o contrasena incorrectos';
      } else if (error.code === 'auth/too-many-requests') {
        mensaje = 'Demasiados intentos. Intenta mas tarde';
      } else if (error.message && error.message.includes('offline')) {
        mensaje = 'Sin conexion. Verifica tu internet';
      } else if (error.message) {
        mensaje = error.message;
      }
      mostrarErrorLogin(mensaje);
    })
    .finally(() => {
      DOM.removerClase(DOM.obtener('#loginBtnTexto'), 'oculto');
      DOM.agregarClase(DOM.obtener('#loginSpinner'), 'oculto');
      DOM.obtener('#btnLogin').disabled = false;
    });
}

function mostrarErrorLogin(msg) {
  const el = DOM.obtener('#loginError');
  el.textContent = msg;
  DOM.removerClase(el, 'oculto');
  setTimeout(() => DOM.agregarClase(el, 'oculto'), 4000);
}

function cerrarSesionMozo() {
  if (!confirm('¿Cerrar sesion?')) return;
  if (listenerComandas) listenerComandas();
  auth.signOut().then(() => {
    usuarioMozo = null;
    pedidoActual = [];
    DOM.agregarClase(DOM.obtener('#mozoPanel'), 'oculto');
    DOM.obtener('#pantallaLogin').style.display = 'flex';
  });
}

function iniciarPanel() {
  DOM.obtener('#pantallaLogin').style.display = 'none';
  DOM.removerClase(DOM.obtener('#mozoPanel'), 'oculto');
  DOM.obtener('#mozoNombre').textContent = usuarioMozo.nombre;

  cargarDatosMenu();
  cargarDatosConfig();
  iniciarListenerComandas();
  actualizarContadorPedido();
}

// ============================================================================
// CARGA DE DATOS
// ============================================================================

function cargarDatosMenu() {
  fetch('data/platos.json')
    .then(resp => resp.json())
    .then(datos => {
      datosMenu = datos;
      renderizarCategorias();
      filtrarYRenderizar();
    })
    .catch(() => Notificaciones.error('Error al cargar el menu'));
}

function cargarDatosConfig() {
  fetch('data/configuracion.json')
    .then(resp => resp.json())
    .then(datos => {
      datosConfig = datos;
      renderizarMesas();
    })
    .catch(() => Notificaciones.error('Error al cargar configuracion'));
}

function renderizarMesas() {
  const select = DOM.obtener('#selectMesa');
  let html = '<option value="">Mesa...</option>';
  datosConfig.mesas.forEach(mesa => {
    html += `<option value="${mesa.nombre}">${mesa.nombre} (${mesa.zona})</option>`;
  });
  select.innerHTML = html;

  DOM.enEvent(select, 'change', () => {
    mesaSeleccionada = select.value;
  });
}

// ============================================================================
// CATEGORIAS Y FILTRADO
// ============================================================================

function renderizarCategorias() {
  const contenedor = DOM.obtener('#categorias');
  let html = '<button class="mozo-cat-tab activo" data-cat="todos">🍽️ Todos</button>';
  datosMenu.categorias.forEach(cat => {
    html += `<button class="mozo-cat-tab" data-cat="${cat.id}">${cat.icono || ''} ${cat.nombre}</button>`;
  });
  contenedor.innerHTML = html;

  DOM.obtenerTodos('.mozo-cat-tab').forEach(tab => {
    DOM.enEvent(tab, 'click', () => {
      DOM.obtenerTodos('.mozo-cat-tab').forEach(t => DOM.removerClase(t, 'activo'));
      DOM.agregarClase(tab, 'activo');
      categoriaActual = tab.dataset.cat;
      filtrarYRenderizar();
    });
  });
}

function filtrarYRenderizar() {
  if (!datosMenu) return;
  const texto = DOM.obtener('#inputBusqueda').value.toLowerCase().trim();

  const filtrados = datosMenu.platos.filter(plato => {
    const coincideCat = categoriaActual === 'todos' || plato.categoria === categoriaActual;
    const coincideBusqueda = !texto ||
      plato.nombre.toLowerCase().includes(texto) ||
      plato.descripcion.toLowerCase().includes(texto);
    return coincideCat && coincideBusqueda;
  });

  DOM.obtener('#resultadoContador').innerHTML = `<strong>${filtrados.length}</strong> platos`;
  renderizarGrid(filtrados);
}

function renderizarGrid(platos) {
  const grid = DOM.obtener('#gridPlatos');

  if (platos.length === 0) {
    grid.innerHTML = '<div class="mozo-comandas-vacio" style="grid-column:1/-1"><p>No se encontraron platos</p></div>';
    return;
  }

  grid.innerHTML = platos.map(plato => {
    const esAgotado = plato.estado === 'agotado';
    const cat = datosMenu.categorias.find(c => c.id === plato.categoria);
    const catNombre = cat ? cat.nombre : plato.categoria;

    return `
      <div class="mozo-plato${esAgotado ? ' agotado' : ''}" onclick="abrirModalPlato('${plato.id}')">
        <div class="mozo-plato-img">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
          <span class="mozo-plato-cat">${catNombre}</span>
          ${esAgotado ? '<div class="mozo-plato-agotado">Agotado</div>' : ''}
        </div>
        <div class="mozo-plato-info">
          <div class="mozo-plato-nombre">${plato.nombre}</div>
          <div class="mozo-plato-footer">
            <span class="mozo-plato-precio">${Formatos.formatearMoneda(plato.precio)}</span>
            ${esAgotado ? '' : '<span class="mozo-plato-add">+</span>'}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ============================================================================
// MODAL PLATO (Personalización)
// ============================================================================

function abrirModalPlato(platoId) {
  platoActual = datosMenu.platos.find(p => p.id === platoId);
  if (!platoActual || platoActual.estado === 'agotado') return;

  cantidadActual = 1;
  DOM.obtener('#modalPlatoNombre').textContent = platoActual.nombre;
  DOM.obtener('#modalPlatoDescripcion').textContent = platoActual.descripcion;
  DOM.obtener('#modalPlatoPrecio').textContent = Formatos.formatearMoneda(platoActual.precio);
  DOM.obtener('#cantidadModal').textContent = '1';
  DOM.obtener('#inputObsPlato').value = '';

  renderizarOpciones();
  renderizarGuarniciones();
  actualizarSubtotalModal();

  DOM.agregarClase(DOM.obtener('#modalPlato'), 'activo');
  document.body.style.overflow = 'hidden';
}

function cerrarModalPlato() {
  DOM.removerClase(DOM.obtener('#modalPlato'), 'activo');
  document.body.style.overflow = 'auto';
  platoActual = null;
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
        <div class="opcion-item${idx === 0 ? ' seleccionado' : ''}" onclick="seleccionarOpcion(this, '${grupo.id}')">
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
}

function seleccionarOpcion(elemento, grupoId) {
  const radio = elemento.querySelector('input[type="radio"]');
  radio.checked = true;
  const grupo = elemento.closest('.opcion-grupo');
  grupo.querySelectorAll('.opcion-item').forEach(item => DOM.removerClase(item, 'seleccionado'));
  DOM.agregarClase(elemento, 'seleccionado');
  actualizarSubtotalModal();
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
      <input type="checkbox" value="${g}" style="accent-color:var(--verde-acento)"> ${g}
    </div>`
  ).join('');
}

function toggleGuarnicion(elemento) {
  const checkbox = elemento.querySelector('input[type="checkbox"]');
  const seleccionados = document.querySelectorAll('.guarnicion-item.seleccionado');
  if (!checkbox.checked && seleccionados.length >= 2) {
    Notificaciones.advertencia('Maximo 2 guarniciones');
    return;
  }
  checkbox.checked = !checkbox.checked;
  DOM.toggleClase(elemento, 'seleccionado');
}

function cambiarCantidadModal(delta) {
  cantidadActual = Math.max(1, cantidadActual + delta);
  DOM.obtener('#cantidadModal').textContent = cantidadActual;
  actualizarSubtotalModal();
}

function actualizarSubtotalModal() {
  let precio = platoActual.precio;
  if (platoActual.opciones) {
    platoActual.opciones.forEach(grupo => {
      const radio = document.querySelector(`input[name="opcion_${grupo.id}"]:checked`);
      if (radio) {
        precio += grupo.valores[parseInt(radio.value)].precio;
      }
    });
  }
  DOM.obtener('#modalSubtotal').textContent = Formatos.formatearMoneda(precio * cantidadActual);
}

// ============================================================================
// PEDIDO ACTUAL
// ============================================================================

function agregarAlPedido() {
  if (!platoActual) return;

  const opciones = [];
  if (platoActual.opciones) {
    platoActual.opciones.forEach(grupo => {
      const radio = document.querySelector(`input[name="opcion_${grupo.id}"]:checked`);
      if (radio) {
        const idx = parseInt(radio.value);
        const valor = grupo.valores[idx];
        opciones.push({ grupo: grupo.nombre, valor: valor.nombre, precio: valor.precio });
      }
    });
  }

  const guarniciones = [];
  document.querySelectorAll('.guarnicion-item.seleccionado').forEach(item => {
    guarniciones.push(item.querySelector('input').value);
  });

  const observaciones = DOM.obtener('#inputObsPlato').value.trim();

  let precioUnitario = platoActual.precio;
  opciones.forEach(op => { precioUnitario += op.precio; });

  pedidoActual.push({
    id: generarUUID(),
    platoId: platoActual.id,
    nombre: platoActual.nombre,
    categoria: platoActual.categoria,
    precio: precioUnitario,
    cantidad: cantidadActual,
    opciones: opciones,
    guarniciones: guarniciones,
    observaciones: observaciones
  });

  actualizarContadorPedido();
  actualizarTotalPedido();
  cerrarModalPlato();
  Notificaciones.exito(`${platoActual.nombre} agregado`);
}

function actualizarContadorPedido() {
  const total = pedidoActual.reduce((sum, item) => sum + item.cantidad, 0);
  DOM.obtener('#pedidoBadge').textContent = total;
}

function togglePanelPedido() {
  const panel = DOM.obtener('#panelPedido');
  DOM.toggleClase(panel, 'activo');
  if (panel.classList.contains('activo')) {
    renderizarPedidoActual();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }
}

function renderizarPedidoActual() {
  const contenedor = DOM.obtener('#pedidoItems');

  if (pedidoActual.length === 0) {
    contenedor.innerHTML = '<div class="mozo-pedido-vacio">Pedido vacio. Agrega platos desde la carta.</div>';
    actualizarTotalPedido();
    return;
  }

  contenedor.innerHTML = pedidoActual.map((item, idx) => {
    const detalles = [];
    if (item.opciones.length > 0) detalles.push(item.opciones.map(o => o.valor).join(', '));
    if (item.guarniciones.length > 0) detalles.push('+ ' + item.guarniciones.join(', '));
    if (item.observaciones) detalles.push('Obs: ' + item.observaciones);

    return `
      <div class="mozo-pedido-item">
        <div class="mozo-pedido-item-info">
          <div class="mozo-pedido-item-nombre">${item.nombre}</div>
          ${detalles.length ? `<div class="mozo-pedido-item-detalle">${detalles.join(' | ')}</div>` : ''}
        </div>
        <div class="mozo-pedido-item-cant">
          <button class="cantidad-btn" onclick="cambiarCantidadPedido(${idx}, -1)">-</button>
          <span class="cantidad-valor">${item.cantidad}</span>
          <button class="cantidad-btn" onclick="cambiarCantidadPedido(${idx}, 1)">+</button>
        </div>
        <span class="mozo-pedido-item-precio">${Formatos.formatearMoneda(item.precio * item.cantidad)}</span>
        <span class="mozo-pedido-item-del" onclick="eliminarDelPedido(${idx})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </span>
      </div>`;
  }).join('');

  actualizarTotalPedido();
}

function actualizarTotalPedido() {
  const subtotal = pedidoActual.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;
  const el = DOM.obtener('#pedidoTotal');
  if (el) el.textContent = Formatos.formatearMoneda(total);
}

function cambiarCantidadPedido(idx, delta) {
  const nuevaCant = pedidoActual[idx].cantidad + delta;
  if (nuevaCant <= 0) {
    pedidoActual.splice(idx, 1);
  } else {
    pedidoActual[idx].cantidad = nuevaCant;
  }
  actualizarContadorPedido();
  renderizarPedidoActual();
}

function eliminarDelPedido(idx) {
  pedidoActual.splice(idx, 1);
  actualizarContadorPedido();
  renderizarPedidoActual();
}

function vaciarPedido() {
  if (pedidoActual.length === 0) return;
  if (!confirm('¿Vaciar pedido?')) return;
  pedidoActual = [];
  actualizarContadorPedido();
  renderizarPedidoActual();
}

// ============================================================================
// ENVIAR COMANDA
// ============================================================================

function enviarComanda() {
  if (!mesaSeleccionada) {
    Notificaciones.advertencia('Selecciona una mesa');
    return;
  }
  if (pedidoActual.length === 0) {
    Notificaciones.advertencia('Agrega al menos un plato');
    return;
  }

  const observaciones = DOM.obtener('#inputObservaciones').value.trim();

  // Obtener siguiente numero de comanda
  const contadorRef = db.collection('contadores').doc('comandas');
  contadorRef.get()
    .then(doc => {
      const actual = doc.exists ? doc.data().ultimo : 0;
      const siguiente = actual + 1;
      return contadorRef.set({ ultimo: siguiente }, { merge: true }).then(() => siguiente);
    })
    .then(numero => {
      const nuevaComanda = {
        numero: String(numero).padStart(3, '0'),
        mesa: mesaSeleccionada,
        mozo: usuarioMozo.nombre,
        cliente: '',
        items: pedidoActual.map(item => ({
          platoId: item.platoId,
          nombre: item.nombre,
          categoria: item.categoria,
          precio: item.precio,
          cantidad: item.cantidad,
          opciones: item.opciones,
          guarniciones: item.guarniciones,
          observaciones: item.observaciones
        })),
        observaciones: observaciones,
        estado: ESTADOS_COMANDA.PENDIENTE,
        origen: 'mozo',
        creadoPor: usuarioMozo.email,
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
        timestamps: {
          pendiente: firebase.firestore.FieldValue.serverTimestamp()
        }
      };

      return db.collection('comandas').add(nuevaComanda).then(docRef => ({
        id: docRef.id,
        ...nuevaComanda,
        numero: nuevaComanda.numero
      }));
    })
    .then(comanda => {
      ultimaComandaEnviada = comanda;
      pedidoActual = [];
      actualizarContadorPedido();
      DOM.obtener('#inputObservaciones').value = '';

      // Cerrar panel pedido y mostrar modal impresion
      DOM.removerClase(DOM.obtener('#panelPedido'), 'activo');
      document.body.style.overflow = 'auto';

      DOM.obtener('#imprimirNumero').textContent = '#' + comanda.numero;
      DOM.agregarClase(DOM.obtener('#modalImprimir'), 'activo');

      Notificaciones.exito(`Comanda #${comanda.numero} enviada`);
    })
    .catch(err => {
      Notificaciones.error('Error al enviar comanda');
      console.error(err);
    });
}

// ============================================================================
// IMPRESION DE TICKETS
// ============================================================================

function imprimirTicket(destino) {
  if (!ultimaComandaEnviada) return;
  const comanda = ultimaComandaEnviada;

  const esCocina = destino === 'cocina' || destino === 'ambos';
  const esBar = destino === 'bar' || destino === 'ambos';

  // Separar items por destino
  const categoriasBar = ['bebidas'];
  const itemsCocina = comanda.items.filter(i => !categoriasBar.includes(i.categoria));
  const itemsBar = comanda.items.filter(i => categoriasBar.includes(i.categoria));

  if (esCocina && itemsCocina.length > 0) {
    abrirVentanaTicket(comanda, itemsCocina, 'COCINA');
  }

  if (esBar && itemsBar.length > 0) {
    setTimeout(() => {
      abrirVentanaTicket(comanda, itemsBar, 'BAR');
    }, 500);
  }

  // Si no hay items para el destino seleccionado
  if (esCocina && itemsCocina.length === 0 && destino === 'cocina') {
    Notificaciones.advertencia('No hay items de cocina');
  }
  if (esBar && itemsBar.length === 0 && destino === 'bar') {
    Notificaciones.advertencia('No hay items de bar');
  }

  // Si destino es 'ambos' y todos son de un tipo, imprimir todo
  if (destino === 'ambos' && itemsCocina.length === 0 && itemsBar.length > 0) {
    abrirVentanaTicket(comanda, itemsBar, 'BAR');
  } else if (destino === 'ambos' && itemsBar.length === 0 && itemsCocina.length > 0) {
    abrirVentanaTicket(comanda, itemsCocina, 'COCINA');
  }
}

function abrirVentanaTicket(comanda, items, destino) {
  const ahora = new Date();
  const hora = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const fecha = ahora.toLocaleDateString('es-PE');

  let itemsHTML = '';
  items.forEach(item => {
    itemsHTML += `<div style="margin-bottom:6px;">
      <strong>${item.cantidad}x ${item.nombre}</strong>`;
    if (item.opciones && item.opciones.length > 0) {
      itemsHTML += `<br>&nbsp;&nbsp;${item.opciones.map(o => o.valor).join(', ')}`;
    }
    if (item.guarniciones && item.guarniciones.length > 0) {
      itemsHTML += `<br>&nbsp;&nbsp;Guarn: ${item.guarniciones.join(', ')}`;
    }
    if (item.observaciones) {
      itemsHTML += `<br>&nbsp;&nbsp;<em>Obs: ${item.observaciones}</em>`;
    }
    itemsHTML += '</div>';
  });

  const ticketHTML = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    width: 72mm;
    margin: 0 auto;
    padding: 4mm;
    line-height: 1.4;
  }
  .linea { border-top: 1px dashed #000; margin: 6px 0; }
  .centro { text-align: center; }
  .grande { font-size: 16px; font-weight: bold; }
  .destino { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
  @media print {
    body { width: 72mm; margin: 0; padding: 2mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style></head><body>
<div class="centro grande">SISTACNA</div>
<div class="centro destino">${destino}</div>
<div class="linea"></div>
<div><strong>Comanda #${comanda.numero}</strong></div>
<div>Mesa: <strong>${comanda.mesa}</strong></div>
<div>Mozo: ${comanda.mozo}</div>
<div>${fecha} ${hora}</div>
<div class="linea"></div>
${itemsHTML}
${comanda.observaciones ? `<div class="linea"></div><div><strong>OBS:</strong> ${comanda.observaciones}</div>` : ''}
<div class="linea"></div>
<div class="centro" style="font-size:11px;">*** ${destino} ***</div>
</body></html>`;

  const ventana = window.open('', '_blank', 'width=320,height=500');
  ventana.document.write(ticketHTML);
  ventana.document.close();
  setTimeout(() => {
    ventana.print();
  }, 300);
}

function cerrarModalImprimir() {
  DOM.removerClase(DOM.obtener('#modalImprimir'), 'activo');
  ultimaComandaEnviada = null;
}

// ============================================================================
// MIS COMANDAS (Real-time)
// ============================================================================

function iniciarListenerComandas() {
  if (listenerComandas) listenerComandas();

  listenerComandas = db.collection('comandas')
    .where('mozo', '==', usuarioMozo.nombre)
    .where('estado', 'in', ['pendiente', 'preparando', 'listo', 'entregado'])
    .orderBy('fechaCreacion', 'desc')
    .limit(30)
    .onSnapshot(snapshot => {
      const comandas = [];
      snapshot.forEach(doc => {
        comandas.push({ id: doc.id, ...doc.data() });
      });
      renderizarMisComandas(comandas);

      // Badge
      const activas = comandas.filter(c => c.estado !== 'entregado').length;
      const badge = DOM.obtener('#comandasBadge');
      if (activas > 0) {
        badge.textContent = activas;
        DOM.removerClase(badge, 'oculto');
      } else {
        DOM.agregarClase(badge, 'oculto');
      }
    }, error => {
      console.error('Error listener comandas:', error);
      // Fallback sin filtro compuesto (requiere indice)
      listenerComandas = db.collection('comandas')
        .orderBy('fechaCreacion', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
          const comandas = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.mozo === usuarioMozo.nombre &&
                ['pendiente', 'preparando', 'listo', 'entregado'].includes(data.estado)) {
              comandas.push({ id: doc.id, ...data });
            }
          });
          renderizarMisComandas(comandas);

          const activas = comandas.filter(c => c.estado !== 'entregado').length;
          const badge = DOM.obtener('#comandasBadge');
          if (activas > 0) {
            badge.textContent = activas;
            DOM.removerClase(badge, 'oculto');
          } else {
            DOM.agregarClase(badge, 'oculto');
          }
        });
    });
}

function actualizarStatsComandas(comandas) {
  const pendientes = comandas.filter(c => c.estado === 'pendiente').length;
  const preparando = comandas.filter(c => c.estado === 'preparando').length;
  const listos = comandas.filter(c => c.estado === 'listo').length;
  const entregados = comandas.filter(c => c.estado === 'entregado').length;

  const elP = DOM.obtener('#statMisPendientes');
  const elPr = DOM.obtener('#statMisPreparando');
  const elL = DOM.obtener('#statMisListos');
  const elE = DOM.obtener('#statMisEntregados');
  if (elP) elP.textContent = pendientes;
  if (elPr) elPr.textContent = preparando;
  if (elL) elL.textContent = listos;
  if (elE) elE.textContent = entregados;
}

function renderizarMisComandas(comandas) {
  const contenedor = DOM.obtener('#listaComandas');
  actualizarStatsComandas(comandas);

  if (comandas.length === 0) {
    contenedor.innerHTML = `
      <div class="mozo-comandas-vacio">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <p>No tienes comandas activas</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = comandas.map(comanda => {
    const hora = comanda.fechaCreacion ? new Date(comanda.fechaCreacion.seconds * 1000).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '--:--';

    const itemsHTML = (comanda.items || []).map(i => {
      let detalle = `<strong>${i.cantidad}x</strong> ${i.nombre}`;
      if (i.opciones && i.opciones.length > 0) {
        detalle += ` <span style="color:var(--texto-secundario);font-size:0.7rem;">(${i.opciones.map(o => o.valor).join(', ')})</span>`;
      }
      return `<div style="font-size:0.8rem;margin-bottom:2px;">${detalle}</div>`;
    }).join('');

    const subtotal = (comanda.items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const total = subtotal + (subtotal * DATOS_RESTAURANTE.igv);

    const estadoTexto = {
      pendiente: 'Pendiente',
      preparando: 'Preparando',
      listo: 'LISTO!',
      entregado: 'Entregado'
    };

    let accionBtn = '';
    if (comanda.estado === 'pendiente') {
      accionBtn = `<button class="mozo-comanda-btn-accion" onclick="cambiarEstadoComanda('${comanda.id}', 'preparando')">Enviar a Cocina</button>`;
    } else if (comanda.estado === 'listo') {
      accionBtn = `<button class="mozo-comanda-btn-accion" style="background:var(--exito);" onclick="cambiarEstadoComanda('${comanda.id}', 'entregado')">Entregar al Cliente</button>`;
    }

    return `
      <div class="mozo-comanda-card estado-${comanda.estado}">
        <div class="mozo-comanda-top">
          <span class="mozo-comanda-num">#${comanda.numero} - ${comanda.mesa}</span>
          <span class="mozo-comanda-estado">${estadoTexto[comanda.estado] || comanda.estado}</span>
        </div>
        <div class="mozo-comanda-body">
          <div class="mozo-comanda-hora">${hora}</div>
          ${itemsHTML}
          <div style="display:flex;justify-content:flex-end;margin-top:6px;">
            <span class="precio" style="font-size:0.9rem;">${Formatos.formatearMoneda(total)}</span>
          </div>
        </div>
        ${comanda.observaciones ? `<div style="padding:4px 12px 8px;font-size:0.75rem;color:var(--texto-secundario);font-style:italic;">${comanda.observaciones}</div>` : ''}
        <div class="mozo-comanda-acciones">
          ${accionBtn}
          <button class="mozo-comanda-btn-imprimir" onclick="reimprimirTicket('${comanda.id}')">Reimprimir</button>
        </div>
      </div>`;
  }).join('');
}

function cambiarEstadoComanda(comandaId, nuevoEstado) {
  const update = {
    estado: nuevoEstado,
    ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
    modificadoPor: usuarioMozo.nombre
  };
  update[`timestamps.${nuevoEstado}`] = firebase.firestore.FieldValue.serverTimestamp();

  db.collection('comandas').doc(comandaId).update(update)
    .then(() => {
      Notificaciones.exito(`Comanda actualizada: ${nuevoEstado}`);
    })
    .catch(err => {
      Notificaciones.error('Error al actualizar comanda');
      console.error(err);
    });
}

function reimprimirTicket(comandaId) {
  db.collection('comandas').doc(comandaId).get()
    .then(doc => {
      if (doc.exists) {
        ultimaComandaEnviada = { id: doc.id, ...doc.data() };
        DOM.obtener('#imprimirNumero').textContent = '#' + doc.data().numero;
        DOM.agregarClase(DOM.obtener('#modalImprimir'), 'activo');
      }
    });
}

// ============================================================================
// TABS
// ============================================================================

function cambiarTab(tab) {
  DOM.obtenerTodos('.mozo-tab').forEach(t => DOM.removerClase(t, 'activo'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('activo');

  if (tab === 'pedido') {
    DOM.removerClase(DOM.obtener('#tabPedido'), 'oculto');
    DOM.agregarClase(DOM.obtener('#tabComandas'), 'oculto');
  } else {
    DOM.agregarClase(DOM.obtener('#tabPedido'), 'oculto');
    DOM.removerClase(DOM.obtener('#tabComandas'), 'oculto');
  }
}

// ============================================================================
// INICIALIZACION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const firebaseResult = inicializarFirebase();
  if (!firebaseResult) {
    Notificaciones.error('Error al cargar Firebase');
    return;
  }

  // Recuperar sesion
  auth.onAuthStateChanged(user => {
    if (user && !usuarioMozo) {
      db.collection('usuarios').doc(user.uid).get()
        .then(doc => {
          if (doc.exists) {
            const datos = doc.data();
            if (datos.activo !== false) {
              usuarioMozo = {
                uid: user.uid,
                email: user.email,
                nombre: datos.nombre,
                rol: datos.rol
              };
              iniciarPanel();
            }
          }
        })
        .catch(() => {});
    }
  });

  // Busqueda con debounce
  const inputBusqueda = DOM.obtener('#inputBusqueda');
  DOM.enEvent(inputBusqueda, 'input', debounce(() => {
    filtrarYRenderizar();
  }, 300));

  // Enter en login
  DOM.enEvent(DOM.obtener('#loginPassword'), 'keydown', (e) => {
    if (e.key === 'Enter') iniciarSesionMozo();
  });

  // Escape para cerrar modales
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (DOM.obtener('#modalPlato').classList.contains('activo')) cerrarModalPlato();
      if (DOM.obtener('#modalImprimir').classList.contains('activo')) cerrarModalImprimir();
      if (DOM.obtener('#panelPedido').classList.contains('activo')) togglePanelPedido();
    }
  });
});
