const supabaseUrl = 'https://kbrrfilzdqshlimsgkdy.supabase.co'
const supabaseKey = "sb_publishable_ByrFySYSPpOZPz7DEuNNHw_9LkM6IQj"
const db = window.supabase.createClient(supabaseUrl, supabaseKey)
let products = [];
let toastTimer;

function showToast(message, type = "success") {

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

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 2000);
}

async function loadProducts() {

    const { data, error } = await db
        .from("product_master")
        .select("*")
        .order("product_name");

    if (error) {
        console.error(error);
        return;
    }

    products = data;

    console.log(data);
    console.log(data.length);

    console.log("商品マスター読込完了");
    console.log(products[0]);

    populateSearchCategories();
}

function populateSearchCategories() {

    const select = document.getElementById("searchCategory");

    if (!select) return;

    const categories = [...new Set(
        products
            .map(product => product.minor_category)
            .filter(category => category)
    )].sort();

    select.innerHTML = '<option value="">すべて</option>';

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function productMatchesSearch(product, searchWord) {

    if (normalizeText(product.product_name).includes(searchWord)) {
        return true;
    }

    if (!product.search_keywords) {
        return false;
    }

    return product.search_keywords
        .split(",")
        .map(keyword => normalizeText(keyword.trim()))
        .some(keyword =>
            keyword.includes(searchWord) ||
            searchWord.includes(keyword)
        );
}

const INITIAL_RESULT_HTML = `
        <div class="card-header">
            <span class="card-icon">📊</span>
            <h2>検索結果</h2>
        </div>
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <p>商品名を入力して検索してください</p>
        </div>`;

const INITIAL_RANKING_HTML = `
        <div class="card-header">
            <span class="card-icon">🏪</span>
            <h2>店舗ランキング</h2>
        </div>
        <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>商品を検索すると店舗別の最安値が表示されます</p>
        </div>`;

function resetSearchResults() {

    document.getElementById("result").innerHTML = INITIAL_RESULT_HTML;
    document.getElementById("ranking").innerHTML = INITIAL_RANKING_HTML;
}

function clearSearch() {

    document.getElementById("productName").value = "";
    document.getElementById("searchCategory").value = "";

    resetSearchResults();
}

function renderProductSearchResults(matches) {

    const resultEl = document.getElementById("result");

    if (matches.length === 0) {
        resultEl.innerHTML = `
<div class="card-header">
    <span class="card-icon">🔍</span>
    <h2>検索結果</h2>
</div>
<div class="empty-state">
    <div class="empty-state-icon">🔍</div>
    <p>該当する商品が見つかりません</p>
</div>`;
        document.getElementById("ranking").innerHTML = INITIAL_RANKING_HTML;
        return;
    }

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
    <span class="card-icon">🔍</span>
    <h2>検索結果（${matches.length}件）</h2>`;

    const list = document.createElement("div");
    list.className = "product-search-list";

    matches.forEach(product => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "product-search-item";

        const name = document.createElement("span");
        name.className = "product-search-name";
        name.textContent = product.product_name;

        item.appendChild(name);

        if (product.minor_category) {
            const category = document.createElement("span");
            category.className = "product-search-category";
            category.textContent = product.minor_category;
            item.appendChild(category);
        }

        item.onclick = () => selectSearchProduct(product.product_name);
        list.appendChild(item);
    });

    resultEl.innerHTML = "";
    resultEl.appendChild(header);
    resultEl.appendChild(list);
    document.getElementById("ranking").innerHTML = INITIAL_RANKING_HTML;
}

async function selectSearchProduct(productName) {

    document.getElementById("newProduct").value = productName;
    await showProductDetail(productName);
}

async function searchProduct() {

    const keyword =
        document.getElementById("productName").value.trim();

    const category =
        document.getElementById("searchCategory").value;

    if (!keyword && !category) {
        showToast("商品名を入力するか、カテゴリーを選択してください", "error");
        return;
    }

    console.log("検索:", keyword, "カテゴリー:", category || "すべて");

    const searchWord = keyword ? normalizeText(keyword) : "";

    const matches = products.filter(product => {
        if (category && product.minor_category !== category) {
            return false;
        }

        if (!keyword) {
            return true;
        }

        return productMatchesSearch(product, searchWord);
    });

    renderProductSearchResults(matches);
}

async function showProductDetail(name) {

    console.log("商品詳細:", name);

    const { data, error } = await db
        .from("product_master")
        .select("*")
        .eq("product_name", name);
    console.log("全件取得:", data);
    console.log("検索文字:", name);
    console.log("Supabase結果:", data);
    console.log("Supabaseエラー:", error);

    if (error) {
    showToast("検索できませんでした", "error");
    console.log(error);
    return;
    }

    if (data.length === 0) {
    showToast("商品が見つかりません", "error");
    return;
    }

    const product = data[0];

    const priceData = await loadPrices(name);
    const stats = calculatePriceStats(priceData);
    const currentPriceLabel = stats.count > 0
        ? `現在価格（${formatMonthDay(stats.latestCreatedAt)}）`
        : "現在価格";
    const lowestPriceLabel = stats.count > 0
        ? `最安値（${formatMonthDay(stats.lowestCreatedAt)}）`
        : "最安値";
    const lowestPriceText = stats.count > 0 ? `${stats.lowestPrice}円` : "データなし";
    const averagePriceText = stats.count > 0 ? `${stats.averagePrice}円` : "データなし";
    const currentPriceText =
     stats.count > 0
        ? `${stats.latestPrice}円`
        : "価格データなし";
let score = 0;

if (stats.count > 0) {
    score = Math.round(
        (stats.lowestPrice / stats.latestPrice) * 100
    );
}

let judgement = "";
let badgeClass = "badge-bad";

if (score >= 95) {
    judgement = "今が買い時！";
    badgeClass = "badge-good";
}
else if (score >= 80) {
    judgement = "普通の価格帯";
    badgeClass = "badge-warn";
}
else {
    judgement = "まだ高め";
    badgeClass = "badge-bad";
}

document.getElementById("result").innerHTML = `
<div class="card-header">
    <span class="card-icon">📦</span>
    <h2>${product.product_name}</h2>
</div>

<div class="current-price">
    <span class="stat-label">${currentPriceLabel}</span>
    <span class="price-large">${currentPriceText}</span>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-label">${lowestPriceLabel}</div>
        <div class="stat-value">${lowestPriceText}</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">平均価格</div>
        <div class="stat-value">${averagePriceText}</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">投稿件数</div>
        <div class="stat-value">${stats.count}件</div>
    </div>
</div>

<div class="score-section">
    <div class="score-header">
        <span>買い時スコア</span>
        <span class="score-value">${score}点</span>
    </div>
    <div class="score-bar">
        <div class="score-fill" style="width:${score}%"></div>
    </div>
    <span class="badge ${badgeClass}">${judgement}</span>
</div>
${product.affiliate_url ? `
<div class="amazon-card">
    <div class="amazon-card-title">
        Amazonで購入
    </div>

    <a
        href="${product.affiliate_url}"
        target="_blank"
        rel="nofollow sponsored noopener"
        class="amazon-button"
    >
        Amazonで見る →
    </a>
</div>
` : ""}
`;

renderProductRanking(priceData);
}

loadProducts();
function normalizeText(str) {
    return str
        .normalize("NFKC") // 半角→全角
        .replace(/[\u3041-\u3096]/g, ch =>
            String.fromCharCode(ch.charCodeAt(0) + 0x60)
        ) // ひらがな→カタカナ
        .toLowerCase()
        .replace(/\s+/g, "");
}
function findBrandCodes(keyword) {

    keyword = normalizeText(keyword);

    const result = [];

    Object.entries(brandMap).forEach(([code, brand]) => {

        const hit =
            normalizeText(brand.brand_name).includes(keyword) ||

            brand.search_keywords.some(k =>
                normalizeText(k).includes(keyword)
            );

        if (hit) {
            result.push(code);
        }

    });

    return result;

}
let scanner = null;
let stores = [];
let brands = [];
let brandMap = {};
async function loadBrands() {

    const { data, error } = await db
        .from("brands")
        .select("*")
        .order("brand_name");

    if (error) {
        console.error(error);
        return;
    }

    brands = data;
console.log(data);
    brandMap = {};

    data.forEach(brand => {

        brandMap[brand.brand_code] = {

            brand_name: brand.brand_name,

            search_keywords: (brand.search_keywords || "")
                .split(",")
                .map(k => k.trim().toLowerCase())

        };

    });

    console.log("ブランド読込完了");
    console.log(brandMap);

}
async function loadStores() {

    const { data, error } = await db
        .from("store_master")
        .select("*")
        .order("store_name");

    if (error) {
        console.error(error);
        return;
    }

    stores = data;

    console.log("店舗データ読み込み完了");
    console.log(stores);
    console.log(
       [...new Set(stores.map(s => s.city))]
    );
}

loadBrands();
loadStores();
console.log("ネミル 起動");
console.log("Supabase接続完了");
function calculatePriceStats(priceData) {

    if (!priceData || priceData.length === 0) {
        return {
            latestPrice: 0,
            lowestPrice: 0,
            averagePrice: 0,
            latestCreatedAt: null,
            lowestCreatedAt: null,
            count: 0
        };
    }

    const sortedData = [...priceData].sort(
        (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
    );

    const latestPrice = Number(sortedData[0].price);
    const lowestItem = sortedData.reduce((lowest, item) =>
        Number(item.price) < Number(lowest.price) ? item : lowest
    );

    const prices = sortedData
        .map(item => Number(item.price))
        .filter(price => !Number.isNaN(price));

    const total = prices.reduce(
        (sum, price) => sum + price,
        0
    );

    return {
        latestPrice,
        lowestPrice: Math.min(...prices),
        averagePrice: Math.round(total / prices.length),
        latestCreatedAt: sortedData[0].created_at,
        lowestCreatedAt: lowestItem.created_at,
        count: prices.length
    };
}

function formatMonthDay(dateValue) {

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatPostDate(dateValue) {

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) return "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const postDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysAgo = Math.floor((today - postDate) / (1000 * 60 * 60 * 24));
    const monthDay = formatMonthDay(dateValue);

    if (daysAgo <= 0) return "🟢 今日";
    if (daysAgo === 1) return "🟡 昨日";
    if (daysAgo <= 6) return `🔵 ${daysAgo}日前（${monthDay}）`;

    return monthDay;
}

function getLatestPricesByStore(priceData) {

    const latestPrices = {};

    (priceData || []).forEach(item => {
        const key = `${item.product_name}__${item.store_name}`;
        const current = latestPrices[key];

        if (!current || isNewerPrice(item, current)) {
            latestPrices[key] = item;
        }
    });

    return Object.values(latestPrices).sort(
        (a, b) => Number(a.price) - Number(b.price)
    );
}

function isNewerPrice(item, current) {

    const itemTime = new Date(item.created_at || 0).getTime();
    const currentTime = new Date(current.created_at || 0).getTime();

    if (itemTime !== currentTime) {
        return itemTime > currentTime;
    }

    return Number(item.id || 0) > Number(current.id || 0);
}

function getRankLabel(index) {

    const medals = ["&#129351;", "&#129352;", "&#129353;"];

    return medals[index] || `#${index + 1}`;
}

function renderProductRanking(priceData) {

    {
        let rankingHtml = `
<div class="card-header">
    <span class="card-icon">🏪</span>
    <h2>店舗ランキング</h2>
</div>
`;

        if (!priceData || priceData.length === 0) {
            rankingHtml += `
<div class="empty-state">
    <div class="empty-state-icon">📋</div>
    <p>価格データがありません</p>
</div>`;
        } else {
            priceData.forEach((item, index) => {
                const topClass = index < 3 ? " rank-top" : "";
                rankingHtml += `
    <div class="rank${topClass}">
        <span class="rank-label">${getRankLabel(index)}</span>
        <span class="rank-main">${item.store_name} <span class="post-date">${formatPostDate(item.created_at)}</span></span>
        <span class="rank-price">${item.price}円</span>
    </div>`;
            });
        }

        document.getElementById("ranking").innerHTML = rankingHtml;
        return;
    }

    let rankingHtml = `
<h2>店舗ランキング</h2>
`;

    if (!priceData || priceData.length === 0) {
        rankingHtml += `<p>価格データがありません</p>`;
    } else {
        priceData.forEach((item, index) => {
            rankingHtml += `
    <p>${index + 1}位 ${item.store_name} ${item.price}円</p>
    `;
        });
    }

    document.getElementById("ranking").innerHTML = rankingHtml;
}
async function loadProductPrices(productName) {

    const { data, error } = await db
        .from("prices")
        .select("*")
        .eq("product_name", productName)
        .order("price", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }

    let rankingHtml = `
<h2>店舗ランキング</h2>
`;

    if (!data || data.length === 0) {
        rankingHtml += `<p>価格データがありません</p>`;
    } else {
        data.forEach((item, index) => {
            rankingHtml += `
    <p>${index + 1}位 ${item.store_name} ${item.price}円</p>
    `;
        });
    }

    document.getElementById("ranking").innerHTML = rankingHtml;
}
function clearPostForm() {
    document.getElementById("newProduct").value = "";
    document.getElementById("newStore").value = "";
    document.getElementById("newPrice").value = "";
}

async function addPrice() {

    const product =
        document.getElementById("newProduct").value.trim();

    const store =
        document.getElementById("newStore").value.trim();

    const price =
        document.getElementById("newPrice").value.trim();

    if (!product || !store || !price) {
        showToast("商品名・店舗名・価格をすべて入力してください", "error");
        return;
    }

    if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
        showToast("価格は0より大きい数値を入力してください", "error");
        return;
    }

    console.log("商品:", product);
    console.log("店舗:", store);
    console.log("価格:", price);
    const { data, error } = await db
    .from("prices")
    .insert([
        {
            product_name: product,
            store_name: store,
            price: Number(price)
        }
    ]);

if(error){
    console.error("エラー詳細:", error);
    showToast("投稿できませんでした", "error");
    return;
}

    document.getElementById("newProduct").value = "";
    document.getElementById("newPrice").value = "";

    document.getElementById("productName").value = product;
    await showProductDetail(product);

    showToast("投稿しました");

    document.getElementById("result").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}
