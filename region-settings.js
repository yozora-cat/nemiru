(function () {

    const supabaseUrl = "https://kbrrfilzdqshlimsgkdy.supabase.co";
    const supabaseKey = "sb_publishable_ByrFySYSPpOZPz7DEuNNHw_9LkM6IQj";
    const regionDb = window.supabase.createClient(supabaseUrl, supabaseKey);

    function getSelectedCities() {

        try {
            const stored = JSON.parse(localStorage.getItem("selectedCities"));

            if (Array.isArray(stored) && stored.length > 0) {
                return stored;
            }
        } catch (error) {
            console.error(error);
        }

        const legacyCity = localStorage.getItem("city");

        return legacyCity ? [legacyCity] : [];
    }

    function saveSelectedCities(cities) {

        localStorage.setItem("selectedCities", JSON.stringify(cities));
    }

    function hasRegionSettings() {

        return getSelectedCities().length > 0;
    }

    async function loadAllCities() {

        const { data, error } = await regionDb
            .from("store_master")
            .select("city")
            .order("city");

        if (error) {
            console.error(error);
            return [];
        }

        return [...new Set(data.map(row => row.city).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "ja"));
    }

    function renderCityCheckboxes(containerId, cities, selectedCities) {

        const container = document.getElementById(containerId);

        if (!container) return;

        container.innerHTML = "";

        cities.forEach(city => {

            const label = document.createElement("label");
            label.className = "city-checkbox-item";

            const input = document.createElement("input");
            input.type = "checkbox";
            input.value = city;
            input.checked = selectedCities.includes(city);

            label.appendChild(input);
            label.appendChild(document.createTextNode(` ${city}`));
            container.appendChild(label);

        });
    }

    async function renderRegionCitySettings(containerId) {

        const cities = await loadAllCities();
        const selectedCities = getSelectedCities();

        renderCityCheckboxes(containerId, cities, selectedCities);
    }

    function getCheckedCitiesFromContainer(containerId) {

        const container = document.getElementById(containerId);

        if (!container) return [];

        return [...container.querySelectorAll('input[type="checkbox"]:checked')]
            .map(checkbox => checkbox.value);
    }

    window.getSelectedCities = getSelectedCities;
    window.saveSelectedCities = saveSelectedCities;
    window.hasRegionSettings = hasRegionSettings;
    window.renderRegionCitySettings = renderRegionCitySettings;
    window.getCheckedCitiesFromContainer = getCheckedCitiesFromContainer;

})();
