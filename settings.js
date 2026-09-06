let settingsToastTimer;

function showSettingsToast(message, type = "success") {

    let toast = document.getElementById("toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }

    const icon = type === "error" ? "⚠" : "✔";

    toast.textContent = `${icon} ${message}`;
    toast.className = `toast toast-${type}`;

    requestAnimationFrame(() => {
        toast.classList.add("is-visible");
    });

    clearTimeout(settingsToastTimer);
    settingsToastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 2000);
}

document.addEventListener("DOMContentLoaded", async () => {

    await renderRegionCitySettings("settingsCityList");

    document.getElementById("saveSettingsRegionBtn").addEventListener("click", () => {

        try {
            const checkedCities =
                getCheckedCitiesFromContainer("settingsCityList");

            if (checkedCities.length === 0) {
                showSettingsToast("地域を1つ以上選択してください", "error");
                return;
            }

            saveSelectedCities(checkedCities);
            showSettingsToast("保存しました");
        } catch (error) {
            console.error(error);
            showSettingsToast("保存できませんでした", "error");
        }

    });

});