async function loadPrices(productName = "") {

    let query = db
        .from("prices")
        .select("*");

    if (productName) {
        query = query.eq("product_name", productName);
    }

    const { data, error } = await query
        .order("price", { ascending: true });

    if (error) {
        console.error(error);
        return [];
    }

    console.log("取得した価格データ", data);
    const selectedCities = getSelectedCities();
    let filteredData = data;

　　if (selectedCities.length > 0) {

    　　filteredData = data.filter(price => {

        const store = stores.find(
            s => s.store_name === price.store_name
        );

        return (
            store &&
            selectedCities.includes(store.city)
        );

    });

}
    const latestData =
    　　getLatestPricesByStore(filteredData);
    const list = document.getElementById("price-list");

list.innerHTML = "";

if (latestData.length === 0) {
    list.innerHTML = `
<div class="empty-state">
    <div class="empty-state-icon">💬</div>
    <p>まだ投稿がありません</p>
</div>`;
    return latestData;
}

latestData.slice(0, 5).forEach((item, index) => {
    list.innerHTML += `
        <div class="rank">
            <span class="rank-label">${getRankLabel(index)}</span>
            <div class="rank-main">
                <div class="rank-product">${item.product_name}</div>
                <div class="rank-store">${item.store_name} <span class="post-date">${formatPostDate(item.created_at)}</span></div>
            </div>
            <span class="rank-price">${item.price}円</span>
        </div>`;
});

return latestData;

}

