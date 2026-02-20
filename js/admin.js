// ============================================================================
// SISTACNA - Panel de Administracion
// ============================================================================

// --- Estado global ---
let usuarioActual = null;
let datosMenu = null;
let comandas = [];
let boletas = [];
let usuarios = [];
let registrosAuditoria = [];
let configuracion = null;
let listenerComandas = null;
let listenerBoletas = null;
let comandaEditandoItems = [];
let platoEditandoId = null;
let boletaComandaId = null;

// ============================================================================
// AUTENTICACION
// ============================================================================

function toggleMostrarPassword() {
  const input = DOM.obtener('#loginPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function iniciarSesion() {
  const email = DOM.obtener('#loginEmail').value.trim();
  const password = DOM.obtener('#loginPassword').value;
  const errorEl = DOM.obtener('#loginError');

  if (!email || !password) {
    mostrarErrorLogin('Completa todos los campos');
    return;
  }

  if (!Validaciones.validarEmail(email)) {
    mostrarErrorLogin('Email no valido');
    return;
  }

  DOM.agregarClase(DOM.obtener('#loginBtnTexto'), 'oculto');
  DOM.removerClase(DOM.obtener('#loginSpinner'), 'oculto');
  DOM.obtener('#btnLogin').disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .then(credencial => {
      return db.collection('usuarios').doc(credencial.user.uid).get()
        .then(doc => ({ doc, credencial }));
    })
    .then(({ doc, credencial }) => {
      if (!doc.exists) {
        // Auto-registro: primer login crea documento de usuario como super_admin
        const nuevoUsuario = {
          email: credencial.user.email,
          nombre: credencial.user.email.split('@')[0],
          rol: 'super_admin',
          activo: true,
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
          autoRegistrado: true
        };
        return db.collection('usuarios').doc(credencial.user.uid)
          .set(nuevoUsuario)
          .then(() => nuevoUsuario);
      }
      const datos = doc.data();
      if (datos.activo === false) {
        throw new Error('Tu cuenta esta desactivada');
      }
      return datos;
    })
    .then(datos => {
      usuarioActual = {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        nombre: datos.nombre,
        rol: datos.rol
      };

      registrarAccion('ACCESO', 'Inicio de sesion');

      if (DOM.obtener('#recordarSesion').checked) {
        Almacenamiento.guardar('sistacna_sesion', { email: email });
      }

      mostrarPanel();
    })
    .catch(error => {
      let mensaje = 'Error al iniciar sesion';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        mensaje = 'Email o contrasena incorrectos';
      } else if (error.code === 'auth/too-many-requests') {
        mensaje = 'Demasiados intentos. Intenta mas tarde';
      } else if (error.message && error.message.includes('offline')) {
        mensaje = 'Sin conexion a la base de datos. Verifica tu internet e intenta de nuevo';
      } else if (error.code === 'permission-denied') {
        mensaje = 'Sin permisos. Verifica las reglas de Firestore';
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

function mostrarErrorLogin(mensaje) {
  const errorEl = DOM.obtener('#loginError');
  errorEl.textContent = mensaje;
  DOM.removerClase(errorEl, 'oculto');
  setTimeout(() => DOM.agregarClase(errorEl, 'oculto'), 4000);
}

function cerrarSesion() {
  if (!confirm('¿Cerrar sesion?')) return;

  registrarAccion('ACCESO', 'Cierre de sesion');
  detenerListeners();

  auth.signOut().then(() => {
    usuarioActual = null;
    Almacenamiento.eliminar('sistacna_sesion');
    DOM.agregarClase(DOM.obtener('#panelAdmin'), 'oculto');
    DOM.removerClase(DOM.obtener('#pantallaLogin'), 'oculto');
    Notificaciones.info('Sesion cerrada');
  });
}

function mostrarPanel() {
  DOM.agregarClase(DOM.obtener('#pantallaLogin'), 'oculto');
  DOM.removerClase(DOM.obtener('#panelAdmin'), 'oculto');

  DOM.obtener('#adminNombre').textContent = usuarioActual.nombre;
  DOM.obtener('#adminRol').textContent = traducirRol(usuarioActual.rol);

  configurarTabsPorRol();
  cargarDatosIniciales();
}

function traducirRol(rol) {
  const nombres = {
    super_admin: 'Super Admin',
    admin: 'Administrador',
    mozo: 'Mozo',
    cajero: 'Cajero'
  };
  return nombres[rol] || rol;
}

// ============================================================================
// NAVEGACION POR TABS
// ============================================================================

function configurarTabsPorRol() {
  const permisos = obtenerPermisos(usuarioActual.rol);
  const tabs = DOM.obtenerTodos('.admin-tab');

  tabs.forEach(tab => {
    const tabId = tab.dataset.tab;
    const tieneAcceso = permisos.some(p =>
      p === tabId || p === tabId + '_lectura' || p.startsWith(tabId)
    );
    if (!tieneAcceso) {
      DOM.agregarClase(tab, 'oculto');
    } else {
      DOM.removerClase(tab, 'oculto');
    }
  });

  // Activar primer tab visible
  const primerTabVisible = document.querySelector('.admin-tab:not(.oculto)');
  if (primerTabVisible) {
    cambiarTab(primerTabVisible.dataset.tab);
  }
}

function cambiarTab(tabId) {
  DOM.obtenerTodos('.admin-tab').forEach(t => DOM.removerClase(t, 'activo'));
  DOM.obtenerTodos('.tab-panel').forEach(p => DOM.removerClase(p, 'activo'));

  const tabBtn = document.querySelector(`.admin-tab[data-tab="${tabId}"]`);
  const tabPanel = DOM.obtener(`#tab${capitalizar(tabId)}`);

  if (tabBtn) DOM.agregarClase(tabBtn, 'activo');
  if (tabPanel) DOM.agregarClase(tabPanel, 'activo');
}

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// ============================================================================
// CARGA DE DATOS INICIALES
// ============================================================================

function cargarDatosIniciales() {
  // Cargar platos.json para uso interno
  fetch('data/platos.json')
    .then(r => r.json())
    .then(datos => {
      datosMenu = datos;
      renderizarCartaAdmin();
      poblarSelectsMesas();
      poblarSelectsMozos();
    })
    .catch(() => Notificaciones.error('Error al cargar el menu'));

  // Cargar configuracion
  fetch('data/configuracion.json')
    .then(r => r.json())
    .then(datos => { configuracion = datos; })
    .catch(() => {});

  // Iniciar listeners de Firestore
  iniciarListenerComandas();
  iniciarListenerBoletas();
  cargarUsuarios();
  cargarAuditoria();
}

function poblarSelectsMesas() {
  const select = DOM.obtener('#nuevaComandaMesa');
  if (!select || !configuracion) {
    // Usar mesas predeterminadas si no hay configuracion aun
    let html = '<option value="">Seleccionar mesa</option>';
    for (let i = 1; i <= 10; i++) {
      html += `<option value="Mesa ${i}">Mesa ${i}</option>`;
    }
    if (select) select.innerHTML = html;
    return;
  }
  let html = '<option value="">Seleccionar mesa</option>';
  configuracion.mesas.forEach(mesa => {
    html += `<option value="${mesa.nombre}">${mesa.nombre} (${mesa.capacidad} per.) - ${mesa.zona}</option>`;
  });
  select.innerHTML = html;
}

function poblarSelectsMozos() {
  const select = DOM.obtener('#nuevaComandaMozo');
  if (!select || !datosMenu) return;
  let html = '<option value="">Seleccionar mozo</option>';
  datosMenu.mozos.forEach(mozo => {
    html += `<option value="${mozo.nombre}">${mozo.nombre}</option>`;
  });
  select.innerHTML = html;
}

// ============================================================================
// COMANDAS - Firestore en tiempo real
// ============================================================================

function iniciarListenerComandas() {
  if (listenerComandas) listenerComandas();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  listenerComandas = db.collection('comandas')
    .where('fechaCreacion', '>=', hoy)
    .orderBy('fechaCreacion', 'desc')
    .onSnapshot(snapshot => {
      comandas = [];
      snapshot.forEach(doc => {
        comandas.push({ id: doc.id, ...doc.data() });
      });
      renderizarComandas();
      actualizarStatsComandas();
    }, error => {
      console.error('Error listener comandas:', error);
      // Si falla por permisos, intentar sin filtro de fecha
      listenerComandas = db.collection('comandas')
        .orderBy('fechaCreacion', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
          comandas = [];
          snapshot.forEach(doc => {
            comandas.push({ id: doc.id, ...doc.data() });
          });
          renderizarComandas();
          actualizarStatsComandas();
        });
    });
}

function actualizarStatsComandas() {
  const pendientes = comandas.filter(c => c.estado === 'pendiente').length;
  const preparando = comandas.filter(c => c.estado === 'preparando').length;
  const listos = comandas.filter(c => c.estado === 'listo').length;
  const entregados = comandas.filter(c => c.estado === 'entregado' || c.estado === 'cobrado').length;

  DOM.obtener('#statPendientes').textContent = pendientes;
  DOM.obtener('#statPreparando').textContent = preparando;
  DOM.obtener('#statListos').textContent = listos;
  DOM.obtener('#statEntregados').textContent = entregados;
}

function renderizarComandas() {
  const grid = DOM.obtener('#comandasGrid');
  if (!grid) return;

  const filtroEstado = DOM.obtener('#filtroEstadoComanda').value;
  const filtroMesa = DOM.obtener('#filtroMesaComanda').value.toLowerCase().trim();

  let filtradas = comandas;

  if (filtroEstado !== 'todos') {
    filtradas = filtradas.filter(c => c.estado === filtroEstado);
  }
  if (filtroMesa) {
    filtradas = filtradas.filter(c =>
      (c.mesa || '').toLowerCase().includes(filtroMesa) ||
      (c.cliente || '').toLowerCase().includes(filtroMesa)
    );
  }

  if (filtradas.length === 0) {
    grid.innerHTML = `
      <div class="vacio" style="grid-column:1/-1;">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
        <p>No hay comandas</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtradas.map(comanda => renderizarTarjetaComanda(comanda)).join('');
}

function renderizarTarjetaComanda(comanda) {
  const fecha = comanda.fechaCreacion?.toDate ?
    Formatos.formatearHora(comanda.fechaCreacion.toDate()) :
    Formatos.formatearHora(new Date(comanda.fechaCreacion));

  const items = (comanda.items || []).map(item =>
    `<div class="comanda-item-linea">
      <span>${item.cantidad}x ${item.nombre}</span>
      <span class="precio">${Formatos.formatearMoneda(item.precio * item.cantidad)}</span>
    </div>`
  ).join('');

  const subtotal = (comanda.items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  const botonesEstado = generarBotonesEstado(comanda);

  return `
    <div class="comanda-card comanda-${comanda.estado}">
      <div class="comanda-header">
        <div>
          <span class="comanda-numero">#${comanda.numero || '---'}</span>
          <span class="badge badge-${comanda.estado}">${traducirEstado(comanda.estado)}</span>
        </div>
        <span class="comanda-hora">${fecha}</span>
      </div>
      <div class="comanda-info">
        <div class="comanda-mesa"><strong>${comanda.mesa || 'Sin mesa'}</strong> ${comanda.cliente ? '- ' + comanda.cliente : ''}</div>
        ${comanda.mozo ? `<div class="comanda-mozo">Mozo: ${comanda.mozo}</div>` : ''}
      </div>
      <div class="comanda-items">${items}</div>
      <div class="comanda-total">
        <span>Total (inc. IGV)</span>
        <span class="precio precio-grande">${Formatos.formatearMoneda(total)}</span>
      </div>
      ${comanda.observaciones ? `<div class="comanda-observaciones"><em>${comanda.observaciones}</em></div>` : ''}
      <div class="comanda-acciones">${botonesEstado}</div>
    </div>`;
}

function generarBotonesEstado(comanda) {
  const { id, estado } = comanda;
  const permisos = obtenerPermisos(usuarioActual.rol);
  const puedeEditar = permisos.includes('comandas');
  const puedeCobrar = permisos.includes('caja');

  if (!puedeEditar && !puedeCobrar) return '';

  let html = '';
  switch (estado) {
    case 'pendiente':
      if (puedeEditar) {
        html += `<button class="btn-primario btn-pequeno" onclick="cambiarEstadoComanda('${id}','preparando')">Preparar</button>`;
        html += `<button class="btn-peligro btn-pequeno" onclick="cambiarEstadoComanda('${id}','cancelado')">Cancelar</button>`;
      }
      break;
    case 'preparando':
      if (puedeEditar) {
        html += `<button class="btn-exito btn-pequeno" onclick="cambiarEstadoComanda('${id}','listo')">Listo</button>`;
      }
      break;
    case 'listo':
      if (puedeEditar) {
        html += `<button class="btn-dorado btn-pequeno" onclick="cambiarEstadoComanda('${id}','entregado')">Entregar</button>`;
      }
      break;
    case 'entregado':
      if (puedeCobrar) {
        html += `<button class="btn-exito btn-pequeno" onclick="abrirModalBoleta('${id}')">Cobrar</button>`;
      }
      break;
  }
  return html;
}

function traducirEstado(estado) {
  const nombres = {
    pendiente: 'Pendiente',
    preparando: 'Preparando',
    listo: 'Listo',
    entregado: 'Entregado',
    cobrado: 'Cobrado',
    cancelado: 'Cancelado'
  };
  return nombres[estado] || estado;
}

function cambiarEstadoComanda(comandaId, nuevoEstado) {
  if (nuevoEstado === 'cancelado' && !confirm('¿Cancelar esta comanda?')) return;

  db.collection('comandas').doc(comandaId).update({
    estado: nuevoEstado,
    [`timestamps.${nuevoEstado}`]: firebase.firestore.FieldValue.serverTimestamp(),
    ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
    modificadoPor: usuarioActual.nombre
  })
  .then(() => {
    Notificaciones.exito(`Comanda ${traducirEstado(nuevoEstado).toLowerCase()}`);
    registrarAccion('COMANDA', `Estado cambiado a ${nuevoEstado}`, comandaId);
  })
  .catch(err => {
    Notificaciones.error('Error al actualizar comanda');
    console.error(err);
  });
}

function filtrarComandas() {
  renderizarComandas();
}

// --- Nueva comanda manual ---

function abrirModalNuevaComanda() {
  comandaEditandoItems = [];
  DOM.obtener('#nuevaComandaCliente').value = '';
  DOM.obtener('#nuevaComandaObservaciones').value = '';
  DOM.obtener('#nuevaComandaBusqueda').value = '';
  DOM.obtener('#nuevaComandaPlatosResultados').innerHTML = '';
  DOM.obtener('#nuevaComandaItemsSeleccionados').innerHTML = '<p class="texto-secundario" style="font-size:0.85rem;">Ningun plato seleccionado</p>';

  // Poblar mesas y mozos si hay datos
  if (configuracion) poblarSelectsMesas();
  if (datosMenu) poblarSelectsMozos();

  abrirModal('modalNuevaComanda');
}

function buscarPlatosComanda() {
  const texto = DOM.obtener('#nuevaComandaBusqueda').value.toLowerCase().trim();
  const contenedor = DOM.obtener('#nuevaComandaPlatosResultados');

  if (!texto || !datosMenu) {
    contenedor.innerHTML = '';
    return;
  }

  const resultados = datosMenu.platos
    .filter(p => p.estado === 'disponible' &&
      (p.nombre.toLowerCase().includes(texto) || p.categoria.toLowerCase().includes(texto)))
    .slice(0, 8);

  if (resultados.length === 0) {
    contenedor.innerHTML = '<p style="padding:8px;color:var(--texto-secundario);font-size:0.85rem;">Sin resultados</p>';
    return;
  }

  contenedor.innerHTML = resultados.map(plato => `
    <div class="busqueda-resultado" onclick="agregarPlatoComanda('${plato.id}')">
      <span>${plato.nombre}</span>
      <span class="precio">${Formatos.formatearMoneda(plato.precio)}</span>
    </div>
  `).join('');
}

function agregarPlatoComanda(platoId) {
  const plato = datosMenu.platos.find(p => p.id === platoId);
  if (!plato) return;

  const existente = comandaEditandoItems.find(i => i.platoId === platoId);
  if (existente) {
    existente.cantidad++;
  } else {
    comandaEditandoItems.push({
      platoId: plato.id,
      nombre: plato.nombre,
      precio: plato.precio,
      cantidad: 1,
      opciones: [],
      guarniciones: [],
      observaciones: ''
    });
  }

  renderizarItemsComandaNueva();
  DOM.obtener('#nuevaComandaBusqueda').value = '';
  DOM.obtener('#nuevaComandaPlatosResultados').innerHTML = '';
}

function renderizarItemsComandaNueva() {
  const contenedor = DOM.obtener('#nuevaComandaItemsSeleccionados');

  if (comandaEditandoItems.length === 0) {
    contenedor.innerHTML = '<p class="texto-secundario" style="font-size:0.85rem;">Ningun plato seleccionado</p>';
    return;
  }

  contenedor.innerHTML = comandaEditandoItems.map((item, idx) => `
    <div class="comanda-item-editar">
      <div class="flex-entre" style="width:100%">
        <span><strong>${item.cantidad}x</strong> ${item.nombre}</span>
        <div class="flex gap-8" style="align-items:center">
          <span class="precio">${Formatos.formatearMoneda(item.precio * item.cantidad)}</span>
          <button class="cantidad-btn" onclick="cambiarCantidadItemComanda(${idx}, -1)">-</button>
          <button class="cantidad-btn" onclick="cambiarCantidadItemComanda(${idx}, 1)">+</button>
          <button class="btn-icono" onclick="eliminarItemComanda(${idx})" style="color:var(--error)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function cambiarCantidadItemComanda(idx, delta) {
  comandaEditandoItems[idx].cantidad += delta;
  if (comandaEditandoItems[idx].cantidad <= 0) {
    comandaEditandoItems.splice(idx, 1);
  }
  renderizarItemsComandaNueva();
}

function eliminarItemComanda(idx) {
  comandaEditandoItems.splice(idx, 1);
  renderizarItemsComandaNueva();
}

function crearComandaManual() {
  const mesa = DOM.obtener('#nuevaComandaMesa').value;
  const mozo = DOM.obtener('#nuevaComandaMozo').value;
  const cliente = DOM.obtener('#nuevaComandaCliente').value.trim();
  const observaciones = DOM.obtener('#nuevaComandaObservaciones').value.trim();

  if (!mesa) {
    Notificaciones.advertencia('Selecciona una mesa');
    return;
  }
  if (comandaEditandoItems.length === 0) {
    Notificaciones.advertencia('Agrega al menos un plato');
    return;
  }

  // Obtener numero correlativo
  obtenerSiguienteNumeroComanda()
    .then(numero => {
      const nuevaComanda = {
        numero: numero,
        mesa: mesa,
        mozo: mozo || '',
        cliente: cliente,
        items: comandaEditandoItems.map(item => ({
          platoId: item.platoId,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
          opciones: item.opciones,
          guarniciones: item.guarniciones,
          observaciones: item.observaciones
        })),
        observaciones: observaciones,
        estado: ESTADOS_COMANDA.PENDIENTE,
        origen: 'manual',
        creadoPor: usuarioActual.nombre,
        fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
        ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
        timestamps: {
          pendiente: firebase.firestore.FieldValue.serverTimestamp()
        }
      };

      return db.collection('comandas').add(nuevaComanda);
    })
    .then(docRef => {
      Notificaciones.exito('Comanda creada correctamente');
      registrarAccion('COMANDA', 'Comanda creada manualmente', docRef.id);
      cerrarModal('modalNuevaComanda');
      comandaEditandoItems = [];
    })
    .catch(err => {
      Notificaciones.error('Error al crear comanda');
      console.error(err);
    });
}

function obtenerSiguienteNumeroComanda() {
  return db.collection('contadores').doc('comandas').get()
    .then(doc => {
      const actual = doc.exists ? doc.data().ultimo : 0;
      const siguiente = actual + 1;
      return db.collection('contadores').doc('comandas').set(
        { ultimo: siguiente },
        { merge: true }
      ).then(() => generarNumeroCorrelativo(actual));
    });
}

// ============================================================================
// CAJA Y BOLETAS
// ============================================================================

function iniciarListenerBoletas() {
  if (listenerBoletas) listenerBoletas();

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  listenerBoletas = db.collection('boletas')
    .where('fechaEmision', '>=', hoy)
    .orderBy('fechaEmision', 'desc')
    .onSnapshot(snapshot => {
      boletas = [];
      snapshot.forEach(doc => {
        boletas.push({ id: doc.id, ...doc.data() });
      });
      renderizarCaja();
    }, error => {
      console.error('Error listener boletas:', error);
      listenerBoletas = db.collection('boletas')
        .orderBy('fechaEmision', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
          boletas = [];
          snapshot.forEach(doc => {
            boletas.push({ id: doc.id, ...doc.data() });
          });
          renderizarCaja();
        });
    });
}

function renderizarCaja() {
  actualizarStatsCaja();
  renderizarComandasParaCobrar();
  renderizarHistorialBoletas();
  renderizarResumenCierre();
}

function actualizarStatsCaja() {
  const totalVentas = boletas.reduce((s, b) => s + (b.total || 0), 0);
  const cantBoletas = boletas.length;
  const ticketPromedio = cantBoletas > 0 ? totalVentas / cantBoletas : 0;
  const mesasUnicas = new Set(boletas.map(b => b.mesa).filter(Boolean)).size;

  DOM.obtener('#statVentas').textContent = Formatos.formatearMoneda(totalVentas);
  DOM.obtener('#statBoletas').textContent = cantBoletas;
  DOM.obtener('#statTicketPromedio').textContent = Formatos.formatearMoneda(ticketPromedio);
  DOM.obtener('#statMesasAtendidas').textContent = mesasUnicas;
}

function renderizarComandasParaCobrar() {
  const contenedor = DOM.obtener('#comandasParaCobrar');
  if (!contenedor) return;

  const entregadas = comandas.filter(c => c.estado === 'entregado');

  if (entregadas.length === 0) {
    contenedor.innerHTML = '<div class="vacio"><p>No hay comandas pendientes de cobro</p></div>';
    return;
  }

  contenedor.innerHTML = entregadas.map(comanda => {
    const subtotal = (comanda.items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
    const total = subtotal + (subtotal * DATOS_RESTAURANTE.igv);

    return `
      <div class="cobro-card flex-entre" style="padding:16px;background:var(--blanco);border-radius:var(--radio-medio);box-shadow:var(--sombra-suave);margin-bottom:12px;">
        <div>
          <strong>#${comanda.numero || '---'}</strong> - ${comanda.mesa || 'Sin mesa'}
          ${comanda.cliente ? `<span style="color:var(--texto-secundario);"> | ${comanda.cliente}</span>` : ''}
          <div style="font-size:0.85rem;color:var(--texto-secundario);margin-top:4px;">
            ${(comanda.items || []).length} items
          </div>
        </div>
        <div class="flex gap-12" style="align-items:center">
          <span class="precio precio-grande">${Formatos.formatearMoneda(total)}</span>
          <button class="btn-exito btn-pequeno" onclick="abrirModalBoleta('${comanda.id}')">Cobrar</button>
        </div>
      </div>`;
  }).join('');
}

function abrirModalBoleta(comandaId) {
  const comanda = comandas.find(c => c.id === comandaId);
  if (!comanda) return;

  boletaComandaId = comandaId;
  const subtotal = (comanda.items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  const contenido = DOM.obtener('#modalBoletaContenido');
  contenido.innerHTML = `
    <div class="boleta-resumen">
      <div class="flex-entre mb-8">
        <strong>Comanda #${comanda.numero || '---'}</strong>
        <span>${comanda.mesa || ''} ${comanda.cliente ? '- ' + comanda.cliente : ''}</span>
      </div>
      <div class="boleta-items" style="margin:16px 0;border-top:1px dashed var(--gris-medio);border-bottom:1px dashed var(--gris-medio);padding:12px 0;">
        ${(comanda.items || []).map(item => `
          <div class="flex-entre" style="margin-bottom:6px;">
            <span>${item.cantidad}x ${item.nombre}</span>
            <span class="precio">${Formatos.formatearMoneda(item.precio * item.cantidad)}</span>
          </div>
        `).join('')}
      </div>
      <div class="flex-entre mb-8">
        <span>Subtotal</span>
        <span>${Formatos.formatearMoneda(subtotal)}</span>
      </div>
      <div class="flex-entre mb-8">
        <span>IGV (18%)</span>
        <span>${Formatos.formatearMoneda(igv)}</span>
      </div>
      <div class="flex-entre" style="font-size:1.2rem;font-weight:700;">
        <span>TOTAL</span>
        <span class="precio precio-grande">${Formatos.formatearMoneda(total)}</span>
      </div>
    </div>
    <div class="formulario-grupo mt-16">
      <label>Metodo de Pago</label>
      <select class="campo-entrada" id="boletaMetodoPago">
        ${METODOS_PAGO.map(m => `<option value="${m.id}">${m.nombre}</option>`).join('')}
      </select>
    </div>
    <div class="formulario-grupo">
      <label>Nombre/Razon Social (opcional)</label>
      <input type="text" class="campo-entrada" id="boletaNombreCliente" placeholder="Para la boleta..." value="${comanda.cliente || ''}">
    </div>
    <div class="formulario-grupo">
      <label>RUC/DNI (opcional)</label>
      <input type="text" class="campo-entrada" id="boletaDocumento" placeholder="RUC o DNI">
    </div>`;

  abrirModal('modalBoleta');
}

function emitirBoleta() {
  if (!boletaComandaId) return;

  const comanda = comandas.find(c => c.id === boletaComandaId);
  if (!comanda) return;

  const metodoPago = DOM.obtener('#boletaMetodoPago').value;
  const nombreCliente = DOM.obtener('#boletaNombreCliente').value.trim();
  const documento = DOM.obtener('#boletaDocumento').value.trim();

  const subtotal = (comanda.items || []).reduce((s, i) => s + (i.precio * i.cantidad), 0);
  const igv = subtotal * DATOS_RESTAURANTE.igv;
  const total = subtotal + igv;

  // Obtener numero de boleta
  db.collection('contadores').doc('boletas').get()
    .then(doc => {
      const actual = doc.exists ? doc.data().ultimo : 0;
      const numeroBoleta = generarNumeroBoleta(actual);

      const boleta = {
        numero: numeroBoleta,
        comandaId: boletaComandaId,
        comandaNumero: comanda.numero,
        mesa: comanda.mesa || '',
        cliente: nombreCliente,
        documento: documento,
        items: comanda.items,
        subtotal: subtotal,
        igv: igv,
        total: total,
        metodoPago: metodoPago,
        emitidoPor: usuarioActual.nombre,
        fechaEmision: firebase.firestore.FieldValue.serverTimestamp(),
        restaurante: {
          nombre: DATOS_RESTAURANTE.nombreCompleto,
          ruc: DATOS_RESTAURANTE.ruc,
          direccion: DATOS_RESTAURANTE.direccion,
          razonSocial: DATOS_RESTAURANTE.razonSocial
        }
      };

      const batch = db.batch();

      // Crear boleta
      const boletaRef = db.collection('boletas').doc();
      batch.set(boletaRef, boleta);

      // Actualizar comanda a cobrado
      const comandaRef = db.collection('comandas').doc(boletaComandaId);
      batch.update(comandaRef, {
        estado: ESTADOS_COMANDA.COBRADO,
        boletaNumero: numeroBoleta,
        'timestamps.cobrado': firebase.firestore.FieldValue.serverTimestamp(),
        ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp(),
        modificadoPor: usuarioActual.nombre
      });

      // Actualizar contador
      const contadorRef = db.collection('contadores').doc('boletas');
      batch.set(contadorRef, { ultimo: actual + 1 }, { merge: true });

      return batch.commit().then(() => numeroBoleta);
    })
    .then(numeroBoleta => {
      Notificaciones.exito(`Boleta ${numeroBoleta} emitida correctamente`);
      registrarAccion('BOLETA', `Boleta ${numeroBoleta} emitida`, boletaComandaId);
      cerrarModal('modalBoleta');
      boletaComandaId = null;
    })
    .catch(err => {
      Notificaciones.error('Error al emitir boleta');
      console.error(err);
    });
}

function renderizarHistorialBoletas() {
  const contenedor = DOM.obtener('#historialBoletas');
  if (!contenedor) return;

  if (boletas.length === 0) {
    contenedor.innerHTML = '<div class="vacio"><p>No hay boletas emitidas hoy</p></div>';
    return;
  }

  let html = `
    <table class="tabla-datos">
      <thead>
        <tr>
          <th>N° Boleta</th>
          <th>Mesa</th>
          <th>Cliente</th>
          <th>Metodo</th>
          <th>Total</th>
          <th>Hora</th>
          <th>Emitida por</th>
        </tr>
      </thead>
      <tbody>`;

  boletas.forEach(b => {
    const hora = b.fechaEmision?.toDate ?
      Formatos.formatearHora(b.fechaEmision.toDate()) : '--:--';
    const metodo = METODOS_PAGO.find(m => m.id === b.metodoPago);

    html += `
      <tr>
        <td><strong>${b.numero || '---'}</strong></td>
        <td>${b.mesa || '-'}</td>
        <td>${b.cliente || '-'}</td>
        <td>${metodo ? metodo.nombre : b.metodoPago}</td>
        <td class="precio">${Formatos.formatearMoneda(b.total)}</td>
        <td>${hora}</td>
        <td>${b.emitidoPor || '-'}</td>
      </tr>`;
  });

  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

function renderizarResumenCierre() {
  const contenedor = DOM.obtener('#resumenCierre');
  if (!contenedor) return;

  const totalEfectivo = boletas.filter(b => b.metodoPago === 'efectivo').reduce((s, b) => s + (b.total || 0), 0);
  const totalTarjeta = boletas.filter(b => b.metodoPago === 'tarjeta').reduce((s, b) => s + (b.total || 0), 0);
  const totalDigital = boletas.filter(b => b.metodoPago === 'yape').reduce((s, b) => s + (b.total || 0), 0);
  const totalMixto = boletas.filter(b => b.metodoPago === 'mixto').reduce((s, b) => s + (b.total || 0), 0);
  const totalGeneral = boletas.reduce((s, b) => s + (b.total || 0), 0);
  const totalIGV = boletas.reduce((s, b) => s + (b.igv || 0), 0);

  contenedor.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
      <div style="padding:12px;background:var(--gris-claro);border-radius:var(--radio-pequeno);">
        <div style="font-size:0.8rem;color:var(--texto-secundario);">Efectivo</div>
        <div class="precio" style="font-size:1.1rem;">${Formatos.formatearMoneda(totalEfectivo)}</div>
      </div>
      <div style="padding:12px;background:var(--gris-claro);border-radius:var(--radio-pequeno);">
        <div style="font-size:0.8rem;color:var(--texto-secundario);">Tarjeta</div>
        <div class="precio" style="font-size:1.1rem;">${Formatos.formatearMoneda(totalTarjeta)}</div>
      </div>
      <div style="padding:12px;background:var(--gris-claro);border-radius:var(--radio-pequeno);">
        <div style="font-size:0.8rem;color:var(--texto-secundario);">Yape/Plin</div>
        <div class="precio" style="font-size:1.1rem;">${Formatos.formatearMoneda(totalDigital)}</div>
      </div>
      <div style="padding:12px;background:var(--gris-claro);border-radius:var(--radio-pequeno);">
        <div style="font-size:0.8rem;color:var(--texto-secundario);">Mixto</div>
        <div class="precio" style="font-size:1.1rem;">${Formatos.formatearMoneda(totalMixto)}</div>
      </div>
    </div>
    <div class="flex-entre" style="padding:12px;background:var(--azul-principal);color:var(--blanco);border-radius:var(--radio-pequeno);">
      <div>
        <div style="font-size:0.85rem;opacity:0.8;">Total del Dia (${boletas.length} boletas)</div>
        <div style="font-size:0.75rem;opacity:0.6;">IGV recaudado: ${Formatos.formatearMoneda(totalIGV)}</div>
      </div>
      <div style="font-size:1.4rem;font-weight:700;">${Formatos.formatearMoneda(totalGeneral)}</div>
    </div>`;
}

function cerrarCaja() {
  if (boletas.length === 0) {
    Notificaciones.advertencia('No hay boletas para cerrar caja');
    return;
  }

  const comandasPendientes = comandas.filter(c =>
    c.estado === 'pendiente' || c.estado === 'preparando' || c.estado === 'listo' || c.estado === 'entregado'
  );

  if (comandasPendientes.length > 0) {
    if (!confirm(`Hay ${comandasPendientes.length} comanda(s) sin cobrar. ¿Continuar con el cierre?`)) return;
  }

  if (!confirm('¿Cerrar la caja del dia? Esta accion generara un registro de cierre.')) return;

  const observaciones = DOM.obtener('#txtCierreObservaciones').value.trim();
  const totalGeneral = boletas.reduce((s, b) => s + (b.total || 0), 0);
  const totalIGV = boletas.reduce((s, b) => s + (b.igv || 0), 0);

  const cierre = {
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
    totalVentas: totalGeneral,
    totalIGV: totalIGV,
    cantidadBoletas: boletas.length,
    desglose: {
      efectivo: boletas.filter(b => b.metodoPago === 'efectivo').reduce((s, b) => s + (b.total || 0), 0),
      tarjeta: boletas.filter(b => b.metodoPago === 'tarjeta').reduce((s, b) => s + (b.total || 0), 0),
      digital: boletas.filter(b => b.metodoPago === 'yape').reduce((s, b) => s + (b.total || 0), 0),
      mixto: boletas.filter(b => b.metodoPago === 'mixto').reduce((s, b) => s + (b.total || 0), 0)
    },
    observaciones: observaciones,
    cerradoPor: usuarioActual.nombre,
    comandasSinCobrar: comandasPendientes.length
  };

  db.collection('cierres_caja').add(cierre)
    .then(() => {
      Notificaciones.exito('Caja cerrada correctamente');
      registrarAccion('BOLETA', `Cierre de caja: ${Formatos.formatearMoneda(totalGeneral)} (${boletas.length} boletas)`);
      DOM.obtener('#txtCierreObservaciones').value = '';
    })
    .catch(err => {
      Notificaciones.error('Error al cerrar caja');
      console.error(err);
    });
}

// ============================================================================
// GESTION DE CARTA
// ============================================================================

function renderizarCartaAdmin() {
  if (!datosMenu) return;

  // Stats
  const disponibles = datosMenu.platos.filter(p => p.estado === 'disponible').length;
  const agotados = datosMenu.platos.filter(p => p.estado === 'agotado').length;
  const promos = datosMenu.platos.filter(p => p.etiquetas.includes('2x1')).length;

  DOM.obtener('#statDisponibles').textContent = disponibles;
  DOM.obtener('#statAgotados').textContent = agotados;
  DOM.obtener('#statPromos').textContent = promos;
  DOM.obtener('#statTotalPlatos').textContent = datosMenu.platos.length;

  // Poblar select de categorias
  const selectCat = DOM.obtener('#filtroCategoriaPlato');
  if (selectCat) {
    let html = '<option value="todos">Todas las categorias</option>';
    datosMenu.categorias.forEach(cat => {
      html += `<option value="${cat.id}">${cat.icono} ${cat.nombre}</option>`;
    });
    selectCat.innerHTML = html;
  }

  filtrarPlatosCarta();
}

function filtrarPlatosCarta() {
  if (!datosMenu) return;

  const categoria = DOM.obtener('#filtroCategoriaPlato')?.value || 'todos';
  const busqueda = (DOM.obtener('#filtroBusquedaPlato')?.value || '').toLowerCase().trim();
  const grid = DOM.obtener('#cartaGrid');
  if (!grid) return;

  let filtrados = datosMenu.platos;

  if (categoria !== 'todos') {
    filtrados = filtrados.filter(p => p.categoria === categoria);
  }
  if (busqueda) {
    filtrados = filtrados.filter(p =>
      p.nombre.toLowerCase().includes(busqueda) ||
      p.descripcion.toLowerCase().includes(busqueda)
    );
  }

  if (filtrados.length === 0) {
    grid.innerHTML = '<div class="vacio" style="grid-column:1/-1;"><p>No se encontraron platos</p></div>';
    return;
  }

  grid.innerHTML = filtrados.map(plato => {
    const estadoClase = plato.estado === 'agotado' ? 'badge-cancelado' : 'badge-listo';
    const estadoTexto = plato.estado === 'agotado' ? 'Agotado' : 'Disponible';
    const etiquetas = plato.etiquetas.map(et => {
      const clases = { nuevo: 'etiqueta-nuevo', popular: 'etiqueta-popular', '2x1': 'etiqueta-2x1', recomendado: 'etiqueta-recomendado' };
      return `<span class="etiqueta ${clases[et] || ''}">${et}</span>`;
    }).join(' ');

    const cat = datosMenu.categorias.find(c => c.id === plato.categoria);
    const catNombre = cat ? `${cat.icono} ${cat.nombre}` : plato.categoria;

    return `
      <div class="carta-admin-card" style="padding:16px;background:var(--blanco);border-radius:var(--radio-medio);box-shadow:var(--sombra-suave);margin-bottom:12px;">
        <div class="flex-entre">
          <div>
            <h4 style="margin-bottom:4px;">${plato.nombre}</h4>
            <div style="font-size:0.8rem;color:var(--texto-secundario);margin-bottom:6px;">${catNombre}</div>
            <div>${etiquetas}</div>
          </div>
          <div style="text-align:right;">
            <span class="precio" style="font-size:1.1rem;display:block;margin-bottom:8px;">${Formatos.formatearMoneda(plato.precio)}</span>
            <span class="badge ${estadoClase}">${estadoTexto}</span>
          </div>
        </div>
        <p style="font-size:0.85rem;color:var(--texto-secundario);margin:10px 0;">${plato.descripcion}</p>
        <div class="flex gap-8" style="margin-top:8px;">
          <button class="btn-primario btn-pequeno" onclick="editarPlato('${plato.id}')">Editar Estado</button>
          <button class="${plato.estado === 'disponible' ? 'btn-peligro' : 'btn-exito'} btn-pequeno"
            onclick="toggleEstadoPlato('${plato.id}')">
            ${plato.estado === 'disponible' ? 'Marcar Agotado' : 'Marcar Disponible'}
          </button>
        </div>
      </div>`;
  }).join('');
}

function editarPlato(platoId) {
  const plato = datosMenu.platos.find(p => p.id === platoId);
  if (!plato) return;
  platoEditandoId = platoId;

  const contenido = DOM.obtener('#modalEditarPlatoContenido');
  contenido.innerHTML = `
    <h4 style="margin-bottom:16px;">${plato.nombre}</h4>
    <div class="formulario-grupo">
      <label>Estado</label>
      <select class="campo-entrada" id="editarPlatoEstado">
        <option value="disponible" ${plato.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
        <option value="agotado" ${plato.estado === 'agotado' ? 'selected' : ''}>Agotado</option>
      </select>
    </div>
    <div class="formulario-grupo">
      <label>Precio (S/.)</label>
      <input type="number" class="campo-entrada" id="editarPlatoPrecio" value="${plato.precio}" min="0" step="0.50">
    </div>
    <div class="formulario-grupo">
      <label>Etiquetas</label>
      <div class="flex gap-8" style="flex-wrap:wrap;" id="editarPlatoEtiquetas">
        ${['nuevo', 'popular', 'recomendado', '2x1'].map(et =>
          `<label style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:var(--gris-claro);border-radius:20px;cursor:pointer;font-size:0.85rem;">
            <input type="checkbox" value="${et}" ${plato.etiquetas.includes(et) ? 'checked' : ''} style="accent-color:var(--azul-principal);">
            ${et}
          </label>`
        ).join('')}
      </div>
    </div>`;

  abrirModal('modalEditarPlato');
}

function guardarEstadoPlato() {
  if (!platoEditandoId || !datosMenu) return;

  const plato = datosMenu.platos.find(p => p.id === platoEditandoId);
  if (!plato) return;

  const nuevoEstado = DOM.obtener('#editarPlatoEstado').value;
  const nuevoPrecio = parseFloat(DOM.obtener('#editarPlatoPrecio').value);
  const nuevasEtiquetas = [];
  DOM.obtenerTodos('#editarPlatoEtiquetas input:checked').forEach(cb => {
    nuevasEtiquetas.push(cb.value);
  });

  if (!Validaciones.validarMoneda(nuevoPrecio)) {
    Notificaciones.advertencia('Precio no valido');
    return;
  }

  // Actualizar en memoria
  plato.estado = nuevoEstado;
  plato.precio = nuevoPrecio;
  plato.etiquetas = nuevasEtiquetas;

  // Guardar en Firestore para persistir cambios
  db.collection('carta_cambios').add({
    platoId: platoEditandoId,
    estado: nuevoEstado,
    precio: nuevoPrecio,
    etiquetas: nuevasEtiquetas,
    modificadoPor: usuarioActual.nombre,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    Notificaciones.exito(`${plato.nombre} actualizado`);
    registrarAccion('COMANDA', `Plato "${plato.nombre}" editado: estado=${nuevoEstado}, precio=${Formatos.formatearMoneda(nuevoPrecio)}`);
    renderizarCartaAdmin();
    cerrarModal('modalEditarPlato');
    platoEditandoId = null;
  })
  .catch(err => {
    Notificaciones.error('Error al guardar cambios');
    console.error(err);
  });
}

function toggleEstadoPlato(platoId) {
  const plato = datosMenu.platos.find(p => p.id === platoId);
  if (!plato) return;

  const nuevoEstado = plato.estado === 'disponible' ? 'agotado' : 'disponible';
  plato.estado = nuevoEstado;

  db.collection('carta_cambios').add({
    platoId: platoId,
    estado: nuevoEstado,
    precio: plato.precio,
    etiquetas: plato.etiquetas,
    modificadoPor: usuarioActual.nombre,
    fecha: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    Notificaciones.exito(`${plato.nombre}: ${nuevoEstado === 'disponible' ? 'disponible' : 'agotado'}`);
    registrarAccion('COMANDA', `Plato "${plato.nombre}" marcado como ${nuevoEstado}`);
    renderizarCartaAdmin();
  })
  .catch(err => {
    plato.estado = plato.estado === 'disponible' ? 'agotado' : 'disponible';
    Notificaciones.error('Error al cambiar estado');
    console.error(err);
  });
}

// ============================================================================
// GESTION DE USUARIOS
// ============================================================================

function cargarUsuarios() {
  db.collection('usuarios')
    .orderBy('nombre')
    .get()
    .then(snapshot => {
      usuarios = [];
      snapshot.forEach(doc => {
        usuarios.push({ id: doc.id, ...doc.data() });
      });
      renderizarUsuarios();
    })
    .catch(err => {
      console.error('Error al cargar usuarios:', err);
    });
}

function renderizarUsuarios() {
  const contenedor = DOM.obtener('#tablaUsuarios');
  if (!contenedor) return;

  if (usuarios.length === 0) {
    contenedor.innerHTML = '<div class="vacio"><p>No hay usuarios registrados</p></div>';
    return;
  }

  const soloLectura = !obtenerPermisos(usuarioActual.rol).includes('usuarios');

  let html = `
    <table class="tabla-datos">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Email</th>
          <th>Rol</th>
          <th>Estado</th>
          ${!soloLectura ? '<th>Acciones</th>' : ''}
        </tr>
      </thead>
      <tbody>`;

  usuarios.forEach(u => {
    const estadoClase = u.activo !== false ? 'badge-listo' : 'badge-cancelado';
    const estadoTexto = u.activo !== false ? 'Activo' : 'Inactivo';

    html += `
      <tr>
        <td><strong>${u.nombre || '-'}</strong></td>
        <td>${u.email || '-'}</td>
        <td><span class="badge badge-preparando">${traducirRol(u.rol)}</span></td>
        <td><span class="badge ${estadoClase}">${estadoTexto}</span></td>
        ${!soloLectura ? `
        <td>
          <button class="btn-pequeno ${u.activo !== false ? 'btn-peligro' : 'btn-exito'}"
            onclick="toggleEstadoUsuario('${u.id}', ${u.activo !== false})">
            ${u.activo !== false ? 'Desactivar' : 'Activar'}
          </button>
        </td>` : ''}
      </tr>`;
  });

  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

function abrirModalNuevoUsuario() {
  DOM.obtener('#nuevoUsuarioEmail').value = '';
  DOM.obtener('#nuevoUsuarioNombre').value = '';
  DOM.obtener('#nuevoUsuarioRol').value = 'mozo';
  abrirModal('modalNuevoUsuario');
}

function crearUsuario() {
  const email = DOM.obtener('#nuevoUsuarioEmail').value.trim();
  const nombre = DOM.obtener('#nuevoUsuarioNombre').value.trim();
  const rol = DOM.obtener('#nuevoUsuarioRol').value;

  if (!email || !nombre) {
    Notificaciones.advertencia('Completa todos los campos');
    return;
  }

  if (!Validaciones.validarEmail(email)) {
    Notificaciones.advertencia('Email no valido');
    return;
  }

  // Crear usuario en Firebase Auth con contrasena temporal
  const passwordTemporal = 'Sistacna' + Math.random().toString(36).slice(-6);

  // Usamos la API admin o creamos un documento en Firestore
  // para que el admin lo registre (en produccion se usaria Cloud Functions)
  // Aqui guardamos los datos y el admin crea la cuenta manualmente
  db.collection('usuarios_pendientes').add({
    email: email,
    nombre: nombre,
    rol: rol,
    passwordTemporal: passwordTemporal,
    creadoPor: usuarioActual.nombre,
    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    // Tambien crear documento de usuario en la coleccion principal
    // (en produccion, un Cloud Function lo haria al crear la cuenta Auth)
    return db.collection('usuarios').doc(email.replace(/[.@]/g, '_')).set({
      email: email,
      nombre: nombre,
      rol: rol,
      activo: true,
      creadoPor: usuarioActual.nombre,
      fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
    });
  })
  .then(() => {
    Notificaciones.exito(`Usuario "${nombre}" creado. Contrasena temporal: ${passwordTemporal}`);
    registrarAccion('USUARIO', `Usuario creado: ${nombre} (${rol})`, email);
    cerrarModal('modalNuevoUsuario');
    cargarUsuarios();
  })
  .catch(err => {
    Notificaciones.error('Error al crear usuario');
    console.error(err);
  });
}

function toggleEstadoUsuario(userId, estaActivo) {
  const accion = estaActivo ? 'desactivar' : 'activar';
  if (!confirm(`¿${capitalizar(accion)} este usuario?`)) return;

  db.collection('usuarios').doc(userId).update({
    activo: !estaActivo,
    ultimaModificacion: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    Notificaciones.exito(`Usuario ${accion}do`);
    registrarAccion('USUARIO', `Usuario ${accion}do`, userId);
    cargarUsuarios();
  })
  .catch(err => {
    Notificaciones.error('Error al actualizar usuario');
    console.error(err);
  });
}

// ============================================================================
// AUDITORIA
// ============================================================================

function registrarAccion(tipo, descripcion, referenciaId) {
  if (!usuarioActual) return;

  const registro = {
    tipo: tipo,
    descripcion: descripcion,
    referenciaId: referenciaId || null,
    usuario: usuarioActual.nombre,
    usuarioEmail: usuarioActual.email,
    rol: usuarioActual.rol,
    fecha: firebase.firestore.FieldValue.serverTimestamp(),
    ip: null
  };

  db.collection('auditoria').add(registro).catch(err => {
    console.error('Error al registrar auditoria:', err);
  });
}

function cargarAuditoria() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  db.collection('auditoria')
    .orderBy('fecha', 'desc')
    .limit(100)
    .get()
    .then(snapshot => {
      registrosAuditoria = [];
      snapshot.forEach(doc => {
        registrosAuditoria.push({ id: doc.id, ...doc.data() });
      });
      renderizarAuditoria();
    })
    .catch(err => {
      console.error('Error al cargar auditoria:', err);
    });
}

function renderizarAuditoria() {
  const contenedor = DOM.obtener('#tablaAuditoria');
  if (!contenedor) return;

  let filtrados = filtrarRegistrosAuditoria();

  if (filtrados.length === 0) {
    contenedor.innerHTML = '<div class="vacio"><p>No hay registros de auditoria</p></div>';
    return;
  }

  let html = `
    <table class="tabla-datos">
      <thead>
        <tr>
          <th>Fecha/Hora</th>
          <th>Usuario</th>
          <th>Tipo</th>
          <th>Descripcion</th>
        </tr>
      </thead>
      <tbody>`;

  filtrados.forEach(r => {
    const fecha = r.fecha?.toDate ?
      Formatos.formatearFechaHora(r.fecha.toDate()) : '-';

    const tipoClases = {
      COMANDA: 'badge-preparando',
      BOLETA: 'badge-listo',
      USUARIO: 'badge-entregado',
      ACCESO: 'badge-pendiente'
    };

    html += `
      <tr>
        <td style="white-space:nowrap;">${fecha}</td>
        <td>${r.usuario || '-'}</td>
        <td><span class="badge ${tipoClases[r.tipo] || ''}">${r.tipo}</span></td>
        <td>${r.descripcion || '-'}</td>
      </tr>`;
  });

  html += '</tbody></table>';
  contenedor.innerHTML = html;
}

function filtrarRegistrosAuditoria() {
  let filtrados = [...registrosAuditoria];

  const filtroUsuario = (DOM.obtener('#filtroUsuarioAuditoria')?.value || '').toLowerCase().trim();
  const filtroTipo = DOM.obtener('#filtroTipoAuditoria')?.value || 'todos';
  const filtroDesde = DOM.obtener('#filtroFechaDesde')?.value;
  const filtroHasta = DOM.obtener('#filtroFechaHasta')?.value;

  if (filtroUsuario) {
    filtrados = filtrados.filter(r =>
      (r.usuario || '').toLowerCase().includes(filtroUsuario)
    );
  }

  if (filtroTipo !== 'todos') {
    filtrados = filtrados.filter(r => r.tipo === filtroTipo);
  }

  if (filtroDesde) {
    const desde = new Date(filtroDesde);
    desde.setHours(0, 0, 0, 0);
    filtrados = filtrados.filter(r => {
      const fecha = r.fecha?.toDate ? r.fecha.toDate() : null;
      return fecha && fecha >= desde;
    });
  }

  if (filtroHasta) {
    const hasta = new Date(filtroHasta);
    hasta.setHours(23, 59, 59, 999);
    filtrados = filtrados.filter(r => {
      const fecha = r.fecha?.toDate ? r.fecha.toDate() : null;
      return fecha && fecha <= hasta;
    });
  }

  return filtrados;
}

function filtrarAuditoria() {
  renderizarAuditoria();
}

function exportarAuditoria() {
  const filtrados = filtrarRegistrosAuditoria();

  if (filtrados.length === 0) {
    Notificaciones.advertencia('No hay registros para exportar');
    return;
  }

  let csv = 'Fecha,Usuario,Rol,Tipo,Descripcion,Referencia\n';
  filtrados.forEach(r => {
    const fecha = r.fecha?.toDate ?
      Formatos.formatearFechaHora(r.fecha.toDate()) : '-';
    csv += `"${fecha}","${r.usuario || ''}","${r.rol || ''}","${r.tipo || ''}","${(r.descripcion || '').replace(/"/g, '""')}","${r.referenciaId || ''}"\n`;
  });

  const fechaArchivo = Formatos.formatearFecha(new Date()).replace(/\//g, '-');
  descargarArchivo(`auditoria_sistacna_${fechaArchivo}.csv`, csv, 'text/csv;charset=utf-8');
  Notificaciones.exito('Auditoria exportada');
}

// ============================================================================
// MODALES
// ============================================================================

function abrirModal(modalId) {
  DOM.agregarClase(DOM.obtener(`#${modalId}`), 'activo');
  document.body.style.overflow = 'hidden';
}

function cerrarModal(modalId) {
  DOM.removerClase(DOM.obtener(`#${modalId}`), 'activo');
  document.body.style.overflow = 'auto';
}

// ============================================================================
// LISTENERS Y CLEANUP
// ============================================================================

function detenerListeners() {
  if (listenerComandas) { listenerComandas(); listenerComandas = null; }
  if (listenerBoletas) { listenerBoletas(); listenerBoletas = null; }
}

// ============================================================================
// INICIALIZACION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar Firebase (esperar a que persistence este lista)
  const firebaseResult = await inicializarFirebase();

  if (!firebaseResult) {
    Notificaciones.error('Error al cargar Firebase. Verifica tu conexion.');
    return;
  }

  // Escuchar cambios de autenticacion (Firebase ya esta listo)
  auth.onAuthStateChanged(user => {
    if (user && !usuarioActual) {
      // Sesion activa, recuperar datos del usuario
      db.collection('usuarios').doc(user.uid).get()
        .then(doc => {
          if (doc.exists) {
            const datos = doc.data();
            if (datos.activo !== false) {
              usuarioActual = {
                uid: user.uid,
                email: user.email,
                nombre: datos.nombre,
                rol: datos.rol
              };
              mostrarPanel();
            } else {
              auth.signOut();
            }
          } else {
            // Auto-registro para sesion persistida sin documento
            const nuevoUsuario = {
              email: user.email,
              nombre: user.email.split('@')[0],
              rol: 'super_admin',
              activo: true,
              fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
              autoRegistrado: true
            };
            db.collection('usuarios').doc(user.uid).set(nuevoUsuario).then(() => {
              usuarioActual = {
                uid: user.uid,
                email: user.email,
                nombre: nuevoUsuario.nombre,
                rol: nuevoUsuario.rol
              };
              mostrarPanel();
            });
          }
        })
        .catch(() => {});
    }
  });

  // Cargar datos de configuracion para mesas
  fetch('data/configuracion.json')
    .then(r => r.json())
    .then(datos => { configuracion = datos; })
    .catch(() => {});

  // Atajos de teclado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modalesActivos = document.querySelectorAll('.modal-overlay.activo');
      modalesActivos.forEach(modal => {
        DOM.removerClase(modal, 'activo');
      });
      document.body.style.overflow = 'auto';
    }
  });

  // Enter en login
  DOM.enEvent(DOM.obtener('#loginPassword'), 'keydown', (e) => {
    if (e.key === 'Enter') iniciarSesion();
  });
  DOM.enEvent(DOM.obtener('#loginEmail'), 'keydown', (e) => {
    if (e.key === 'Enter') DOM.obtener('#loginPassword').focus();
  });

  // Recordar sesion
  const sesionGuardada = Almacenamiento.obtener('sistacna_sesion');
  if (sesionGuardada && sesionGuardada.email) {
    DOM.obtener('#loginEmail').value = sesionGuardada.email;
    DOM.obtener('#recordarSesion').checked = true;
  }
});
