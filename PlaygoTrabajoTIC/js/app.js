/**
 * PLAYGO — Lógica principal de la aplicación (SPA Vanilla JS)
 * Controla navegación, renderizado de vistas, filtros, calendario, horarios, checkout y modales.
 */

(function () {
  'use strict';

  var VENUES = window.PLAYGO_VENUES || [];
  var UTILS = window.PLAYGO_UTILS;
  var STORAGE = window.PLAYGO_STORAGE;
  var CONFIG = window.PLAYGO_CONFIG;

  /* ==================== ESTADO DE LA APLICACIÓN ==================== */
  var state = {
    currentView: 'inicio',
    selectedVenueId: VENUES.length ? VENUES[0].id : null,
    selectedDate: UTILS.getTodayISO(),
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear(),
    selectedSlots: [],
    activeImageIndex: 0,
    exploreFilters: {
      query: '',
      district: '',
      sport: '',
      surface: '',
      minPrice: '',
      maxPrice: '',
      parking: false,
      lighting: false,
      favoritesOnly: false,
      sort: 'featured'
    },
    reservationFilter: 'all',
    pendingCancelCode: null
  };

  /* ==================== UTILIDADES UI Y ICONOS ==================== */
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    if (!container) return;

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + (type || 'info');

    var iconName = 'info';
    if (type === 'success') iconName = 'check-circle-2';
    if (type === 'error') iconName = 'alert-circle';
    if (type === 'warning') iconName = 'alert-triangle';

    toast.innerHTML =
      '<i data-lucide="' + iconName + '" aria-hidden="true"></i>' +
      '<span>' + escapeHTML(message) + '</span>';

    container.appendChild(toast);
    refreshIcons();

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(12px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 3400);
  }

  function attachImageFallbacks(rootElement) {
    var scope = rootElement || document;
    var images = scope.querySelectorAll('img');
    images.forEach(function (img) {
      if (img.dataset.fallbackBound) return;
      img.dataset.fallbackBound = 'true';
      img.addEventListener('error', function () {
        if (img.src !== window.PLAYGO_FALLBACK_IMAGE) {
          img.src = window.PLAYGO_FALLBACK_IMAGE;
        }
      });
    });
  }

  function updateNavbarBadges() {
    var favCount = STORAGE.getFavorites().length;
    var confirmedCount = STORAGE.getReservations().filter(function (r) {
      return r.status === 'Confirmada';
    }).length;

    var favBadge = document.getElementById('navFavoritesBadge');
    var resBadge = document.getElementById('navReservationsBadge');

    if (favBadge) favBadge.textContent = String(favCount);
    if (resBadge) {
      resBadge.textContent = String(confirmedCount);
      resBadge.hidden = confirmedCount === 0;
    }
  }

  /* ==================== NAVEGACIÓN ENTRE VISTAS ==================== */
  function navigateTo(viewName, options) {
    var validViews = ['inicio', 'explorar', 'detalle', 'reservas'];
    if (validViews.indexOf(viewName) === -1) viewName = 'inicio';

    state.currentView = viewName;

    validViews.forEach(function (v) {
      var section = document.getElementById('view-' + v);
      if (section) {
        section.hidden = v !== viewName;
        section.classList.toggle('is-active', v === viewName);
      }
    });

    document.querySelectorAll('.nav-link').forEach(function (link) {
      var target = link.getAttribute('data-nav');
      link.classList.toggle('is-active', target === viewName);
    });

    closeMobileMenu();

    if (viewName === 'inicio') {
      renderFeaturedVenues();
    } else if (viewName === 'explorar') {
      syncFilterInputsFromState();
      renderExploreWithSkeleton();
    } else if (viewName === 'detalle') {
      if (options && options.venueId) {
        state.selectedVenueId = options.venueId;
        state.activeImageIndex = 0;
        state.selectedSlots = [];
      }
      renderVenueDetail();
    } else if (viewName === 'reservas') {
      renderReservationsView();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshIcons();
  }

  function closeMobileMenu() {
    var menu = document.getElementById('navbarMenu');
    var toggle = document.getElementById('mobileMenuToggle');
    if (menu) menu.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  /* ==================== TARJETA DE CANCHA REUTILIZABLE ==================== */
  function createVenueCardHTML(venue) {
    var isFav = STORAGE.isFavorite(venue.id);
    var sportsTags = venue.sports
      .map(function (sp) {
        return '<span class="sport-tag">' + escapeHTML(sp) + '</span>';
      })
      .join('');

    var surfaceLabel = venue.surfaces.join(' / ');

    return (
      '<article class="venue-card" data-venue-id="' + escapeHTML(venue.id) + '">' +
        '<div class="venue-card__media">' +
          '<img class="venue-card__img" src="' + escapeHTML(venue.images[0]) + '" alt="' + escapeHTML(venue.name) + '" loading="lazy" />' +
          '<span class="venue-card__surface-tag">' + escapeHTML(surfaceLabel) + '</span>' +
          '<button type="button" class="favorite-btn ' + (isFav ? 'is-favorite' : '') + '" data-action="toggle-favorite" data-venue-id="' + escapeHTML(venue.id) + '" aria-label="Guardar ' + escapeHTML(venue.name) + ' en favoritos" aria-pressed="' + (isFav ? 'true' : 'false') + '">' +
            '<i data-lucide="heart" aria-hidden="true"></i>' +
          '</button>' +
        '</div>' +
        '<div class="venue-card__body">' +
          '<span class="venue-card__district">' +
            '<i data-lucide="map-pin" aria-hidden="true"></i>' +
            escapeHTML(venue.district) + ', ' + escapeHTML(venue.city) +
          '</span>' +
          '<h3 class="venue-card__title">' + escapeHTML(venue.name) + '</h3>' +
          '<div class="venue-card__sports">' + sportsTags + '</div>' +
          '<div class="venue-card__footer">' +
            '<div class="venue-price">' +
              '<span class="venue-price__label">Desde</span>' +
              '<span class="venue-price__value">S/ ' + venue.rates.day + ' <small>/ hora</small></span>' +
            '</div>' +
            '<button type="button" class="btn btn--primary btn--sm" data-action="view-venue" data-venue-id="' + escapeHTML(venue.id) + '">' +
              '<span>Ver cancha</span>' +
              '<i data-lucide="arrow-right" aria-hidden="true"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /* ==================== VISTA 1: INICIO ==================== */
  function renderFeaturedVenues() {
    var grid = document.getElementById('featuredVenuesGrid');
    if (!grid) return;

    grid.innerHTML = VENUES.map(createVenueCardHTML).join('');
    attachImageFallbacks(grid);
    refreshIcons();
  }

  /* ==================== VISTA 2: EXPLORAR CANCHAS ==================== */
  function syncFilterInputsFromState() {
    var f = state.exploreFilters;
    document.getElementById('exploreSearchInput').value = f.query;
    document.getElementById('filterDistrict').value = f.district;
    document.getElementById('filterSport').value = f.sport;
    document.getElementById('filterSurface').value = f.surface;
    document.getElementById('filterMinPrice').value = f.minPrice;
    document.getElementById('filterMaxPrice').value = f.maxPrice;
    document.getElementById('filterParking').checked = f.parking;
    document.getElementById('filterLighting').checked = f.lighting;
    document.getElementById('filterFavoritesOnly').checked = f.favoritesOnly;
    document.getElementById('exploreSortSelect').value = f.sort;
  }

  function getFilteredVenues() {
    var f = state.exploreFilters;
    var favs = STORAGE.getFavorites();
    var queryLower = f.query.trim().toLowerCase();
    var minP = f.minPrice !== '' ? parseFloat(f.minPrice) : null;
    var maxP = f.maxPrice !== '' ? parseFloat(f.maxPrice) : null;

    var filtered = VENUES.filter(function (venue) {
      if (f.district && venue.district !== f.district) return false;
      if (f.sport && venue.sports.indexOf(f.sport) === -1) return false;
      if (f.surface && venue.surfaces.indexOf(f.surface) === -1) return false;
      if (minP !== null && !isNaN(minP) && venue.rates.day < minP) return false;
      if (maxP !== null && !isNaN(maxP) && venue.rates.day > maxP) return false;

      if (f.parking) {
        var hasParking = venue.services.some(function (s) {
          return s.toLowerCase().indexOf('estacionamiento') !== -1;
        });
        if (!hasParking) return false;
      }

      if (f.lighting) {
        var hasLighting = venue.services.some(function (s) {
          return s.toLowerCase().indexOf('iluminación') !== -1;
        });
        if (!hasLighting) return false;
      }

      if (f.favoritesOnly && favs.indexOf(venue.id) === -1) return false;

      if (queryLower) {
        var searchable = [
          venue.name,
          venue.district,
          venue.address,
          venue.sports.join(' '),
          venue.surfaces.join(' '),
          venue.services.join(' ')
        ]
          .join(' ')
          .toLowerCase();
        if (searchable.indexOf(queryLower) === -1) return false;
      }

      return true;
    });

    var sorted = filtered.slice();
    if (f.sort === 'price-asc') {
      sorted.sort(function (a, b) { return a.rates.day - b.rates.day; });
    } else if (f.sort === 'price-desc') {
      sorted.sort(function (a, b) { return b.rates.day - a.rates.day; });
    } else if (f.sort === 'alpha-asc') {
      sorted.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    }

    return sorted;
  }

  function renderActiveFilterChips() {
    var container = document.getElementById('activeFiltersChips');
    if (!container) return;

    var f = state.exploreFilters;
    var chips = [];

    if (f.district) chips.push('Distrito: ' + f.district);
    if (f.sport) chips.push('Deporte: ' + f.sport);
    if (f.surface) chips.push('Superficie: ' + f.surface);
    if (f.minPrice !== '') chips.push('Desde S/ ' + f.minPrice);
    if (f.maxPrice !== '') chips.push('Hasta S/ ' + f.maxPrice);
    if (f.parking) chips.push('Estacionamiento');
    if (f.lighting) chips.push('Iluminación nocturna');
    if (f.favoritesOnly) chips.push('Solo favoritos');
    if (f.query.trim()) chips.push('"' + f.query.trim() + '"');

    container.innerHTML = chips
      .map(function (label) {
        return '<span class="filter-chip">' + escapeHTML(label) + '</span>';
      })
      .join('');
  }

  function renderExploreResults() {
    var grid = document.getElementById('exploreVenuesGrid');
    var emptyState = document.getElementById('exploreEmptyState');
    var countLabel = document.getElementById('exploreResultsCount');
    if (!grid || !emptyState || !countLabel) return;

    var results = getFilteredVenues();
    renderActiveFilterChips();

    if (results.length === 0) {
      grid.innerHTML = '';
      grid.hidden = true;
      emptyState.hidden = false;
      countLabel.textContent = '0 canchas encontradas';
    } else {
      grid.hidden = false;
      emptyState.hidden = true;
      countLabel.textContent =
        'Mostrando ' +
        results.length +
        (results.length === 1 ? ' cancha' : ' canchas');
      grid.innerHTML = results.map(createVenueCardHTML).join('');
      attachImageFallbacks(grid);
    }

    refreshIcons();
  }

  function renderExploreWithSkeleton() {
    var grid = document.getElementById('exploreVenuesGrid');
    var emptyState = document.getElementById('exploreEmptyState');
    if (!grid) return;

    emptyState.hidden = true;
    grid.hidden = false;
    grid.innerHTML = [1, 2, 3, 4]
      .map(function () {
        return (
          '<div class="skeleton-card" aria-hidden="true">' +
            '<div class="skeleton-box skeleton-img"></div>' +
            '<div class="skeleton-box skeleton-line skeleton-line--short"></div>' +
            '<div class="skeleton-box skeleton-line skeleton-line--med"></div>' +
            '<div class="skeleton-box skeleton-line skeleton-line--short"></div>' +
          '</div>'
        );
      })
      .join('');

    setTimeout(renderExploreResults, 180);
  }

  function resetExploreFilters() {
    state.exploreFilters = {
      query: '',
      district: '',
      sport: '',
      surface: '',
      minPrice: '',
      maxPrice: '',
      parking: false,
      lighting: false,
      favoritesOnly: false,
      sort: 'featured'
    };
    syncFilterInputsFromState();
    renderExploreResults();
  }

  /* ==================== VISTA 3: DETALLE DE CANCHA ==================== */
  function getSelectedVenue() {
    return (
      VENUES.find(function (v) {
        return v.id === state.selectedVenueId;
      }) || VENUES[0]
    );
  }

  function renderVenueDetail() {
    var venue = getSelectedVenue();
    if (!venue) return;

    var isFav = STORAGE.isFavorite(venue.id);

    // Encabezado
    document.getElementById('detailVenueName').textContent = venue.name;
    document.getElementById('detailVenueAddress').textContent =
      venue.address + ' — ' + venue.district + ', ' + venue.city;
    document.getElementById('detailDayRate').textContent = 'S/ ' + venue.rates.day + ' / h';
    document.getElementById('detailNightRate').textContent = 'S/ ' + venue.rates.night + ' / h';

    var badgesHTML = venue.sports
      .map(function (s) {
        return '<span class="badge-pill">' + escapeHTML(s) + '</span>';
      })
      .join('');
    badgesHTML +=
      '<span class="badge-pill badge-pill--dark">' +
      escapeHTML(venue.surfaces.join(' • ')) +
      '</span>';
    document.getElementById('detailTopBadges').innerHTML = badgesHTML;

    // Botón favorito
    var favBtn = document.getElementById('detailFavoriteBtn');
    var favText = document.getElementById('detailFavoriteText');
    favBtn.classList.toggle('is-favorite', isFav);
    favText.textContent = isFav ? 'En tus favoritos' : 'Guardar en favoritos';

    // Galería
    var mainImg = document.getElementById('detailMainImage');
    mainImg.src = venue.images[state.activeImageIndex] || venue.images[0];
    mainImg.alt = venue.name + ' - vista ' + (state.activeImageIndex + 1);

    var thumbsContainer = document.getElementById('detailGalleryThumbs');
    thumbsContainer.innerHTML = venue.images
      .map(function (imgUrl, idx) {
        return (
          '<button type="button" class="gallery-thumb ' +
          (idx === state.activeImageIndex ? 'is-active' : '') +
          '" data-action="select-gallery-img" data-img-index="' + idx + '" aria-label="Ver fotografía ' + (idx + 1) + '">' +
            '<img src="' + escapeHTML(imgUrl) + '" alt="' + escapeHTML(venue.name) + ' miniatura ' + (idx + 1) + '" />' +
          '</button>'
        );
      })
      .join('');
    attachImageFallbacks(document.getElementById('detailGallery'));

    // Información y servicios
    document.getElementById('detailVenueDescription').textContent = venue.description;
    document.getElementById('detailDistrict').textContent = venue.district + ', ' + venue.city;
    document.getElementById('detailSurface').textContent = venue.surfaces.join(', ');
    document.getElementById('detailSportsList').textContent = venue.sports.join(', ');

    document.getElementById('detailServicesList').innerHTML = venue.services
      .map(function (srv) {
        return (
          '<li>' +
            '<i data-lucide="check-circle-2" aria-hidden="true"></i>' +
            '<span>' + escapeHTML(srv) + '</span>' +
          '</li>'
        );
      })
      .join('');

    // Mapa con dirección exacta (sin coordenadas inventadas)
    var fullQueryAddress = venue.address + ', ' + venue.district + ', Lima, Perú';
    var encodedQuery = encodeURIComponent(fullQueryAddress);
    document.getElementById('detailMapAddressCaption').textContent = fullQueryAddress;
    document.getElementById('detailExternalMapLink').href =
      'https://www.google.com/maps/search/?api=1&query=' + encodedQuery;
    document.getElementById('detailGoogleMapFrame').src =
      'https://maps.google.com/maps?q=' + encodedQuery + '&t=&z=15&ie=UTF8&iwloc=&output=embed';

    // Calendario, matriz de horarios y resumen
    renderCalendar();
    renderSlotsMatrix();
    updateBookingSummary();
    refreshIcons();
  }

  /* ==================== CALENDARIO INTERACTIVO ==================== */
  function renderCalendar() {
    var label = document.getElementById('calMonthYearLabel');
    var grid = document.getElementById('calDaysGrid');
    if (!label || !grid) return;

    var monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    label.textContent = monthNames[state.calendarMonth] + ' ' + state.calendarYear;

    var firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
    // Convertir domingo (0) a índice 6 para semana Lunes-Domingo
    var startWeekday = (firstDay.getDay() + 6) % 7;
    var daysInMonth = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();
    var todayISO = UTILS.getTodayISO();

    var cells = [];
    for (var i = 0; i < startWeekday; i++) {
      cells.push('<span class="cal-day cal-day--empty"></span>');
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var iso =
        state.calendarYear +
        '-' +
        String(state.calendarMonth + 1).padStart(2, '0') +
        '-' +
        String(day).padStart(2, '0');

      var isPast = iso < todayISO;
      var isToday = iso === todayISO;
      var isSelected = iso === state.selectedDate;

      var classes = ['cal-day'];
      if (isToday) classes.push('is-today');
      if (isSelected) classes.push('is-selected');

      cells.push(
        '<button type="button" class="' + classes.join(' ') + '" data-action="select-date" data-date="' + iso + '"' +
          (isPast ? ' disabled aria-disabled="true"' : '') +
        '>' +
          day +
        '</button>'
      );
    }

    grid.innerHTML = cells.join('');
  }

  /* ==================== MATRIZ DE HORARIOS ==================== */
  function renderSlotsMatrix() {
    var venue = getSelectedVenue();
    var grid = document.getElementById('slotsMatrixGrid');
    var dateLabel = document.getElementById('slotsSelectedDateText');
    if (!venue || !grid || !dateLabel) return;

    dateLabel.textContent = 'Horarios para el ' + UTILS.formatHumanDate(state.selectedDate);

    var occupied = STORAGE.getOccupiedSlots(venue.id, state.selectedDate);
    var html = [];

    for (var hour = CONFIG.openHour; hour < CONFIG.closeHour; hour++) {
      var isOccupied = occupied.indexOf(hour) !== -1;
      var isSelected = state.selectedSlots.indexOf(hour) !== -1;
      var rate = UTILS.getHourRate(venue, hour);
      var periodLabel = UTILS.isNightHour(hour) ? 'de noche' : 'de día';

      var statusClass = UTILS.isNightHour(hour) ? 'slot-btn--night' : 'slot-btn--available';
      var statusText = 'S/ ' + rate + ' · ' + periodLabel;

      if (isOccupied) {
        statusClass = 'slot-btn--occupied';
        statusText = 'Ocupado';
      } else if (isSelected) {
        statusClass = 'slot-btn--selected';
        statusText = 'Tu selección · S/ ' + rate;
      }

      html.push(
        '<button type="button" class="slot-btn ' + statusClass + '" data-action="toggle-slot" data-hour="' + hour + '"' +
          (isOccupied ? ' disabled aria-disabled="true"' : '') +
        '>' +
          '<span class="slot-btn__time">' + UTILS.formatSlotRange(hour) + '</span>' +
          '<span class="slot-btn__meta">' + statusText + '</span>' +
        '</button>'
      );
    }

    grid.innerHTML = html.join('');
  }

  function handleSlotClick(hour) {
    var venue = getSelectedVenue();
    if (!venue) return;

    var occupied = STORAGE.getOccupiedSlots(venue.id, state.selectedDate);
    if (occupied.indexOf(hour) !== -1) {
      showToast('Esa hora ya está ocupada, elige otra.', 'error');
      return;
    }

    var current = state.selectedSlots.slice().sort(function (a, b) { return a - b; });
    var existingIdx = current.indexOf(hour);

    if (existingIdx !== -1) {
      // Si deselecciona un extremo, conservar el resto; si deselecciona en medio, recortar desde ahí
      if (existingIdx === 0 || existingIdx === current.length - 1) {
        current.splice(existingIdx, 1);
      } else {
        current = current.slice(0, existingIdx);
        showToast('Ajustamos tu selección para que sigan siendo horas seguidas.', 'info');
      }
      state.selectedSlots = current;
    } else if (current.length === 0) {
      state.selectedSlots = [hour];
    } else {
      var minH = current[0];
      var maxH = current[current.length - 1];

      if (hour === minH - 1 || hour === maxH + 1) {
        current.push(hour);
        current.sort(function (a, b) { return a - b; });
        state.selectedSlots = current;
      } else {
        // Iniciar nueva selección consecutiva desde el nuevo bloque pulsado
        state.selectedSlots = [hour];
        showToast('Empezamos una selección nueva desde esa hora.', 'info');
      }
    }

    renderSlotsMatrix();
    updateBookingSummary();
  }

  function updateBookingSummary() {
    var venue = getSelectedVenue();
    if (!venue) return;

    var pricing = UTILS.calculateSelectionPricing(venue, state.selectedSlots);
    var proceedBtn = document.getElementById('proceedCheckoutBtn');

    document.getElementById('summaryVenueName').textContent = venue.name;
    document.getElementById('summaryDate').textContent = UTILS.formatHumanDate(state.selectedDate);
    document.getElementById('summaryTimeRange').textContent =
      pricing.hoursCount > 0 ? UTILS.formatSelectedRange(state.selectedSlots) : 'Elige una hora';
    document.getElementById('summaryDuration').textContent =
      pricing.hoursCount + (pricing.hoursCount === 1 ? ' hora' : ' horas');
    document.getElementById('summaryRateDetail').textContent = pricing.rateSummary;
    document.getElementById('summaryTotalAmount').textContent = UTILS.formatCurrency(pricing.total);

    proceedBtn.disabled = pricing.hoursCount === 0;
  }

  /* ==================== CHECKOUT Y CONFIRMACIÓN ==================== */
  function openCheckoutModal() {
    var venue = getSelectedVenue();
    if (!venue || state.selectedSlots.length === 0) return;

    // Revalidar disponibilidad antes de abrir checkout
    if (!STORAGE.isSlotAvailable(venue.id, state.selectedDate, state.selectedSlots)) {
      showToast('Alguien se te adelantó en una de esas horas. Actualizamos la lista.', 'error');
      state.selectedSlots = [];
      renderSlotsMatrix();
      updateBookingSummary();
      return;
    }

    var pricing = UTILS.calculateSelectionPricing(venue, state.selectedSlots);
    var prefs = STORAGE.getPreferences();

    document.getElementById('checkoutStepKicker').textContent = 'Último paso';
    document.getElementById('checkoutModalTitle').textContent = 'Confirma tu reserva';
    document.getElementById('checkoutFormStep').hidden = false;
    document.getElementById('checkoutSuccessStep').hidden = true;

    document.getElementById('checkoutCustomerName').value = prefs.customerName || '';
    document.getElementById('checkoutCustomerPhone').value = prefs.customerPhone || '';
    document.getElementById('checkoutCustomerEmail').value = prefs.customerEmail || '';
    clearCheckoutErrors();

    document.getElementById('chkVenueName').textContent = venue.name;
    document.getElementById('chkDistrict').textContent = venue.district;
    document.getElementById('chkDate').textContent = UTILS.formatHumanDate(state.selectedDate);
    document.getElementById('chkTimeRange').textContent = UTILS.formatSelectedRange(state.selectedSlots);
    document.getElementById('chkDuration').textContent =
      pricing.hoursCount + (pricing.hoursCount === 1 ? ' hora' : ' horas');
    document.getElementById('chkHourlyRate').textContent = pricing.rateSummary;
    document.getElementById('chkTotal').textContent = UTILS.formatCurrency(pricing.total);

    document.getElementById('checkoutModal').hidden = false;
    refreshIcons();
  }

  function closeCheckoutModal() {
    document.getElementById('checkoutModal').hidden = true;
  }

  function clearCheckoutErrors() {
    document.getElementById('errorCustomerName').textContent = '';
    document.getElementById('errorCustomerPhone').textContent = '';
    document.getElementById('errorCustomerEmail').textContent = '';
  }

  function validateCheckoutForm() {
    clearCheckoutErrors();
    var valid = true;

    var name = document.getElementById('checkoutCustomerName').value.trim();
    var phone = document.getElementById('checkoutCustomerPhone').value.trim();
    var email = document.getElementById('checkoutCustomerEmail').value.trim();

    if (name.length < 3) {
      document.getElementById('errorCustomerName').textContent =
        'Ingresa tu nombre completo (mínimo 3 caracteres).';
      valid = false;
    }

    var digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      document.getElementById('errorCustomerPhone').textContent =
        'Ingresa un número de teléfono válido (7 a 15 dígitos).';
      valid = false;
    }

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      document.getElementById('errorCustomerEmail').textContent =
        'Ingresa un correo electrónico válido.';
      valid = false;
    }

    return {
      valid: valid,
      customerName: name,
      customerPhone: phone,
      customerEmail: email
    };
  }

  function handleCheckoutSubmit(event) {
    event.preventDefault();

    var validation = validateCheckoutForm();
    if (!validation.valid) {
      showToast('Revisa los datos marcados en rojo.', 'warning');
      return;
    }

    var venue = getSelectedVenue();
    if (!venue || state.selectedSlots.length === 0) return;

    var selectedPaymentInput = document.querySelector('input[name="paymentMethod"]:checked');
    var paymentMethod = selectedPaymentInput ? selectedPaymentInput.value : 'Yape';
    var pricing = UTILS.calculateSelectionPricing(venue, state.selectedSlots);

    var result = STORAGE.saveReservation({
      venueId: venue.id,
      venueName: venue.name,
      district: venue.district,
      address: venue.address,
      date: state.selectedDate,
      slots: state.selectedSlots,
      timeRange: UTILS.formatSelectedRange(state.selectedSlots),
      duration: pricing.hoursCount,
      rateSummary: pricing.rateSummary,
      total: pricing.total,
      paymentMethod: paymentMethod,
      customerName: validation.customerName,
      customerPhone: validation.customerPhone,
      customerEmail: validation.customerEmail
    });

    if (!result.ok) {
      showToast(result.error, 'error');
      state.selectedSlots = [];
      renderSlotsMatrix();
      updateBookingSummary();
      closeCheckoutModal();
      return;
    }

    STORAGE.savePreferences({
      customerName: validation.customerName,
      customerPhone: validation.customerPhone,
      customerEmail: validation.customerEmail
    });

    var res = result.reservation;

    // Mostrar pantalla de éxito
    document.getElementById('checkoutStepKicker').textContent = 'Tu comprobante';
    document.getElementById('checkoutModalTitle').textContent = 'Reserva lista';
    document.getElementById('checkoutFormStep').hidden = true;
    document.getElementById('checkoutSuccessStep').hidden = false;

    document.getElementById('receiptCode').textContent = res.code;
    document.getElementById('receiptVenue').textContent = res.venueName;
    document.getElementById('receiptDate').textContent = UTILS.formatHumanDate(res.date);
    document.getElementById('receiptTime').textContent = res.timeRange + ' (' + res.duration + 'h)';
    document.getElementById('receiptTotal').textContent = UTILS.formatCurrency(res.total);
    document.getElementById('receiptMethod').textContent = res.paymentMethod;

    // Limpiar selección y actualizar matriz de horarios
    state.selectedSlots = [];
    renderSlotsMatrix();
    updateBookingSummary();
    updateNavbarBadges();
    refreshIcons();
    showToast('Listo, reserva ' + res.code + ' confirmada.', 'success');
  }

  /* ==================== VISTA 4: MIS RESERVAS ==================== */
  function renderReservationsView() {
    var allReservations = STORAGE.getReservations();
    var confirmedCount = allReservations.filter(function (r) { return r.status === 'Confirmada'; }).length;
    var cancelledCount = allReservations.filter(function (r) { return r.status === 'Cancelada'; }).length;

    document.getElementById('countResAll').textContent = String(allReservations.length);
    document.getElementById('countResConfirmed').textContent = String(confirmedCount);
    document.getElementById('countResCancelled').textContent = String(cancelledCount);

    var filtered = allReservations.filter(function (r) {
      if (state.reservationFilter === 'all') return true;
      return r.status === state.reservationFilter;
    });

    var listEl = document.getElementById('reservationsList');
    var emptyEl = document.getElementById('reservationsEmptyState');

    if (filtered.length === 0) {
      listEl.innerHTML = '';
      listEl.hidden = true;
      emptyEl.hidden = false;
      document.getElementById('reservationsEmptyTitle').textContent =
        allReservations.length === 0
          ? 'Todavía no reservaste nada'
          : 'No hay reservas en esta pestaña';
      return;
    }

    listEl.hidden = false;
    emptyEl.hidden = true;

    listEl.innerHTML = filtered
      .map(function (res) {
        var isConfirmed = res.status === 'Confirmada';
        var statusClass = isConfirmed ? 'status-badge--confirmed' : 'status-badge--cancelled';
        var cardClass = isConfirmed ? 'reservation-card' : 'reservation-card reservation-card--cancelled';

        return (
          '<article class="' + cardClass + '">' +
            '<div>' +
              '<div class="reservation-card__top">' +
                '<span class="res-code-badge">' + escapeHTML(res.code) + '</span>' +
                '<span class="status-badge ' + statusClass + '">' + escapeHTML(res.status) + '</span>' +
              '</div>' +
              '<h3 class="reservation-card__title">' + escapeHTML(res.venueName) + '</h3>' +
              '<p class="reservation-card__address">' + escapeHTML(res.address) + ' (' + escapeHTML(res.district) + ')</p>' +
              '<div class="reservation-card__meta">' +
                '<span class="res-meta-item"><i data-lucide="calendar" aria-hidden="true"></i>' + UTILS.formatHumanDate(res.date) + '</span>' +
                '<span class="res-meta-item"><i data-lucide="clock" aria-hidden="true"></i>' + escapeHTML(res.timeRange) + ' (' + res.duration + 'h)</span>' +
                '<span class="res-meta-item"><i data-lucide="wallet" aria-hidden="true"></i>' + escapeHTML(res.paymentMethod) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="reservation-card__right">' +
              '<div class="reservation-card__price">' +
                '<span>Total</span>' +
                '<strong>' + UTILS.formatCurrency(res.total) + '</strong>' +
              '</div>' +
              '<div class="reservation-card__actions">' +
                '<button type="button" class="btn btn--secondary btn--sm" data-action="view-res-detail" data-code="' + escapeHTML(res.code) + '">' +
                  '<i data-lucide="file-text" aria-hidden="true"></i>' +
                  '<span>Ver comprobante</span>' +
                '</button>' +
                (isConfirmed
                  ? '<button type="button" class="btn btn--danger btn--sm" data-action="prompt-cancel-res" data-code="' + escapeHTML(res.code) + '">' +
                      '<i data-lucide="x-circle" aria-hidden="true"></i>' +
                      '<span>Cancelar reserva</span>' +
                    '</button>'
                  : '') +
              '</div>' +
            '</div>' +
          '</article>'
        );
      })
      .join('');

    refreshIcons();
  }

  function openReservationDetailModal(code) {
    var res = STORAGE.getReservations().find(function (r) { return r.code === code; });
    if (!res) return;

    var body = document.getElementById('resDetailModalBody');
    var isConfirmed = res.status === 'Confirmada';

    body.innerHTML =
      '<div class="receipt-card">' +
        '<div class="receipt-card__code">' +
          '<span>TU CÓDIGO</span>' +
          '<strong>' + escapeHTML(res.code) + '</strong>' +
        '</div>' +
        '<div class="receipt-card__grid">' +
          '<div><span>Cancha</span><strong>' + escapeHTML(res.venueName) + '</strong></div>' +
          '<div><span>Estado</span><strong class="' + (isConfirmed ? 'text-available' : '') + '">' + escapeHTML(res.status) + '</strong></div>' +
          '<div><span>Dirección</span><strong>' + escapeHTML(res.address) + '</strong></div>' +
          '<div><span>Distrito</span><strong>' + escapeHTML(res.district) + '</strong></div>' +
          '<div><span>Fecha de juego</span><strong>' + UTILS.formatHumanDate(res.date) + '</strong></div>' +
          '<div><span>Hora y duración</span><strong>' + escapeHTML(res.timeRange) + ' (' + res.duration + 'h)</strong></div>' +
          '<div><span>Tarifa aplicada</span><strong>' + escapeHTML(res.rateSummary) + '</strong></div>' +
          '<div><span>Pagas con</span><strong>' + escapeHTML(res.paymentMethod) + '</strong></div>' +
          '<div><span>A nombre de</span><strong>' + escapeHTML(res.customerName || '—') + '</strong></div>' +
          '<div><span>Total</span><strong>' + UTILS.formatCurrency(res.total) + '</strong></div>' +
        '</div>' +
      '</div>';

    document.getElementById('reservationDetailModal').hidden = false;
    refreshIcons();
  }

  function openCancelConfirmModal(code) {
    state.pendingCancelCode = code;
    document.getElementById('cancelTargetCode').textContent = code;
    document.getElementById('cancelConfirmModal').hidden = false;
    refreshIcons();
  }

  function closeCancelConfirmModal() {
    state.pendingCancelCode = null;
    document.getElementById('cancelConfirmModal').hidden = true;
  }

  function executeReservationCancellation() {
    if (!state.pendingCancelCode) return;
    var code = state.pendingCancelCode;
    var result = STORAGE.cancelReservation(code);
    closeCancelConfirmModal();

    if (result.ok) {
      updateNavbarBadges();
      renderReservationsView();
      if (state.currentView === 'detalle') {
        renderSlotsMatrix();
      }
      showToast('Reserva ' + code + ' cancelada. La hora ya está libre otra vez.', 'info');
    } else {
      showToast(result.error, 'error');
    }
  }

  /* ==================== EVENTOS GLOBALES ==================== */
  function bindEvents() {
    // Fecha mínima en buscador Hero
    var heroDateInput = document.getElementById('heroDateInput');
    var todayISO = UTILS.getTodayISO();
    if (heroDateInput) {
      heroDateInput.min = todayISO;
      heroDateInput.value = todayISO;
    }

    // Buscador Hero
    var heroSearchForm = document.getElementById('heroSearchForm');
    if (heroSearchForm) {
      heroSearchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var sport = document.getElementById('heroSportSelect').value;
        var district = document.getElementById('heroDistrictSelect').value;
        var chosenDate = document.getElementById('heroDateInput').value;

        state.exploreFilters.sport = sport;
        state.exploreFilters.district = district;

        if (chosenDate && chosenDate >= todayISO) {
          state.selectedDate = chosenDate;
          var parts = chosenDate.split('-');
          state.calendarYear = parseInt(parts[0], 10);
          state.calendarMonth = parseInt(parts[1], 10) - 1;
        }

        navigateTo('explorar');
      });
    }

    // Menú móvil
    var mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', function () {
        var menu = document.getElementById('navbarMenu');
        var isOpen = menu.classList.toggle('is-open');
        mobileMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // Acceso rápido a Favoritos en Navbar
    var navFavoritesBtn = document.getElementById('navFavoritesBtn');
    if (navFavoritesBtn) {
      navFavoritesBtn.addEventListener('click', function () {
        state.exploreFilters.favoritesOnly = true;
        navigateTo('explorar');
      });
    }

    // Filtros en Explorar
    document.getElementById('exploreSearchInput').addEventListener('input', function (e) {
      state.exploreFilters.query = e.target.value;
      renderExploreResults();
    });

    document.getElementById('filterDistrict').addEventListener('change', function (e) {
      state.exploreFilters.district = e.target.value;
      renderExploreResults();
    });

    document.getElementById('filterSport').addEventListener('change', function (e) {
      state.exploreFilters.sport = e.target.value;
      renderExploreResults();
    });

    document.getElementById('filterSurface').addEventListener('change', function (e) {
      state.exploreFilters.surface = e.target.value;
      renderExploreResults();
    });

    document.getElementById('filterMinPrice').addEventListener('input', function (e) {
      state.exploreFilters.minPrice = e.target.value;
      renderExploreResults();
    });

    document.getElementById('filterMaxPrice').addEventListener('input', function (e) {
      state.exploreFilters.maxPrice = e.target.value;
      renderExploreResults();
    });

    document.getElementById('filterParking').addEventListener('change', function (e) {
      state.exploreFilters.parking = e.target.checked;
      renderExploreResults();
    });

    document.getElementById('filterLighting').addEventListener('change', function (e) {
      state.exploreFilters.lighting = e.target.checked;
      renderExploreResults();
    });

    document.getElementById('filterFavoritesOnly').addEventListener('change', function (e) {
      state.exploreFilters.favoritesOnly = e.target.checked;
      renderExploreResults();
    });

    document.getElementById('exploreSortSelect').addEventListener('change', function (e) {
      state.exploreFilters.sort = e.target.value;
      renderExploreResults();
    });

    document.getElementById('clearFiltersBtn').addEventListener('click', resetExploreFilters);
    document.getElementById('emptyResetFiltersBtn').addEventListener('click', resetExploreFilters);

    // Toggle filtros en móvil
    var toggleFiltersBtn = document.getElementById('toggleFiltersBtn');
    if (toggleFiltersBtn) {
      toggleFiltersBtn.addEventListener('click', function () {
        var panel = document.getElementById('filtersPanel');
        var isOpen = panel.classList.toggle('is-open');
        toggleFiltersBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    }

    // Navegación calendario mes anterior/siguiente
    document.getElementById('calPrevMonthBtn').addEventListener('click', function () {
      var now = new Date();
      if (
        state.calendarYear === now.getFullYear() &&
        state.calendarMonth <= now.getMonth()
      ) {
        return;
      }
      if (state.calendarMonth === 0) {
        state.calendarMonth = 11;
        state.calendarYear -= 1;
      } else {
        state.calendarMonth -= 1;
      }
      renderCalendar();
    });

    document.getElementById('calNextMonthBtn').addEventListener('click', function () {
      if (state.calendarMonth === 11) {
        state.calendarMonth = 0;
        state.calendarYear += 1;
      } else {
        state.calendarMonth += 1;
      }
      renderCalendar();
    });

    // Botones Vista Detalle
    document.getElementById('detailBackBtn').addEventListener('click', function () {
      navigateTo('explorar');
    });

    document.getElementById('detailFavoriteBtn').addEventListener('click', function () {
      var venue = getSelectedVenue();
      if (!venue) return;
      var res = STORAGE.toggleFavorite(venue.id);
      updateNavbarBadges();
      renderVenueDetail();
      showToast(
        res.added
          ? venue.name + ' agregado a favoritos.'
          : venue.name + ' eliminado de favoritos.',
        'info'
      );
    });

    document.getElementById('proceedCheckoutBtn').addEventListener('click', openCheckoutModal);

    // Checkout eventos
    document.getElementById('closeCheckoutModalBtn').addEventListener('click', closeCheckoutModal);
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);

    document.querySelectorAll('input[name="paymentMethod"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        document.querySelectorAll('.payment-option').forEach(function (opt) {
          opt.classList.remove('is-selected');
        });
        if (radio.closest('.payment-option')) {
          radio.closest('.payment-option').classList.add('is-selected');
        }
      });
    });

    document.getElementById('successExploreBtn').addEventListener('click', function () {
      closeCheckoutModal();
      navigateTo('explorar');
    });

    document.getElementById('successMyBookingsBtn').addEventListener('click', function () {
      closeCheckoutModal();
      navigateTo('reservas');
    });

    // Modales de reservas
    document.getElementById('closeResDetailModalBtn').addEventListener('click', function () {
      document.getElementById('reservationDetailModal').hidden = true;
    });

    document.getElementById('closeCancelModalBtn').addEventListener('click', closeCancelConfirmModal);
    document.getElementById('dismissCancelModalBtn').addEventListener('click', closeCancelConfirmModal);
    document.getElementById('confirmCancelActionBtn').addEventListener('click', executeReservationCancellation);

    // Delegación global de clics
    document.addEventListener('click', function (e) {
      // Navegación data-nav
      var navTrigger = e.target.closest('[data-nav]');
      if (navTrigger) {
        e.preventDefault();
        navigateTo(navTrigger.getAttribute('data-nav'));
        return;
      }

      // Enlaces de distrito en Footer
      var districtLink = e.target.closest('[data-district-link]');
      if (districtLink) {
        e.preventDefault();
        resetExploreFilters();
        state.exploreFilters.district = districtLink.getAttribute('data-district-link');
        navigateTo('explorar');
        return;
      }

      // Enlaces sociales demostrativos en Footer
      var socialLink = e.target.closest('[data-social]');
      if (socialLink) {
        e.preventDefault();
        showToast('Perfil de PLAYGO en ' + socialLink.getAttribute('data-social') + '.', 'info');
        return;
      }

      // Acciones data-action
      var actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        var action = actionEl.getAttribute('data-action');

        if (action === 'toggle-favorite') {
          var favVenueId = actionEl.getAttribute('data-venue-id');
          var toggleRes = STORAGE.toggleFavorite(favVenueId);
          updateNavbarBadges();
          if (state.currentView === 'inicio') renderFeaturedVenues();
          if (state.currentView === 'explorar') renderExploreResults();
          showToast(
            toggleRes.added ? 'Cancha guardada en tus favoritos.' : 'Cancha quitada de tus favoritos.',
            'info'
          );
          return;
        }

        if (action === 'view-venue') {
          var venueId = actionEl.getAttribute('data-venue-id');
          navigateTo('detalle', { venueId: venueId });
          return;
        }

        if (action === 'select-gallery-img') {
          state.activeImageIndex = parseInt(actionEl.getAttribute('data-img-index'), 10) || 0;
          renderVenueDetail();
          return;
        }

        if (action === 'select-date') {
          var newDate = actionEl.getAttribute('data-date');
          if (newDate && newDate >= UTILS.getTodayISO()) {
            state.selectedDate = newDate;
            state.selectedSlots = [];
            renderCalendar();
            renderSlotsMatrix();
            updateBookingSummary();
          }
          return;
        }

        if (action === 'toggle-slot') {
          var hour = parseInt(actionEl.getAttribute('data-hour'), 10);
          if (!isNaN(hour)) {
            handleSlotClick(hour);
          }
          return;
        }

        if (action === 'view-res-detail') {
          openReservationDetailModal(actionEl.getAttribute('data-code'));
          return;
        }

        if (action === 'prompt-cancel-res') {
          openCancelConfirmModal(actionEl.getAttribute('data-code'));
          return;
        }
      }

      // Pestañas de filtro en Mis Reservas
      var tabBtn = e.target.closest('[data-res-filter]');
      if (tabBtn) {
        document.querySelectorAll('[data-res-filter]').forEach(function (btn) {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-selected', 'false');
        });
        tabBtn.classList.add('is-active');
        tabBtn.setAttribute('aria-selected', 'true');
        state.reservationFilter = tabBtn.getAttribute('data-res-filter');
        renderReservationsView();
      }
    });

    // Cerrar modales con tecla Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeCheckoutModal();
        closeCancelConfirmModal();
        document.getElementById('reservationDetailModal').hidden = true;
        closeMobileMenu();
      }
    });
  }

  /* ==================== INICIALIZACIÓN ==================== */
  function init() {
    bindEvents();
    updateNavbarBadges();
    renderFeaturedVenues();
    refreshIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