loadPrices();
const productInput = document.getElementById("productName");
const newProductInput =
    document.getElementById("newProduct");

const newSuggestionsBox =
    document.getElementById("newSuggestions");

const storeInput =
    document.getElementById("newStore");

const storeSuggestionsBox =
    document.getElementById("storeSuggestions");

function showProductSuggestions(inputElement, suggestionBox, onSelect) {

    const keyword = inputElement.value.trim();

    suggestionBox.innerHTML = "";

    if (!keyword) return;

    const searchWord = normalizeText(keyword);

    const matches = products.filter(product =>
        productMatchesSearch(product, searchWord)
    );

    matches.forEach(product => {

        const item = document.createElement("div");

        item.textContent = product.product_name;

        item.className = "suggestion-item";

        item.onclick = () => {
            inputElement.value = product.product_name;
            suggestionBox.innerHTML = "";

            if (onSelect) onSelect();
        };

        suggestionBox.appendChild(item);
    });
}

productInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        searchProduct();

    }

});
storeInput.addEventListener("input", () => {

    const keyword = storeInput.value.trim();

    storeSuggestionsBox.innerHTML = "";

    if (!keyword) return;

    const searchWord = normalizeText(keyword);

    const selectedCities = getSelectedCities();

    const matchedBrandCodes = findBrandCodes(searchWord);

    const matches = stores.filter(store => {

    // 地域フィルター
    if (
        selectedCities.length > 0 &&
        !selectedCities.includes(store.city)
    ) {
        return false;
    }

    // 店舗名検索
    if (normalizeText(store.store_name).includes(searchWord)) {
        return true;
    }

    // ブランド検索
    if (matchedBrandCodes.includes(store.brand_code)) {
        return true;
    }

    return false;

});

    matches.forEach(store => {

        const item = document.createElement("div");

        item.textContent = store.store_name;

        item.className = "suggestion-item";

        item.onclick = () => {

            storeInput.value = store.store_name;
            storeSuggestionsBox.innerHTML = "";

        };

        storeSuggestionsBox.appendChild(item);

    });

});
storeInput.addEventListener("focus", () => {

    const keyword = storeInput.value.trim();

    if (!keyword) return;

    storeSuggestionsBox.innerHTML = "";

    const searchWord = normalizeText(keyword);

        const selectedCities = getSelectedCities();

    const matchedBrandCodes = findBrandCodes(searchWord);

    const matches = stores.filter(store => {

    // 地域フィルター
         if (
             selectedCities.length > 0 &&
             !selectedCities.includes(store.city)
    ) {
        return false;
    }

    // 店舗名検索
    if (normalizeText(store.store_name).includes(searchWord)) {
        return true;
    }

    // ブランド検索
    if (matchedBrandCodes.includes(store.brand_code)) {
        return true;
    }

    return false;

});

    matches.forEach(store => {

        const item = document.createElement("div");

        item.textContent = store.store_name;

        item.className = "suggestion-item";

        item.onclick = () => {

            storeInput.value = store.store_name;

            storeSuggestionsBox.innerHTML = "";

        };

        storeSuggestionsBox.appendChild(item);

    });

});
document.addEventListener("click", (event) => {

    if (
        event.target !== newProductInput &&
        !newSuggestionsBox.contains(event.target)
    ) {
        newSuggestionsBox.innerHTML = "";
    }
        if (
        event.target !== storeInput &&
        !storeSuggestionsBox.contains(event.target)
    ) {
        storeSuggestionsBox.innerHTML = "";
    }
});

