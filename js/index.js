const SECCIONES_GALERIA = {
  salon: {
    titulo: 'Salon Principal',
    imagenes: [
      { descripcion: 'Vista panoramica del salon principal con capacidad para 80 personas' },
      { descripcion: 'Area de mesas centrales con decoracion moderna' },
      { descripcion: 'Detalle de iluminacion y ambiente del salon' }
    ]
  },
  terraza: {
    titulo: 'Terraza',
    imagenes: [
      { descripcion: 'Terraza al aire libre con vista a los jardines' },
      { descripcion: 'Mesas con sombrillas para el servicio de almuerzo' },
      { descripcion: 'Ambiente nocturno con iluminacion decorativa' }
    ]
  },
  privado: {
    titulo: 'Salon Privado',
    imagenes: [
      { descripcion: 'Salon privado para eventos especiales y reuniones' },
      { descripcion: 'Mesa principal con capacidad para 10 personas' },
      { descripcion: 'Equipo audiovisual para presentaciones' }
    ]
  },
  barra: {
    titulo: 'Barra',
    imagenes: [
      { descripcion: 'Barra de bar con cocteleria peruana de autor' },
      { descripcion: 'Coleccion de piscos y licores selectos' },
      { descripcion: 'Asientos de barra con vista a la preparacion' }
    ]
  }
};

class ModalGaleria {
  constructor() {
    this.overlay = DOM.obtener('#modalGaleria');
    this.titulo = DOM.obtener('#modalGaleriaTitulo');
    this.descripcion = DOM.obtener('#galeriaDescripcion');
    this.contador = DOM.obtener('#galeriaContador');
    this.btnCerrar = DOM.obtener('#btnCerrarGaleria');
    this.btnAnterior = DOM.obtener('#btnGaleriaAnterior');
    this.btnSiguiente = DOM.obtener('#btnGaleriaSiguiente');
    this.seccionActual = null;
    this.indiceActual = 0;
    this.imagenes = [];
    this.inicializarEventos();
  }

  inicializarEventos() {
    DOM.enEvent(this.btnCerrar, 'click', () => this.cerrar());
    DOM.enEvent(this.btnAnterior, 'click', () => this.navegar(-1));
    DOM.enEvent(this.btnSiguiente, 'click', () => this.navegar(1));
    DOM.enEvent(this.overlay, 'click', (e) => {
      if (e.target === this.overlay) this.cerrar();
    });
  }

  abrir(seccion) {
    const datos = SECCIONES_GALERIA[seccion];
    if (!datos) return;
    this.seccionActual = seccion;
    this.imagenes = datos.imagenes;
    this.indiceActual = 0;
    this.titulo.textContent = datos.titulo;
    this.actualizarVista();
    DOM.agregarClase(this.overlay, 'activo');
    document.body.style.overflow = 'hidden';
  }

  cerrar() {
    DOM.removerClase(this.overlay, 'activo');
    document.body.style.overflow = 'auto';
  }

  navegar(direccion) {
    this.indiceActual += direccion;
    if (this.indiceActual < 0) this.indiceActual = this.imagenes.length - 1;
    if (this.indiceActual >= this.imagenes.length) this.indiceActual = 0;
    this.actualizarVista();
  }

  actualizarVista() {
    const imagen = this.imagenes[this.indiceActual];
    this.descripcion.textContent = imagen.descripcion;
    this.contador.textContent = `${this.indiceActual + 1} / ${this.imagenes.length}`;
  }
}

let modalGaleria;

function inicializarMenuMovil() {
  const btnHamburguesa = DOM.obtener('#btnHamburguesa');
  const navMenu = DOM.obtener('#navMenu');
  DOM.enEvent(btnHamburguesa, 'click', () => {
    DOM.toggleClase(btnHamburguesa, 'activo');
    DOM.toggleClase(navMenu, 'activo');
  });
  DOM.obtenerTodos('.nav-enlace').forEach(enlace => {
    DOM.enEvent(enlace, 'click', () => {
      DOM.removerClase(btnHamburguesa, 'activo');
      DOM.removerClase(navMenu, 'activo');
    });
  });
}

function inicializarScrollEncabezado() {
  const encabezado = DOM.obtener('#encabezado');
  window.addEventListener('scroll', throttle(() => {
    if (window.scrollY > 50) {
      DOM.agregarClase(encabezado, 'scrolled');
    } else {
      DOM.removerClase(encabezado, 'scrolled');
    }
  }, 100));
}

