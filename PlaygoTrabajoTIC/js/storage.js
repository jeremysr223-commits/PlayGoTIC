/**
 * PLAYGO — Capa de persistencia con LocalStorage
 * Gestiona reservas, horarios ocupados, favoritos y preferencias del usuario.
 */

window.PLAYGO_STORAGE = (function () {
  var KEYS = {
    RESERVATIONS: 'playgo_reservations_v1',
    FAVORITES: 'playgo_favorites_v1',
    PREFERENCES: 'playgo_preferences_v1',
    SEED_OCCUPIED: 'playgo_seed_occupied_v1'
  };

  function safeRead(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed !== null ? parsed : fallback;
    } catch (error) {
      console.error('PLAYGO Storage read error (' + key + '):', error);
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('PLAYGO Storage write error (' + key + '):', error);
      return false;
    }
  }

  /**
   * Inicializa horarios ocupados base de demostración para hoy y mañana
   * (solo una vez) para que la matriz muestre bloques ocupados y libres realistas.
   */
  function ensureSeedOccupiedSlots() {
    var existing = safeRead(KEYS.SEED_OCCUPIED, null);
    if (existing) return existing;

    var today = window.PLAYGO_UTILS.getTodayISO();
    var tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    var tomorrow =
      tomorrowDate.getFullYear() +
      '-' +
      String(tomorrowDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(tomorrowDate.getDate()).padStart(2, '0');

    var seed = {};
    seed['CAN001_' + today] = [18, 19];
    seed['CAN002_' + today] = [19, 20];
    seed['CAN003_' + today] = [16, 20];
    seed['CAN004_' + today] = [18, 21];
    seed['CAN005_' + today] = [17, 19];

    seed['CAN002_' + tomorrow] = [20, 21];
    seed['CAN004_' + tomorrow] = [19, 20];

    safeWrite(KEYS.SEED_OCCUPIED, seed);
    return seed;
  }

  /**
   * Obtiene todas las reservas registradas (confirmadas y canceladas).
   */
  function getReservations() {
    var list = safeRead(KEYS.RESERVATIONS, []);
    return Array.isArray(list) ? list : [];
  }

  /**
   * Genera un código único con formato PG-2026-XXXXX
   */
  function generateReservationCode() {
    var year = new Date().getFullYear();
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var existingCodes = getReservations().map(function (r) {
      return r.code;
    });

    var code = '';
    do {
      var suffix = '';
      for (var i = 0; i < 5; i++) {
        suffix += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      code = 'PG-' + year + '-' + suffix;
    } while (existingCodes.indexOf(code) !== -1);

    return code;
  }

  /**
   * Retorna arreglo de horas inicio (ej. [18, 19]) ocupadas para una cancha y fecha.
   * Combina los bloques base de demostración con las reservas activas ('Confirmada').
   */
  function getOccupiedSlots(venueId, dateISO) {
    if (!venueId || !dateISO) return [];
    var seed = ensureSeedOccupiedSlots();
    var key = venueId + '_' + dateISO;
    var occupiedSet = {};

    if (Array.isArray(seed[key])) {
      seed[key].forEach(function (h) {
        occupiedSet[h] = true;
      });
    }

    var reservations = getReservations();
    reservations.forEach(function (res) {
      if (
        res.venueId === venueId &&
        res.date === dateISO &&
        res.status === 'Confirmada' &&
        Array.isArray(res.slots)
      ) {
        res.slots.forEach(function (h) {
          occupiedSet[h] = true;
        });
      }
    });

    return Object.keys(occupiedSet)
      .map(function (k) {
        return parseInt(k, 10);
      })
      .sort(function (a, b) {
        return a - b;
      });
  }

  /**
   * Verifica si uno o varios bloques horarios están disponibles para reservar.
   */
  function isSlotAvailable(venueId, dateISO, hoursArray) {
    if (!venueId || !dateISO || !Array.isArray(hoursArray) || hoursArray.length === 0) {
      return false;
    }
    var occupied = getOccupiedSlots(venueId, dateISO);
    return hoursArray.every(function (h) {
      return occupied.indexOf(h) === -1;
    });
  }

  /**
   * Guarda una nueva reserva confirmada tras revalidar disponibilidad.
   */
  function saveReservation(payload) {
    if (!isSlotAvailable(payload.venueId, payload.date, payload.slots)) {
      return {
        ok: false,
        error: 'Uno o más horarios seleccionados ya fueron ocupados. Por favor elige otro bloque.'
      };
    }

    var reservations = getReservations();
    var code = generateReservationCode();
    var newReservation = {
      code: code,
      venueId: payload.venueId,
      venueName: payload.venueName,
      district: payload.district,
      address: payload.address,
      date: payload.date,
      slots: payload.slots.slice().sort(function (a, b) { return a - b; }),
      timeRange: payload.timeRange,
      duration: payload.duration,
      rateSummary: payload.rateSummary,
      total: payload.total,
      paymentMethod: payload.paymentMethod,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      status: 'Confirmada',
      createdAt: new Date().toISOString()
    };

    reservations.unshift(newReservation);
    var saved = safeWrite(KEYS.RESERVATIONS, reservations);
    if (!saved) {
      return {
        ok: false,
        error: 'No se pudo guardar la reserva en el almacenamiento del navegador.'
      };
    }

    return {
      ok: true,
      reservation: newReservation
    };
  }

  /**
   * Cancela una reserva existente sin eliminarla del historial.
   * Al pasar a estado 'Cancelada', getOccupiedSlots() libera sus bloques automáticamente.
   */
  function cancelReservation(code) {
    var reservations = getReservations();
    var updated = false;
    var target = null;

    var nextList = reservations.map(function (res) {
      if (res.code === code && res.status === 'Confirmada') {
        updated = true;
        target = Object.assign({}, res, {
          status: 'Cancelada',
          cancelledAt: new Date().toISOString()
        });
        return target;
      }
      return res;
    });

    if (!updated) {
      return { ok: false, error: 'No se encontró una reserva activa con ese código.' };
    }

    safeWrite(KEYS.RESERVATIONS, nextList);
    return { ok: true, reservation: target };
  }

  /**
   * Favoritos
   */
  function getFavorites() {
    var favs = safeRead(KEYS.FAVORITES, []);
    return Array.isArray(favs) ? favs : [];
  }

  function isFavorite(venueId) {
    return getFavorites().indexOf(venueId) !== -1;
  }

  function toggleFavorite(venueId) {
    var favs = getFavorites();
    var idx = favs.indexOf(venueId);
    var added = false;

    if (idx === -1) {
      favs.push(venueId);
      added = true;
    } else {
      favs.splice(idx, 1);
      added = false;
    }

    safeWrite(KEYS.FAVORITES, favs);
    return { favorites: favs, added: added };
  }

  /**
   * Preferencias del usuario (última fecha buscada, datos de contacto frecuentes)
   */
  function getPreferences() {
    return safeRead(KEYS.PREFERENCES, {
      lastDate: window.PLAYGO_UTILS.getTodayISO(),
      customerName: '',
      customerPhone: '',
      customerEmail: ''
    });
  }

  function savePreferences(partial) {
    var current = getPreferences();
    var merged = Object.assign({}, current, partial);
    safeWrite(KEYS.PREFERENCES, merged);
    return merged;
  }

  // Inicializar seed al cargar
  ensureSeedOccupiedSlots();

  return {
    getReservations: getReservations,
    saveReservation: saveReservation,
    cancelReservation: cancelReservation,
    getFavorites: getFavorites,
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getOccupiedSlots: getOccupiedSlots,
    isSlotAvailable: isSlotAvailable,
    getPreferences: getPreferences,
    savePreferences: savePreferences
  };
})();
