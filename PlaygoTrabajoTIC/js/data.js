/**
 * PLAYGO — Catálogo de complejos deportivos y configuración de horarios/tarifas
 * Datos verificados según especificaciones de los cinco complejos en Lima, Perú.
 */

window.PLAYGO_CONFIG = {
  openHour: 8,   // 08:00
  closeHour: 23, // 23:00 (último bloque: 22:00 a 23:00)
  dayStartHour: 8,
  dayEndHour: 17,   // Bloques que inician entre 08:00 y 17:00 (08:00 a 18:00)
  nightStartHour: 18, // Bloques que inician entre 18:00 y 22:00 (18:00 a 23:00)
  currency: 'S/'
};

/**
 * Imagen SVG alternativa (fallback) en caso de error de red al cargar fotografías externas.
 */
window.PLAYGO_FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">' +
      '<rect width="800" height="500" fill="#101D36"/>' +
      '<rect x="60" y="55" width="680" height="390" rx="14" fill="none" stroke="#246BFD" stroke-width="4"/>' +
      '<line x1="400" y1="55" x2="400" y2="445" stroke="#246BFD" stroke-width="3"/>' +
      '<circle cx="400" cy="250" r="58" fill="none" stroke="#B8F36B" stroke-width="3"/>' +
      '<text x="400" y="245" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-size="26" font-weight="700">PLAYGO LIMA</text>' +
      '<text x="400" y="276" text-anchor="middle" fill="#B8F36B" font-family="sans-serif" font-size="14">Instalación deportiva referencial</text>' +
    '</svg>'
  );

/**
 * Cinco complejos deportivos oficiales registrados en PLAYGO.
 * Las imágenes corresponden a fotografías deportivas referenciales distintas por sede.
 */