function inicializarNavegacionActiva() {
  const secciones = ['inicio', 'nosotros', 'galeria', 'contacto'];
  const enlaces = DOM.obtenerTodos('.nav-enlace');
  window.addEventListener('scroll', throttle(() => {
    let seccionVisible = secciones[0];
    secciones.forEach(id => {
      const seccion = document.getElementById(id);
      if (seccion) {
        const rect = seccion.getBoundingClientRect();
        if (rect.top <= 150) seccionVisible = id;
      }
    });
    enlaces.forEach(enlace => {
      DOM.removerClase(enlace, 'activo');
      if (enlace.getAttribute('href') === `#${seccionVisible}`) {
        DOM.agregarClase(enlace, 'activo');
      }
    });
  }, 100));
}

function inicializarAnimaciones() {
  const elementosAnimar = DOM.obtenerTodos('.tarjeta-valor, .galeria-tarjeta, .contacto-item');
  elementosAnimar.forEach(el => DOM.agregarClase(el, 'animar-entrada'));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        DOM.agregarClase(entry.target, 'visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  elementosAnimar.forEach(el => observer.observe(el));
}

function inicializarGaleria() {
  modalGaleria = new ModalGaleria();
  DOM.obtenerTodos('.galeria-tarjeta').forEach(tarjeta => {
    DOM.enEvent(tarjeta, 'click', () => {
      modalGaleria.abrir(tarjeta.dataset.seccion);
    });
  });
}

function abrirModalInfo(tipo) {
  const overlay = DOM.obtener('#modalInfo');
  const titulo = DOM.obtener('#modalInfoTitulo');
  const contenido = DOM.obtener('#modalInfoContenido');
  const btnCerrar = DOM.obtener('#btnCerrarInfo');

  if (tipo === 'equipo') {
    titulo.textContent = 'Nuestro Equipo';
    contenido.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:50px;height:50px;background:var(--azul-principal);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">CH</div>
          <div><strong>Chef Principal</strong><p style="font-size:0.9rem;color:var(--texto-secundario);">15 anos de experiencia en gastronomia peruana</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:50px;height:50px;background:var(--dorado);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">SC</div>
          <div><strong>Sous Chef</strong><p style="font-size:0.9rem;color:var(--texto-secundario);">Especialista en cocina fusion y presentacion</p></div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="width:50px;height:50px;background:var(--verde-acento);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;">BM</div>
          <div><strong>Barman</strong><p style="font-size:0.9rem;color:var(--texto-secundario);">Cocteleria peruana y de autor</p></div>
        </div>
      </div>`;
  } else if (tipo === 'reglamento') {
    titulo.textContent = 'Reglamento del Local';
    contenido.innerHTML = `
      <ul style="display:flex;flex-direction:column;gap:12px;list-style:disc;padding-left:20px;color:var(--texto-secundario);font-size:0.9rem;">
        <li>Reservaciones se mantienen por un maximo de 15 minutos.</li>
        <li>No se permite ingreso con mascotas, excepto perros guia.</li>
        <li>El consumo minimo por persona es de S/.25.00 en horario pico.</li>
        <li>Prohibido fumar dentro del establecimiento.</li>
        <li>Los objetos olvidados se guardan por un periodo de 30 dias.</li>
        <li>Menores de edad deben estar acompanados por un adulto responsable.</li>
        <li>Aceptamos efectivo, tarjetas de credito/debito y pagos digitales.</li>
      </ul>`;
  }

  DOM.agregarClase(overlay, 'activo');
  document.body.style.overflow = 'hidden';

  const cerrarModal = () => {
    DOM.removerClase(overlay, 'activo');
    document.body.style.overflow = 'auto';
  };

  btnCerrar.onclick = cerrarModal;
  overlay.onclick = (e) => { if (e.target === overlay) cerrarModal(); };
}

function inicializarTeclado() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const galeriaOverlay = DOM.obtener('#modalGaleria');
      const infoOverlay = DOM.obtener('#modalInfo');
      if (galeriaOverlay.classList.contains('activo')) modalGaleria.cerrar();
      if (infoOverlay.classList.contains('activo')) {
        DOM.removerClase(infoOverlay, 'activo');
        document.body.style.overflow = 'auto';
      }
    }
    if (DOM.obtener('#modalGaleria').classList.contains('activo')) {
      if (e.key === 'ArrowLeft') modalGaleria.navegar(-1);
      if (e.key === 'ArrowRight') modalGaleria.navegar(1);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarMenuMovil();
  inicializarScrollEncabezado();
  inicializarNavegacionActiva();
  inicializarAnimaciones();
  inicializarGaleria();
  inicializarTeclado();
  registrarServiceWorker();
});
