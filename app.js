const apiKey = "07c4bf3cd562e25d778b92191cc918f6"; // ganti dengan API key dari https://home.openweathermap.org/api_keys
const favoritesKey = "weatherFavorites";
const themeKey = "weatherTheme"; // Soal 4
const unitKey = "weatherUnit";   // Soal 3 (bonus: preferensi unit juga disimpan)

// Simpan data terakhir agar bisa di-render ulang saat unit diganti (Soal 3)
let lastCurrent = null;
let lastForecast = null;
let errorModal;

$(document).ready(function () {
  errorModal = new bootstrap.Modal(document.getElementById("errorModal"));

  // Load preferensi & favorites on start
  applyTheme(localStorage.getItem(themeKey) || "light");
  $("#unitToggle").prop("checked", localStorage.getItem(unitKey) === "F");
  updateUnitLabel();
  loadFavorites();

  $("#searchForm").on("submit", function (e) {
    e.preventDefault();

    const city = $("#cityInput").val().trim();

    // Soal 1a: nama kota kosong
    if (!city) {
      showError("Nama kota tidak boleh kosong. Silakan masukkan nama kota.");
      return;
    }

    fetchWeather(city);
  });

  // Klik item favorit -> tampilkan cuaca
  $("#favorites").on("click", "li", function () {
    fetchWeather($(this).data("city"));
  });

  // Soal 2b: klik tombol X -> hapus dari localStorage & perbarui daftar
  $("#favorites").on("click", ".btn-remove", function (e) {
    e.stopPropagation(); // supaya tidak ikut memicu klik pada <li>
    removeFavorite($(this).closest("li").data("city"));
  });

  // Soal 3: switch Celsius / Fahrenheit
  $("#unitToggle").on("change", function () {
    localStorage.setItem(unitKey, isFahrenheit() ? "F" : "C");
    updateUnitLabel();
    if (lastCurrent) displayCurrent(lastCurrent);
    if (lastForecast) displayForecast(lastForecast);
  });

  // Soal 4: toggle dark mode
  $("#themeToggle").on("click", function () {
    const current = $("html").attr("data-bs-theme");
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(themeKey, next);
  });
});

function fetchWeather(city) {
  const q = encodeURIComponent(city);

  // Jalankan kedua request bersamaan; jika salah satu gagal, tampilkan satu modal error
  $.when(
    $.getJSON(`https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${apiKey}&units=metric`),
    $.getJSON(`https://api.openweathermap.org/data/2.5/forecast?q=${q}&appid=${apiKey}&units=metric`)
  )
    .done(function (currentRes, forecastRes) {
      lastCurrent = currentRes[0];
      lastForecast = forecastRes[0].list;

      displayCurrent(lastCurrent);
      displayForecast(lastForecast);
      addFavorite(city);
    })
    // Soal 1b: API mengembalikan 404 atau error lainnya
    .fail(function (xhr) {
      let message;

      if (xhr.status === 404) {
        message = `Kota "<strong>${escapeHtml(city)}</strong>" tidak ditemukan. Periksa kembali ejaan nama kota.`;
      } else if (xhr.status === 401) {
        message = "API key tidak valid atau belum aktif. Periksa API key Anda di OpenWeatherMap.";
      } else if (xhr.status === 0) {
        message = "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else {
        const apiMsg = xhr.responseJSON && xhr.responseJSON.message ? ` (${escapeHtml(xhr.responseJSON.message)})` : "";
        message = `Terjadi kesalahan saat mengambil data cuaca. Status: ${xhr.status}${apiMsg}`;
      }

      showError(message);
    });
}

function displayCurrent(data) {
  $("#currentWeather").html(`
    <div class="card p-3 shadow-sm">
      <h3>${data.name}</h3>
      <p>${data.weather[0].description}</p>
      <h2>${formatTemp(data.main.temp)}</h2>
      <p>Humidity: ${data.main.humidity}% | Wind: ${data.wind.speed} m/s</p>
    </div>`);
}

function displayForecast(list) {
  // pick one data point per day (every 8*3h = 24h)
  const days = list.filter((_, i) => i % 8 === 0).slice(0, 5);

  let html = "";

  days.forEach((d) => {
    const date = new Date(d.dt_txt).toLocaleDateString();
    html += `
      <div class="col-md forecast-card">
        <div class="card p-2 text-center">
          <h6>${date}</h6>
          <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}.png" alt="${d.weather[0].description}">
          <p>${formatTemp(d.main.temp)}</p>
        </div>
      </div>`;
  });

  $("#forecast").html(html);
}

/* ---------- Favorites ---------- */

function getFavorites() {
  return JSON.parse(localStorage.getItem(favoritesKey) || "[]");
}

function addFavorite(city) {
  let favs = getFavorites();
  if (!favs.includes(city)) {
    favs.push(city);
    localStorage.setItem(favoritesKey, JSON.stringify(favs));
    loadFavorites();
  }
}

// Soal 2b
function removeFavorite(city) {
  const favs = getFavorites().filter((c) => c !== city);
  localStorage.setItem(favoritesKey, JSON.stringify(favs));
  loadFavorites();
}

// Soal 2a: setiap item favorit punya tombol X
function loadFavorites() {
  const favs = getFavorites();

  const html = favs
    .map(
      (c) => `
      <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
          data-city="${escapeHtml(c)}" role="button">
        <span>${escapeHtml(c)}</span>
        <button type="button" class="btn btn-sm btn-outline-danger btn-remove" title="Hapus ${escapeHtml(c)}">X</button>
      </li>`
    )
    .join("");

  $("#favorites").html(html);
}

/* ---------- Helpers ---------- */

// Soal 1: tampilkan pesan error di Bootstrap modal
function showError(message) {
  $("#errorModalBody").html(message);
  errorModal.show();
}

// Soal 3: konversi suhu (data API selalu dalam Celsius / metric)
function isFahrenheit() {
  return $("#unitToggle").is(":checked");
}

function formatTemp(celsius) {
  return isFahrenheit()
    ? `${(celsius * 9 / 5 + 32).toFixed(1)} °F`
    : `${celsius.toFixed(1)} °C`;
}

function updateUnitLabel() {
  $("#unitLabel").text(isFahrenheit() ? "°F" : "°C");
}

// Soal 4: terapkan tema menggunakan fitur color mode Bootstrap 5.3
function applyTheme(theme) {
  $("html").attr("data-bs-theme", theme);
  $("#themeToggle").text(theme === "dark" ? "☀️ Light" : "🌙 Dark");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
