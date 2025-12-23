// API Configuration
const API_KEY = '9fd7a449d055dba26a982a3220f32aa2';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const weatherInfoDiv = document.getElementById('weather-info');
const errorMessageDiv = document.getElementById('error-message');
const loadingDiv = document.querySelector('.loading');
const searchBtnText = document.getElementById('search-btn-text');
const suggestionsDropdown = document.getElementById('city-suggestions');
const cityTags = document.querySelectorAll('.city-tag');

// Recent searches storage
const RECENT_SEARCHES_KEY = 'weatherAppRecentSearches';
let recentSearches = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)) || [];

// Initialize
function init() {
    checkScreenWidth();
    setupEventListeners();
    loadRecentSearches();
    getWeatherData('Jakarta'); // Default city
}

function checkScreenWidth() {
    if (window.innerWidth >= 768) {
        searchBtnText.style.display = 'inline';
    } else {
        searchBtnText.style.display = 'none';
    }
}

// Recent Searches Functions
function loadRecentSearches() {
    // Create recent searches section if it doesn't exist
    let recentSection = document.querySelector('.recent-searches');
    if (!recentSection) {
        recentSection = document.createElement('div');
        recentSection.className = 'recent-searches hidden';
        recentSection.innerHTML = `
            <div class="recent-title">
                <span>Recent Searches:</span>
                <button class="clear-recent">Clear All</button>
            </div>
            <div class="recent-list"></div>
        `;
        document.querySelector('.search-section').appendChild(recentSection);
        
        // Add clear recent button event
        recentSection.querySelector('.clear-recent').addEventListener('click', clearRecentSearches);
    }
    
    updateRecentSearchesDisplay();
}

function updateRecentSearchesDisplay() {
    const recentSection = document.querySelector('.recent-searches');
    const recentList = document.querySelector('.recent-list');
    
    if (recentSearches.length === 0) {
        recentSection.classList.add('hidden');
        return;
    }
    
    recentSection.classList.remove('hidden');
    
    // Show only last 5 searches
    const recentToShow = recentSearches.slice(-5).reverse();
    
    recentList.innerHTML = recentToShow.map(city => `
        <div class="recent-item" data-city="${city}">
            <i class="fas fa-history"></i>
            ${city}
        </div>
    `).join('');
    
    // Add click events to recent items
    document.querySelectorAll('.recent-item').forEach(item => {
        item.addEventListener('click', () => {
            const city = item.getAttribute('data-city');
            cityInput.value = city;
            getWeatherData(city);
            hideSuggestions();
        });
    });
}

function addToRecentSearches(cityName) {
    // Remove if already exists
    recentSearches = recentSearches.filter(city => city.toLowerCase() !== cityName.toLowerCase());
    
    // Add to the end
    recentSearches.push(cityName);
    
    // Keep only last 10 searches
    if (recentSearches.length > 10) {
        recentSearches = recentSearches.slice(-10);
    }
    
    // Save to localStorage
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
    
    // Update display
    updateRecentSearchesDisplay();
}

function clearRecentSearches() {
    recentSearches = [];
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    updateRecentSearchesDisplay();
}

// Autocomplete Functions
function searchCities(query) {
    if (!query || query.length < 2) {
        hideSuggestions();
        return;
    }
    
    const searchTerm = query.toLowerCase();
    const results = citiesDatabase.filter(city => 
        city.name.toLowerCase().includes(searchTerm) ||
        city.country.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results
    
    displaySuggestions(results);
}

function displaySuggestions(cities) {
    if (cities.length === 0) {
        hideSuggestions();
        return;
    }
    
    suggestionsDropdown.innerHTML = cities.map(city => `
        <div class="suggestion-item" data-city="${city.name}">
            <i class="fas fa-city"></i>
            <div>
                <div class="suggestion-name">${city.name}</div>
            </div>
            <div class="suggestion-country">${city.country}</div>
        </div>
    `).join('');
    
    suggestionsDropdown.classList.remove('hidden');
    
    // Add click events to suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const city = item.getAttribute('data-city');
            cityInput.value = city;
            getWeatherData(city);
            hideSuggestions();
        });
    });
}

function hideSuggestions() {
    suggestionsDropdown.classList.add('hidden');
}

// Setup Event Listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', checkScreenWidth);
    
    // Search button
    searchBtn.addEventListener('click', () => {
        const city = cityInput.value.trim();
        if (city) {
            getWeatherData(city);
            if (window.innerWidth < 768) {
                cityInput.blur();
            }
        } else {
            showError('Please enter a city name.');
        }
    });
    
    // Location button
    locationBtn.addEventListener('click', getLocation);
    
    // Enter key in input
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = cityInput.value.trim();
            if (city) {
                getWeatherData(city);
                if (window.innerWidth < 768) {
                    cityInput.blur();
                }
            } else {
                showError('Please enter a city name.');
            }
        }
    });
    
    // Input for autocomplete
    cityInput.addEventListener('input', (e) => {
        const query = e.target.value;
        searchCities(query);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
            hideSuggestions();
        }
    });
    
    // Popular city tags
    cityTags.forEach(tag => {
        tag.addEventListener('click', () => {
            const city = tag.getAttribute('data-city');
            cityInput.value = city;
            getWeatherData(city);
            hideSuggestions();
        });
    });
    
    // Touch improvements for mobile
    cityInput.addEventListener('touchstart', () => {
        cityInput.focus();
    });
    
    // Close suggestions on scroll (mobile)
    window.addEventListener('scroll', hideSuggestions);
}

