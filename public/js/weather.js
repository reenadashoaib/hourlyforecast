// Fetches the forecast from Open-Meteo and renders the page.
(function () {
  const cfg = window.SITE_CONFIG.weather;
  const $ = (sel, root = document) => root.querySelector(sel);

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ } }
  };

  // WMO weather codes: [description, icon family].
  const CODES = {
    0: ['Clear', 'clear'], 1: ['Mostly clear', 'clear'], 2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloudy'],
    45: ['Fog', 'fog'], 48: ['Freezing fog', 'fog'],
    51: ['Light drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy drizzle', 'drizzle'],
    56: ['Freezing drizzle', 'drizzle'], 57: ['Freezing drizzle', 'drizzle'],
    61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
    66: ['Freezing rain', 'rain'], 67: ['Freezing rain', 'rain'],
    71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'], 77: ['Snow grains', 'snow'],
    80: ['Light showers', 'rain'], 81: ['Showers', 'rain'], 82: ['Heavy showers', 'rain'],
    85: ['Snow showers', 'snow'], 86: ['Heavy snow showers', 'snow'],
    95: ['Thunderstorm', 'storm'], 96: ['Thunderstorm with hail', 'storm'], 99: ['Thunderstorm with hail', 'storm']
  };
  const describe = code => CODES[code] || ['Cloudy', 'cloudy'];

  function iconId(kind, isDay) {
    if (kind === 'clear') return isDay ? 'i-sun' : 'i-moon';
    if (kind === 'partly') return isDay ? 'i-sun-cloud' : 'i-moon-cloud';
    return 'i-' + kind;
  }
  const iconSvg = (kind, isDay, cls = 'icon') =>
    `<svg class="${cls}" aria-hidden="true"><use href="#${iconId(kind, isDay)}"/></svg>`;

  const use12h = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 !== false;

  const params = new URLSearchParams(location.search);
  const urlPlace = params.has('lat') && params.has('lon')
    ? { name: params.get('name') || 'Selected location', region: params.get('region') || '', country: params.get('country') || '',
        lat: Number(params.get('lat')), lon: Number(params.get('lon')) }
    : null;

  const state = {
    place: urlPlace || store.get('place') || cfg.defaultPlace,
    units: store.get('units') || (/^en-US|^en-LR|^my/.test(navigator.language) ? 'f' : 'c'),
    data: null
  };

  // ---------- formatting ----------
  const deg = t => Math.round(t) + '°';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function hourLabel(time) {
    const h = Number(time.slice(11, 13));
    if (!use12h) return time.slice(11, 16);
    if (h === 0) return '12 am';
    if (h === 12) return '12 pm';
    return h < 12 ? h + ' am' : (h - 12) + ' pm';
  }

  function addDays(date, n) {
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }

  function dayLabel(date, today, style = 'long') {
    if (date === today) return 'Today';
    if (date === addDays(today, 1)) return 'Tomorrow';
    return new Date(date + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: style, timeZone: 'UTC' });
  }

  function compass(dir) {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(dir / 45) % 8];
  }

  function placeLabel(p) {
    return [p.region, p.country].filter(Boolean).filter(x => x !== p.name).join(', ');
  }

  // ---------- data ----------
  async function fetchForecast(place, units) {
    const p = new URLSearchParams({
      latitude: place.lat,
      longitude: place.lon,
      timezone: 'auto',
      forecast_days: 7,
      current: 'temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
      hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,is_day,' +
        'wind_speed_10m,wind_direction_10m,relative_humidity_2m,uv_index',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
    });
    if (units === 'f') {
      p.set('temperature_unit', 'fahrenheit');
      p.set('wind_speed_unit', 'mph');
      p.set('precipitation_unit', 'inch');
    }
    if (cfg.apiKey) p.set('apikey', cfg.apiKey);
    const res = await fetch(cfg.forecastUrl + '?' + p);
    if (!res.ok) throw new Error('Forecast request failed: ' + res.status);
    return res.json();
  }

  function upcomingHours(d, count) {
    const h = d.hourly;
    const nowHour = d.current.time.slice(0, 13);
    let start = h.time.findIndex(t => t.slice(0, 13) >= nowHour);
    if (start < 0) start = 0;
    const out = [];
    for (let i = start; i < Math.min(start + count, h.time.length); i++) {
      out.push({
        time: h.time[i],
        temp: h.temperature_2m[i],
        feels: h.apparent_temperature[i],
        pop: h.precipitation_probability[i] ?? 0,
        code: h.weather_code[i],
        isDay: h.is_day[i] === 1,
        wind: h.wind_speed_10m[i],
        dir: h.wind_direction_10m[i],
        rh: h.relative_humidity_2m[i],
        uv: h.uv_index[i] ?? 0
      });
    }
    return out;
  }

  // One sentence answering "will it rain, and when?" for the next 24 hours.
  function outlook(hours, today) {
    const next = hours.slice(0, 24);
    const start = next.findIndex(h => h.pop >= 50);
    if (start === -1) {
      const peak = Math.max(...next.map(h => h.pop));
      return peak >= 25 ? 'Mostly dry, with a slight chance of showers' : 'Dry for the next 24 hours';
    }
    let end = start;
    while (end + 1 < next.length && next[end + 1].pop >= 50) end++;

    const kinds = next.slice(start, end + 1).map(h => describe(h.code)[1]);
    const count = k => kinds.filter(x => x === k).length;
    let what = 'Rain';
    if (count('storm')) what = 'Thunderstorms';
    else if (count('snow') > kinds.length / 2) what = 'Snow';
    else if (count('drizzle') === kinds.length) what = 'Drizzle';

    const at = i => hourLabel(next[i].time) + (next[i].time.slice(0, 10) !== today ? ' tomorrow' : '');
    const until = end + 1 < next.length ? at(end + 1) : null;
    if (start === 0) return until ? `${what} likely until ${until}` : `${what} likely through the next 24 hours`;
    return until ? `${what} likely from ${at(start)} to ${until}` : `${what} likely from ${at(start)}`;
  }

  // ---------- rendering ----------
  function renderNow(d, hours) {
    const c = d.current;
    const today = c.time.slice(0, 10);
    const [text, kind] = describe(c.weather_code);
    const windUnit = state.units === 'f' ? 'mph' : 'km/h';

    $('#place-name').textContent = state.place.name;
    $('#place-region').textContent = placeLabel(state.place);
    $('#outlook').textContent = outlook(hours, today) + '.';
    $('#now-icon').innerHTML = `<use href="#${iconId(kind, c.is_day === 1)}"/>`;
    $('#now-temp').textContent = deg(c.temperature_2m);
    $('#now-cond').textContent = text;
    $('#now-feels').textContent = 'Feels like ' + deg(c.apparent_temperature);
    $('#now-wind').textContent = `${Math.round(c.wind_speed_10m)} ${windUnit} ${compass(c.wind_direction_10m)}`;
    $('#now-humidity').textContent = c.relative_humidity_2m + '%';
    $('#now-sunrise').textContent = hourMinute(d.daily.sunrise[0]);
    $('#now-sunset').textContent = hourMinute(d.daily.sunset[0]);
    $('#now-time').textContent = hourMinute(c.time);
    document.title = `Hourly forecast for ${state.place.name} | Hourly Forecast`;
  }

  function hourMinute(time) {
    const h = Number(time.slice(11, 13)), m = time.slice(14, 16);
    if (!use12h) return time.slice(11, 16);
    return `${h % 12 || 12}:${m} ${h < 12 ? 'am' : 'pm'}`;
  }

  // The 48-hour sky strip: each column is tinted by that hour's sky.
  function renderStrip(hours, today) {
    const colW = 64, H = 268;
    const temps = hours.map(h => h.temp);
    const min = Math.min(...temps), max = Math.max(...temps), span = max - min || 1;
    const y = t => 176 - (t - min) / span * 60;
    let sky = '', text = '', bars = '', path = '';

    hours.forEach((h, i) => {
      const x = i * colW, cx = x + colW / 2;
      const kind = describe(h.code)[1];
      const tone = h.isDay ? '' : ' on-night';
      const midnight = i > 0 && h.time.slice(11, 13) === '00';
      const label = i === 0 ? 'Now' : midnight ? dayLabel(h.time.slice(0, 10), today, 'short') : hourLabel(h.time);
      const ty = y(h.temp);

      sky += `<rect class="sky sky-${kind}${h.isDay ? '' : ' sky-night'}" x="${x}" y="0" width="${colW}" height="${H}"/>`;
      if (midnight) sky += `<line class="strip-day-line" x1="${x}" x2="${x}" y1="0" y2="${H}"/>`;
      // Mark sunrise and sunset where day turns to night or back.
      if (i > 0 && h.isDay !== hours[i - 1].isDay) {
        sky += `<line class="strip-sun-line" x1="${x}" x2="${x}" y1="0" y2="${H}"/>`;
        text += `<text class="strip-sun${tone}" x="${x + 6}" y="18" style="text-anchor:start">${h.isDay ? 'Sunrise' : 'Sunset'}</text>`;
      }
      text += `<text class="strip-hour${tone}${midnight || i === 0 ? ' is-strong' : ''}" x="${cx}" y="44">${label}</text>`;
      text += `<use href="#${iconId(kind, h.isDay)}" x="${cx - 15}" y="56" width="30" height="30"/>`;
      text += `<text class="strip-temp${tone}" x="${cx}" y="${ty - 12}">${deg(h.temp)}</text>`;
      path += (i ? 'L' : 'M') + cx + ' ' + ty.toFixed(1);
      const bh = Math.max(h.pop / 100 * 36, h.pop ? 2 : 0);
      bars += `<rect class="pop-bar" x="${cx - 11}" y="${242 - bh}" width="22" height="${bh}" rx="3"/>`;
      if (h.pop >= 10) text += `<text class="strip-pop${tone}" x="${cx}" y="260">${h.pop}%</text>`;
    });

    const dots = hours.map((h, i) => `<circle class="temp-dot" cx="${i * colW + colW / 2}" cy="${y(h.temp).toFixed(1)}" r="3.5"/>`).join('');
    const w = colW * hours.length;
    $('#strip').innerHTML =
      `<svg class="strip-svg" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" aria-hidden="true">` +
      sky + bars + `<path class="temp-line" d="${path}"/>` + dots + text + '</svg>';
  }

  function renderTable(hours, today) {
    const windUnit = state.units === 'f' ? 'mph' : 'km/h';
    let rows = '', lastDay = null;
    hours.forEach((h, i) => {
      const day = h.time.slice(0, 10);
      const extra = i >= 24 ? ' is-extra' : '';
      if (day !== lastDay) {
        rows += `<tr class="day-row${extra}"><th colspan="8" scope="colgroup">${dayLabel(day, today)}</th></tr>`;
        lastDay = day;
      }
      if (i === 12) {
        rows += '<tr class="ad-row"><td colspan="8"><aside class="ad" aria-label="Advertisement">' +
          '<span class="ad-label">Advertisement</span>' +
          '<div class="ad-slot" data-ad="inTable" data-size="728x90" data-format="horizontal"></div></aside></td></tr>';
      }
      const [text, kind] = describe(h.code);
      rows += `<tr class="hour-row${extra}">` +
        `<th scope="row">${i === 0 ? 'Now' : hourLabel(h.time)}</th>` +
        `<td><span class="cond">${iconSvg(kind, h.isDay)}<span>${text}</span></span></td>` +
        `<td class="num temp">${deg(h.temp)}</td>` +
        `<td class="num">${deg(h.feels)}</td>` +
        `<td class="num"><span class="pop-cell"><span class="pop-meter" style="--p:${h.pop}%"></span>${h.pop}%</span></td>` +
        `<td class="num"><span class="wind-cell"><svg class="wind-arrow" style="transform:rotate(${h.dir + 180}deg)" aria-hidden="true"><use href="#i-arrow"/></svg>` +
        `${Math.round(h.wind)} ${windUnit} <span class="muted">${compass(h.dir)}</span></span></td>` +
        `<td class="num">${h.rh}%</td>` +
        `<td class="num">${Math.round(h.uv)}</td></tr>`;
    });
    const body = $('#hourly-body');
    body.innerHTML = rows;
    window.Ads && window.Ads.renderAll(body);
  }

  function renderDaily(d, today) {
    const dl = d.daily;
    const lo = Math.min(...dl.temperature_2m_min), hi = Math.max(...dl.temperature_2m_max), span = hi - lo || 1;
    $('#daily-list').innerHTML = dl.time.map((day, i) => {
      const [text, kind] = describe(dl.weather_code[i]);
      const left = (dl.temperature_2m_min[i] - lo) / span * 100;
      const right = (hi - dl.temperature_2m_max[i]) / span * 100;
      return `<li class="day">` +
        `<span class="day-name">${dayLabel(day, today)}</span>` +
        `<span class="day-cond">${iconSvg(kind, true)}<span class="visually-hidden">${text}</span></span>` +
        `<span class="day-pop">${dl.precipitation_probability_max[i] ?? 0}%<span class="visually-hidden"> chance of precipitation</span></span>` +
        `<span class="day-lo"><span class="visually-hidden">Low </span>${deg(dl.temperature_2m_min[i])}</span>` +
        `<span class="day-range" aria-hidden="true"><span style="left:${left}%;right:${right}%"></span></span>` +
        `<span class="day-hi"><span class="visually-hidden">High </span>${deg(dl.temperature_2m_max[i])}</span>` +
        `</li>`;
    }).join('');
  }

  function render() {
    const d = state.data;
    const today = d.current.time.slice(0, 10);
    const hours = upcomingHours(d, 48);
    renderNow(d, hours);
    renderStrip(hours, today);
    renderTable(hours, today);
    renderDaily(d, today);
  }

  // ---------- status & loading ----------
  function setStatus(message) {
    const el = $('#status');
    el.hidden = !message;
    $('#status-text').textContent = message || '';
  }

  async function load() {
    document.body.classList.add('is-loading');
    setStatus('');
    try {
      state.data = await fetchForecast(state.place, state.units);
      render();
    } catch (e) {
      setStatus("The forecast didn't load. Check your connection, then try again.");
    } finally {
      document.body.classList.remove('is-loading');
    }
  }

  function setPlace(place) {
    state.place = place;
    store.set('place', place);
    const q = new URLSearchParams({ name: place.name, lat: place.lat.toFixed(4), lon: place.lon.toFixed(4) });
    if (place.region) q.set('region', place.region);
    if (place.country) q.set('country', place.country);
    history.replaceState(null, '', '?' + q);
    load();
  }

  // ---------- place search ----------
  const input = $('#place-input');
  const list = $('#place-results');
  let results = [], active = -1, timer, latestQuery = '';

  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  }

  function renderList(message) {
    list.innerHTML = message
      ? `<li class="search-msg" role="presentation">${message}</li>`
      : results.map((r, i) =>
          `<li id="place-opt-${i}" role="option" aria-selected="${i === active}" data-i="${i}">` +
          `<strong>${esc(r.name)}</strong> <span class="muted">${esc(placeLabel(r))}</span></li>`).join('');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', 'place-opt-' + active);
    else input.removeAttribute('aria-activedescendant');
  }

  async function search(q) {
    latestQuery = q;
    const p = new URLSearchParams({ name: q, count: 6, language: 'en', format: 'json' });
    if (cfg.apiKey) p.set('apikey', cfg.apiKey);
    try {
      const res = await fetch(cfg.geocodeUrl + '?' + p);
      const json = await res.json();
      if (q !== latestQuery) return;
      results = (json.results || []).map(r => ({
        name: r.name, region: r.admin1 || '', country: r.country || '', lat: r.latitude, lon: r.longitude
      }));
      active = results.length ? 0 : -1;
      renderList(results.length ? null : `No places match “${esc(q)}”. Check the spelling or try a nearby city.`);
    } catch (e) {
      results = [];
      renderList('Search is unavailable right now. Try again in a moment.');
    }
  }

  function choose(i) {
    const r = results[i];
    if (!r) return;
    input.value = '';
    closeList();
    input.blur();
    setPlace(r);
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { closeList(); return; }
    timer = setTimeout(() => search(q), 250);
  });

  input.addEventListener('keydown', e => {
    if (list.hidden || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % results.length; renderList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % results.length; renderList(); }
    else if (e.key === 'Escape') closeList();
  });

  input.addEventListener('blur', () => setTimeout(closeList, 150));

  list.addEventListener('mousedown', e => {
    const li = e.target.closest('[data-i]');
    if (li) { e.preventDefault(); choose(Number(li.dataset.i)); }
  });

  $('#search-form').addEventListener('submit', e => {
    e.preventDefault();
    if (results.length && !list.hidden) choose(Math.max(active, 0));
    else if (input.value.trim().length >= 2) search(input.value.trim());
  });

  // ---------- controls ----------
  $('#locate').addEventListener('click', () => {
    if (!navigator.geolocation) { setStatus("This browser can't share its location. Search for a city instead."); return; }
    const btn = $('#locate');
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(pos => {
      btn.disabled = false;
      setPlace({ name: 'Your location', region: '', country: '', lat: pos.coords.latitude, lon: pos.coords.longitude });
    }, () => {
      btn.disabled = false;
      setStatus('Location access was blocked. Allow it in your browser settings, or search for a city instead.');
    }, { timeout: 10000, maximumAge: 600000 });
  });

  document.querySelectorAll('[data-units]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.units === state.units));
    btn.addEventListener('click', () => {
      if (btn.dataset.units === state.units) return;
      state.units = btn.dataset.units;
      store.set('units', state.units);
      document.querySelectorAll('[data-units]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      load();
    });
  });

  $('#show-more').addEventListener('click', e => {
    const expanded = document.body.classList.toggle('show-all-hours');
    e.currentTarget.textContent = expanded ? 'Show the next 24 hours only' : 'Show 48 hours';
    e.currentTarget.setAttribute('aria-expanded', String(expanded));
  });

  $('#retry').addEventListener('click', load);

  load();
})();
