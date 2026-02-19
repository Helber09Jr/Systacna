const Validaciones = {
  validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validarTelefono(telefono) {
    return /^(\+51)?9\d{8}$/.test(telefono.replace(/[\s-]/g, ''));
  },

  validarRUC(ruc) {
    return /^(10|20)\d{9}$/.test(ruc);
  },

  validarMoneda(monto) {
    return typeof monto === 'number' && monto >= 0 && isFinite(monto);
  },

  validarObservacion(texto, maxLongitud = 200) {
    return typeof texto === 'string' && texto.length <= maxLongitud;
  }
};

const Formatos = {
  formatearMoneda(monto) {
    return `S/.${Number(monto).toFixed(2)}`;
  },

  formatearFecha(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  },

  formatearHora(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const horas = String(d.getHours()).padStart(2, '0');
    const minutos = String(d.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  },

  formatearFechaHora(fecha) {
    return `${this.formatearFecha(fecha)} ${this.formatearHora(fecha)}`;
  },

  formatearTelefono(telefono) {
    const limpio = telefono.replace(/\D/g, '');
    if (limpio.length === 9) {
      return `+51 ${limpio.slice(0, 3)}-${limpio.slice(3, 6)}-${limpio.slice(6)}`;
    }
    return telefono;
  }
};

const Almacenamiento = {
  guardar(clave, datos) {
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
    } catch (e) {
      Notificaciones.error('Error al guardar datos locales');
    }
  },

  obtener(clave) {
    try {
      const datos = localStorage.getItem(clave);
      return datos ? JSON.parse(datos) : null;
    } catch (e) {
      return null;
    }
  },

  eliminar(clave) {
    localStorage.removeItem(clave);
  },

  limpiar() {
    localStorage.clear();
  }
};

const Notificaciones = {
  _obtenerContenedor() {
    let contenedor = document.getElementById('contenedorToast');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'contenedorToast';
      document.body.appendChild(contenedor);
    }
    return contenedor;
  },

  _mostrar(mensaje, tipo, duracion = 3000) {
    const contenedor = this._obtenerContenedor();
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;

    const iconos = {
      exito: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      advertencia: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    toast.innerHTML = `${iconos[tipo] || ''}<span>${mensaje}</span>`;
    contenedor.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('saliendo');
      setTimeout(() => toast.remove(), 300);
    }, duracion);
  },

  exito(mensaje) { this._mostrar(mensaje, 'exito'); },
  error(mensaje) { this._mostrar(mensaje, 'error', 4000); },
  advertencia(mensaje) { this._mostrar(mensaje, 'advertencia'); },
  info(mensaje) { this._mostrar(mensaje, 'info'); }
};

const DOM = {
  obtener(selector) {
    return document.querySelector(selector);
  },

  obtenerTodos(selector) {
    return document.querySelectorAll(selector);
  },

  crear(etiqueta, atributos = {}) {
    const elemento = document.createElement(etiqueta);
    Object.entries(atributos).forEach(([clave, valor]) => {
      if (clave === 'className') {
        elemento.className = valor;
      } else if (clave === 'innerHTML') {
        elemento.innerHTML = valor;
      } else if (clave === 'textContent') {
        elemento.textContent = valor;
      } else if (clave.startsWith('data')) {
        elemento.setAttribute(`data-${clave.slice(4).toLowerCase()}`, valor);
      } else {
        elemento.setAttribute(clave, valor);
      }
    });
    return elemento;
  },

  limpiar(elemento) {
    elemento.innerHTML = '';
  },

  agregarClase(elemento, clase) {
    elemento.classList.add(clase);
  },

  removerClase(elemento, clase) {
    elemento.classList.remove(clase);
  },

  toggleClase(elemento, clase) {
    elemento.classList.toggle(clase);
  },

  enEvent(elemento, evento, callback) {
    if (elemento) {
      elemento.addEventListener(evento, callback);
    }
  }
};

function generarUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function debounce(funcion, espera = 300) {
  let temporizador;
  return function(...args) {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => funcion.apply(this, args), espera);
  };
}

function throttle(funcion, espera = 100) {
  let enEspera = false;
  return function(...args) {
    if (!enEspera) {
      funcion.apply(this, args);
      enEspera = true;
      setTimeout(() => { enEspera = false; }, espera);
    }
  };
}

function scrollSuave(elemento) {
  if (elemento) {
    elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function copiarAlPortapapeles(texto) {
  navigator.clipboard.writeText(texto).then(() => {
    Notificaciones.exito('Copiado al portapapeles');
  }).catch(() => {
    Notificaciones.error('No se pudo copiar');
  });
}

function descargarArchivo(nombre, contenido, tipo = 'text/csv') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/PWA/sw.js')
        .then(registro => {
          console.log('SW registrado:', registro.scope);
        })
        .catch(error => {
          console.log('SW error:', error);
        });
    });
  }
}