window.PLAYGO_VENUES = [
  {
    id: 'CAN001',
    name: 'Parque Metropolitano Coronel Miguel Baquero',
    district: 'Breña',
    city: 'Lima',
    address: 'Jr. Coronel Miguel Baquero 362, cruce con Jr. Pacasmayo, detrás del Hospital Loayza',
    sports: ['Fulbito', 'Vóley', 'Básquet'],
    surfaces: ['Losa multiusos', 'Grass sintético'],
    rates: {
      day: 35,
      night: 45
    },
    services: [
      'Iluminación nocturna',
      'Tribunas',
      'Seguridad',
      'Áreas verdes'
    ],
    description:
      'Complejo deportivo vecinal y metropolitano en Breña equipado con losa multiusos y grass sintético para fulbito, vóley y básquet. Cuenta con áreas verdes, tribunas para espectadores y seguridad permanente.',
    images: [
      'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1100&q=80',
      'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'CAN002',
    name: 'PPA Sports',
    district: 'Magdalena del Mar',
    city: 'Lima',
    address: 'Av. del Ejército 750, Puericultorio Pérez Araníbar',
    sports: ['Fútbol 6', 'Fútbol 7'],
    surfaces: ['Grass sintético'],
    rates: {
      day: 95,
      night: 130
    },
    services: [
      'Estacionamiento interno',
      'Iluminación LED',
      'Alquiler de chalecos',
      'Alquiler de pelotas'
    ],
    description:
      'Sede deportiva de grass sintético ubicada en Av. del Ejército, Magdalena del Mar. Ideal para encuentros de Fútbol 6 y Fútbol 7 con iluminación LED de alto rendimiento y estacionamiento interno.',
    images: [
      'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1100&q=80',
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'CAN003',
    name: 'Arena 7, sede Pueblo Libre',
    district: 'Pueblo Libre',
    city: 'Lima',
    address: 'Av. de la Marina 1100, interior del Colegio Andrés Bello',
    sports: ['Fútbol 7'],
    surfaces: ['Grass sintético'],
    rates: {
      day: 85,
      night: 120
    },
    services: [
      'Estacionamiento amplio',
      'Balón incluido',
      'Chalecos incluidos',
      'Iluminación nocturna'
    ],
    description:
      'Cancha especializada en Fútbol 7 en Pueblo Libre con acceso directo por Av. de la Marina. Incluye balón, chalecos de entrenamiento, iluminación nocturna y estacionamiento amplio.',
    images: [
      'https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1100&q=80',
      'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'CAN004',
    name: 'Canchas Marbella, Fútbol 7 Pro',
    district: 'Magdalena del Mar',
    city: 'Lima',
    address: 'Circuito de Playas S/N, altura de la bajada Marbella, cerca del Grifo Primax',
    sports: ['Fútbol 7'],
    surfaces: ['Grass sintético FIFA'],
    rates: {
      day: 100,
      night: 140
    },
    services: [
      'Vista al mar',
      'Iluminación de alta potencia',
      'Camerinos',
      'Duchas',
      'Cafetería'
    ],
    description:
      'Complejo con certificación de superficie Grass sintético FIFA frente al mar en la Costa Verde de Magdalena del Mar. Dispone de iluminación de alta potencia, camerinos, duchas y cafetería.',
    images: [
      'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1100&q=80',
      'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=900&q=80'
    ]
  },
  {
    id: 'CAN005',
    name: 'Lawn Tennis Sport, sede Jesús María',
    district: 'Jesús María',
    city: 'Lima',
    address: 'Jr. Belisario Flores 900, altura de la cuadra 4 de Av. Salaverry',
    sports: ['Fútbol 7', 'Vóley'],
    surfaces: ['Grass sintético'],
    rates: {
      day: 95,
      night: 135
    },
    services: [
      'Estacionamiento vigilado',
      'Zona de descanso',
      'Iluminación LED',
      'Vestuarios'
    ],
    description:
      'Sede deportiva estratégica en Jesús María, a pocos metros de Av. Salaverry. Ofrece canchas de grass sintético para Fútbol 7 y Vóley con vestuarios, zona de descanso y estacionamiento vigilado.',
    images: [
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1100&q=80',
      'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=900&q=80'
    ]
  }
];

/**
 * Utilidades de horario y cálculo de tarifas
 */
window.PLAYGO_UTILS = {
  padHour: function (hour) {
    return String(hour).padStart(2, '0') + ':00';
  },

  formatSlotRange: function (startHour) {
    return this.padHour(startHour) + ' - ' + this.padHour(startHour + 1);
  },

  formatSelectedRange: function (hoursArray) {
    if (!hoursArray || hoursArray.length === 0) return 'Sin seleccionar';
    var sorted = hoursArray.slice().sort(function (a, b) { return a - b; });
    var start = sorted[0];
    var end = sorted[sorted.length - 1] + 1;
    return this.padHour(start) + ' a ' + this.padHour(end);
  },

  isNightHour: function (startHour) {
    return startHour >= window.PLAYGO_CONFIG.nightStartHour;
  },

  getHourRate: function (venue, startHour) {
    if (!venue) return 0;
    return this.isNightHour(startHour) ? venue.rates.night : venue.rates.day;
  },

  calculateSelectionPricing: function (venue, hoursArray) {
    if (!venue || !hoursArray || hoursArray.length === 0) {
      return {
        hoursCount: 0,
        dayHours: 0,
        nightHours: 0,
        total: 0,
        rateSummary: '—'
      };
    }

    var self = this;
    var dayHours = 0;
    var nightHours = 0;
    var total = 0;

    hoursArray.forEach(function (h) {
      if (self.isNightHour(h)) {
        nightHours += 1;
        total += venue.rates.night;
      } else {
        dayHours += 1;
        total += venue.rates.day;
      }
    });

    var rateSummary = '';
    if (dayHours > 0 && nightHours === 0) {
      rateSummary = 'S/ ' + venue.rates.day + ' / h (Diurna)';
    } else if (nightHours > 0 && dayHours === 0) {
      rateSummary = 'S/ ' + venue.rates.night + ' / h (Nocturna)';
    } else {
      rateSummary =
        dayHours + 'h diurna (S/ ' + venue.rates.day + ') + ' +
        nightHours + 'h nocturna (S/ ' + venue.rates.night + ')';
    }

    return {
      hoursCount: hoursArray.length,
      dayHours: dayHours,
      nightHours: nightHours,
      total: total,
      rateSummary: rateSummary
    };
  },

  formatCurrency: function (amount) {
    return 'S/ ' + Number(amount).toFixed(2);
  },

  getTodayISO: function () {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  },

  formatHumanDate: function (isoDate) {
    if (!isoDate) return '—';
    var parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    var months = [
      'ene', 'feb', 'mar', 'abr', 'may', 'jun',
      'jul', 'ago', 'sep', 'oct', 'nov', 'dic'
    ];
    var year = parts[0];
    var monthIndex = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    return day + ' ' + (months[monthIndex] || parts[1]) + ' ' + year;
  }
};