/*
productInput.addEventListener("focus", () => {

    const keyword = productInput.value.trim();

    if (!keyword) return;

    suggestionsBox.innerHTML = "";

    const searchWord = normalizeText(keyword);

    const matches = products
     .filter(product =>
        normalizeText(product.product_name).includes(searchWord)
     )
     .map(product => product.product_name);

    matches.forEach(name => {

        const item = document.createElement("div");

        item.textContent = name;

        item.className = "suggestion-item";

        item.onclick = () => {
            productInput.value = name;
            suggestionsBox.innerHTML = "";
            searchProduct();
        };

        suggestionsBox.appendChild(item);

    });

});
newProductInput.addEventListener("input", () => {

    const keyword =
        newProductInput.value.trim();

    newSuggestionsBox.innerHTML = "";

    if (!keyword) return;

    const searchWord = normalizeText(keyword);

    const matches = products
     .filter(product =>
        normalizeText(product.product_name).includes(searchWord)
     )
     .map(product => product.product_name);
    matches.forEach(name => {

        const item =
            document.createElement("div");

        item.textContent = name;

        item.className =
            "suggestion-item";

        item.onclick = () => {

            newProductInput.value = name;

            newSuggestionsBox.innerHTML = "";

        };

        newSuggestionsBox.appendChild(item);

    });

});
newProductInput.addEventListener("focus", () => {

    const keyword =
        newProductInput.value.trim();

    if (!keyword) return;

    newSuggestionsBox.innerHTML = "";

    const searchWord = normalizeText(keyword);

    const matches = products
     .filter(product =>
        normalizeText(product.product_name).includes(searchWord)
     )
     .map(product => product.product_name);

    matches.forEach(name => {

        const item =
            document.createElement("div");

        item.textContent = name;

        item.className =
            "suggestion-item";

        item.onclick = () => {

            newProductInput.value = name;

            newSuggestionsBox.innerHTML = "";

        };

        newSuggestionsBox.appendChild(item);

    });

});
*/

