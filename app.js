// Konfiguracija
const GEO_API_KEY = "a3d5c1a3177349d982c5d7c63f10a7a0"; // Zamijenite sa pravim ključem
const ALADHAN_API_URL = "https://api.aladhan.com/v1/timingsByCity";

// Globalne varijable
let currentCity = "Sarajevo";
let currentCountry = "Bosnia";
let maghribTime = null;
let timerInterval = null;

// Audio objekti
const audio = {
    ilahije: null,
    ezan: null
};

// Inicijalizacija aplikacije
document.addEventListener('DOMContentLoaded', () => {
    // Audio kontrola
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('startButton').textContent = 'Učitavanje...';
        initializeAudio();
        document.getElementById('startButton').style.display = 'none';
        document.querySelector('.audio-controls').style.display = 'block';
    });

    // Pretraga gradova
    const citySearch = document.getElementById('citySearch');
    let debounceTimer;

    citySearch.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const query = e.target.value.trim();
            if (query.length < 3) {
                hideResults();
                return;
            }
            
            const cities = await searchCities(query);
            showResults(cities);
        }, 300);
    });

    // Odabir grada
    document.getElementById('cityResults').addEventListener('click', (e) => {
        if (e.target.classList.contains('city-item')) {
            const city = e.target.dataset.city;
            const country = e.target.dataset.country;
            
            currentCity = city;
            currentCountry = country;
            citySearch.value = `${city}, ${country}`;
            hideResults();
            getPrayerTimes();
        }
    });

    // Inicijalno vrijeme
    getPrayerTimes();
});

// Geoapify API poziv
async function searchCities(query) {
    try {
        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&type=city&apiKey=${GEO_API_KEY}`
        );
        const data = await response.json();
        return data.features || [];
    } catch (error) {
        console.error("Greška pri pretrazi gradova:", error);
        return [];
    }
}

// Audio sistem
function initializeAudio() {
    // Inicijaliziraj ilahije i odmah ih pusti
    audio.ilahije = new Howl({
        src: ['audio/ilahije.mp3'],
        loop: true,
        volume: 1,
        html5: true, // Poboljšana kompatibilnost
        onload: function() {
            this.play(); // Automatsko puštanje nakon učitavanja
            document.getElementById('playPauseBtn').textContent = '⏸';
        }
    });

    audio.ezan = new Howl({
        src: ['audio/ezan.mp3'],
        volume: 1,
        html5: true
    });

    // Kontrole
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        if (audio.ilahije.playing()) {
            audio.ilahije.pause();
            document.getElementById('playPauseBtn').textContent = '▶';
        } else {
            audio.ilahije.play();
            document.getElementById('playPauseBtn').textContent = '⏸';
        }
    });

    document.getElementById('volumeSlider').addEventListener('input', (e) => {
        audio.ilahije.volume(e.target.value);
    });
}

// Dohvat vremena iftara
async function getPrayerTimes() {
    try {
        const response = await fetch(
            `${ALADHAN_API_URL}?city=${currentCity}&country=${currentCountry}&method=4`
        );
        const data = await response.json();
        
        if (data.data && data.data.timings.Maghrib) {
            maghribTime = data.data.timings.Maghrib;
            startTimer();
        } else {
            console.error("API nije vratio ispravne podatke");
        }
    } catch (error) {
        console.error('Greška pri dohvatu vremena:', error);
    }
}

// Timer logika
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const now = new Date();
        const [hours, minutes] = maghribTime.split(':');
        const targetTime = new Date(now);
        
        targetTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        if (now > targetTime) {
            targetTime.setDate(targetTime.getDate() + 1);
        }

        const diff = targetTime - now;
        const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secondsRemaining = Math.floor((diff % (1000 * 60)) / 1000);

        document.getElementById('timer').textContent = 
            `${String(hoursRemaining).padStart(2, '0')}:` +
            `${String(minutesRemaining).padStart(2, '0')}:` +
            `${String(secondsRemaining).padStart(2, '0')}`;

        if (hoursRemaining === 0 && minutesRemaining === 0 && secondsRemaining === 0) {
            audio.ilahije.pause();
            audio.ezan.play();
        }
    }, 1000);
}

// Prikaz rezultata pretrage
function showResults(cities) {
    const resultsContainer = document.getElementById('cityResults');
    resultsContainer.innerHTML = cities
        .filter(city => city.properties.country && city.properties.city)
        .map(city => `
            <div class="city-item" 
                 data-city="${city.properties.city}"
                 data-country="${city.properties.country}">
                ${city.properties.city}, ${city.properties.country}
            </div>
        `).join('');
    
    resultsContainer.style.display = 'block';
}

function hideResults() {
    document.getElementById('cityResults').style.display = 'none';
}