// Weather Functions
function showLoading() {
    weatherInfoDiv.innerHTML = '';
    weatherInfoDiv.appendChild(loadingDiv);
    loadingDiv.classList.remove('hidden');
    errorMessageDiv.classList.add('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function getWindDirection(deg) {
    const directions = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"];
    return directions[Math.round(deg / 45) % 8];
}

function formatDateTime(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);
    const options = {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    };
    return new Intl.DateTimeFormat("en-US", options).format(date);
}

async function getWeatherData(city) {
    showLoading();
    try {
        // Add a small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const weatherRes = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric&lang=en`
        );
        if (!weatherRes.ok) throw new Error("City not found. Please check the spelling.");
        const weatherData = await weatherRes.json();

        const forecastRes = await fetch(
            `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric&lang=en`
        );
        if (!forecastRes.ok) throw new Error("Forecast data unavailable");
        const forecastData = await forecastRes.json();

        displayWeatherData(weatherData, forecastData);
        addToRecentSearches(city);
        errorMessageDiv.classList.add('hidden');
    } catch (error) {
        showError(error.message);
    }
}

function displayWeatherData(data, forecastData) {
    const { name, main, weather, wind, sys, visibility, dt, timezone } = data;
    const temp = Math.round(main.temp);
    const feelsLike = Math.round(main.feels_like);
    const description = weather[0].description;
    const iconCode = weather[0].icon;
    const humidity = main.humidity;
    const pressure = main.pressure;
    const windSpeed = (wind.speed * 3.6).toFixed(1);
    const country = sys.country;
    const vis = (visibility / 1000).toFixed(1);
    const tempMin = Math.round(main.temp_min);
    const tempMax = Math.round(main.temp_max);
    const windDirection = getWindDirection(wind.deg);

    const dateTime = formatDateTime(dt, timezone);

    // Get next 5 days forecast (at 12:00 PM)
    const dailyForecast = forecastData.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);

    const weatherHTML = `
        <div class="weather-content fade-in">
            <div class="current-weather">
                <div class="city-name">${name}, ${country}</div>
                <div class="date-time">${dateTime}</div>
                <img src="https://openweathermap.org/img/wn/${iconCode}@4x.png" alt="Weather Icon" class="weather-icon">
                <div class="temperature">${temp}°C</div>
                <div class="description">${description}</div>
                <div class="temp-range">Min: ${tempMin}°C / Max: ${tempMax}°C</div>
            </div>
            
            <div class="weather-details">
                <h2>Weather Details</h2>
                <div class="details-grid">
                    <div class="detail-card">
                        <div class="detail-icon"><i class="fas fa-temperature-high"></i></div>
                        <div class="detail-title">Feels Like</div>
                        <div class="detail-value">${feelsLike}°C</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-icon"><i class="fas fa-tint"></i></div>
                        <div class="detail-title">Humidity</div>
                        <div class="detail-value">${humidity}%</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-icon"><i class="fas fa-compress-alt"></i></div>
                        <div class="detail-title">Pressure</div>
                        <div class="detail-value">${pressure} hPa</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-icon"><i class="fas fa-wind"></i></div>
                        <div class="detail-title">Wind Speed</div>
                        <div class="detail-value">${windSpeed} km/h</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-icon"><i class="fas fa-compass"></i></div>
                        <div class="detail-title">Wind Direction</div>
                        <div class="detail-value">${windDirection}</div>
                    </div>
                    
                    <div class="detail-card">
                        <div class="detail-icon"><i class="fas fa-eye"></i></div>
                        <div class="detail-title">Visibility</div>
                        <div class="detail-value">${vis} km</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="forecast fade-in">
            <h3 class="forecast-title">5-Day Forecast</h3>
            <div class="forecast-cards">
                ${dailyForecast.map(day => {
                    const dayDate = new Date(day.dt * 1000);
                    const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
                    const dayNumber = dayDate.getDate();
                    const month = dayDate.toLocaleDateString("en-US", { month: "short" });
                    
                    return `
                    <div class="forecast-card">
                        <div class="forecast-day">${dayName}<br><small>${dayNumber} ${month}</small></div>
                        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="Weather" class="forecast-icon">
                        <div class="forecast-temp">${Math.round(day.main.temp)}°C</div>
                        <div class="forecast-desc">${day.weather[0].description}</div>
                    </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    weatherInfoDiv.innerHTML = weatherHTML;
}

function showError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
    hideLoading();
    
    // Auto-hide error after 5 seconds
    setTimeout(() => {
        errorMessageDiv.classList.add('hidden');
    }, 5000);
}

function getLocation() {
    if (navigator.geolocation) {
        // Show loading state
        searchBtn.disabled = true;
        locationBtn.disabled = true;
        locationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        navigator.geolocation.getCurrentPosition(
            async position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                showLoading();
                try {
                    const weatherRes = await fetch(
                        `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`
                    );
                    const weatherData = await weatherRes.json();

                    const forecastRes = await fetch(
                        `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=en`
                    );
                    const forecastData = await forecastRes.json();

                    displayWeatherData(weatherData, forecastData);
                    cityInput.value = weatherData.name;
                    addToRecentSearches(weatherData.name);
                } catch (error) {
                    showError("Failed to fetch location data. Please try again.");
                } finally {
                    searchBtn.disabled = false;
                    locationBtn.disabled = false;
                    locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                }
            },
            error => {
                showError('Location access denied. Please search for a city manually.');
                searchBtn.disabled = false;
                locationBtn.disabled = false;
                locationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
            }
        );
    } else {
        showError('Your browser does not support geolocation.');
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);