newProductInput.addEventListener("input", () => {
    showProductSuggestions(newProductInput, newSuggestionsBox);
});

newProductInput.addEventListener("focus", () => {
    showProductSuggestions(newProductInput, newSuggestionsBox);
});

const regionModal =
document.getElementById("regionModal");

if (regionModal) {

    if (hasRegionSettings()) {

        regionModal.style.display = "none";

    } else {

        renderRegionCitySettings("cityList");

    }

    document
        .getElementById("saveRegionBtn")
        .addEventListener("click", () => {

            try {
                const checkedCities =
                    getCheckedCitiesFromContainer("cityList");

                if (checkedCities.length === 0) {
                    showToast("地域を1つ以上選択してください", "error");
                    return;
                }

                saveSelectedCities(checkedCities);
                regionModal.style.display = "none";
                showToast("保存しました");
            } catch (error) {
                console.error(error);
                showToast("保存できませんでした", "error");
            }

        });

    regionModal.addEventListener("click", async (event) => {

        if (event.target !== regionModal) return;

        regionModal.style.display = "none";
        await renderRegionCitySettings("cityList");

    });

}

const settingsButton = document.getElementById("settingsButton");

if (settingsButton && regionModal) {

    settingsButton.addEventListener("click", async () => {

        regionModal.style.display = "flex";
        await renderRegionCitySettings("cityList");

    });

}
async function loadFooter() {

    const footer = document.getElementById("footer");

    if (!footer) return;

    const response = await fetch("footer.html");

    footer.innerHTML = await response.text();

}

loadFooter();
       document.addEventListener("DOMContentLoaded", () => {
          loadFooter();
       });
//document.getElementById("barcodeFile")
//.addEventListener(
//    "change",
//    async (event) => {
//
//       const file =
//            event.target.files[0];
//
//        if (!file) {
//            return;
//        }

//        try {

//            const result =
//                await codeReader.decodeFromImageUrl(
//                    URL.createObjectURL(file)
//                );
//
//            const decodedText =
//                result.getText();

//            alert(
//                "読取成功: " +
//                decodedText
//            );

//            const { data, error } =
  //              await db
    //            .from("product_master")
      //          .select("*")
        //        .eq(
          //          "barcode",
            //        decodedText
              //  )
//                .single();

//            if (error || !data) {

//                alert(
  //                  "商品なし\nバーコード: " +
    //                decodedText
      //          );

//                document
  //              .getElementById(
    //                "newProduct"
      //          )
        //        .value =
          //      decodedText;

//            } else {

//                document
  //              .getElementById(
    //                "newProduct"
      //          )
//                .value =
 //               data.name;
  //          }

//        } catch (err) {

//            console.error(err);

//            alert(
//                "バーコードを認識できませんでした"
//            );

//        }

//        event.target.value = "";

//    }
//);
