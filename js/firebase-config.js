const CONFIGURACION_FIREBASE = {
  apiKey: "AIzaSyCfIUzoIyV5bxOFNXwnUWXALR72tM8Md5I",
  authDomain: "systacna.firebaseapp.com",
  projectId: "systacna",
  storageBucket: "systacna.firebasestorage.app",
  messagingSenderId: "657070305055",
  appId: "1:657070305055:web:14a4c5c978cde9d5748a2a"
};

const DATOS_RESTAURANTE = {
  nombre: "SISTACNA",
  nombreCompleto: "Restaurante SISTACNA",
  telefono: "+51910000000",
  whatsapp: "51910000000",
  email: "info@sistacna.com",
  direccion: "Av. Principal 123, Tacna, Peru",
  ruc: "20123456789",
  razonSocial: "SISTACNA RESTAURANTE S.A.C.",
  horarios: {
    almuerzo: "11:00 - 15:00",
    cena: "18:00 - 23:00"
  },
  redesSociales: {
    facebook: "https://facebook.com/sistacna",
    instagram: "https://instagram.com/sistacna",
    tiktok: "https://tiktok.com/@sistacna"
  },
  igv: 0.18,
  moneda: "S/.",
  serieBoleta: "B001"
};

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MOZO: 'mozo',
  CAJERO: 'cajero'
};

const PERMISOS_POR_ROL = {
  super_admin: ['comandas', 'caja', 'carta', 'usuarios', 'auditoria'],
  admin: ['comandas', 'caja', 'carta', 'usuarios_lectura', 'auditoria_lectura'],
  mozo: ['comandas', 'carta_lectura'],
  cajero: ['caja', 'carta_lectura', 'comandas_lectura']
};

const ESTADOS_COMANDA = {
  PENDIENTE: 'pendiente',
  PREPARANDO: 'preparando',
  LISTO: 'listo',
  ENTREGADO: 'entregado',
  COBRADO: 'cobrado',
  CANCELADO: 'cancelado'
};

const METODOS_PAGO = [
  { id: 'efectivo', nombre: 'Efectivo' },
  { id: 'tarjeta', nombre: 'Tarjeta' },
  { id: 'yape', nombre: 'Yape/Plin' },
  { id: 'mixto', nombre: 'Mixto' }
];

let app = null;
let db = null;
let auth = null;

function inicializarFirebase() {
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(CONFIGURACION_FIREBASE);
    } else {
      app = firebase.apps[0];
    }
    db = firebase.firestore();
    auth = firebase.auth();

    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

    return { app, db, auth };
  }
  return null;
}

function obtenerPermisos(rol) {
  return PERMISOS_POR_ROL[rol] || [];
}

function tienePermiso(rol, permiso) {
  const permisos = obtenerPermisos(rol);
  return permisos.includes(permiso) || permisos.includes(permiso.replace('_lectura', ''));
}

function generarNumeroCorrelativo(ultimoNumero) {
  return String((ultimoNumero || 0) + 1).padStart(3, '0');
}

function generarNumeroBoleta(ultimoNumero) {
  return `${DATOS_RESTAURANTE.serieBoleta}-${String((ultimoNumero || 0) + 1).padStart(6, '0')}`;
}

function esMismoDia(fecha1, fecha2) {
  const d1 = fecha1 instanceof Date ? fecha1 : fecha1.toDate();
  const d2 = fecha2 instanceof Date ? fecha2 : new Date();
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}
