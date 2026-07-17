const supabaseUrl = 'https://kbrrfilzdqshlimsgkdy.supabase.co'
const supabaseKey = "sb_publishable_ByrFySYSPpOZPz7DEuNNHw_9LkM6IQj"
const db = window.supabase.createClient(supabaseUrl, supabaseKey)
let products = [];

async function loadProducts() {

    const { data, error } = await db
        .from("product_master")
        .select("*")
        .order("name");

    if (error) {
        console.error(error);
        return;
    }

    products = data;

    console.log("商品マスター読込完了");
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
async function searchProduct() {

    const name =
        document.getElementById("productName").value;

    console.log("検索:", name);

    const { data, error } = await db
        .from("product_master")
        .select("*")
        .eq("name", name);
    console.log("全件取得:", data);
    console.log("検索文字:", name);
    console.log("Supabase結果:", data);
    console.log("Supabaseエラー:", error);

    if (error) {
    alert("検索エラー");
    console.log(error);
    return;
    }

    if (data.length === 0) {
    alert("商品が見つかりません");
    return;
    }

    const product = data[0];

    const priceData = await loadPrices(name);
    const stats = calculatePriceStats(priceData);
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
    <h2>${product.name}</h2>
</div>

<div class="current-price">
    <span class="stat-label">現在価格</span>
    <span class="price-large">${currentPriceText}</span>
</div>

<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-label">最安値</div>
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
`;

renderProductRanking(priceData);
}
function calculatePriceStats(priceData) {

    if (!priceData || priceData.length === 0) {
        return {
            latestPrice: 0,
            lowestPrice: 0,
            averagePrice: 0,
            count: 0
        };
    }

    const sortedData = [...priceData].sort(
        (a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
    );

    const latestPrice = Number(sortedData[0].price);

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
        count: prices.length
    };
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
        <span class="rank-main">${item.store_name}</span>
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
async function addPrice() {

    const product =
        document.getElementById("newProduct").value;

    const store =
        document.getElementById("newStore").value;

    const price =
        document.getElementById("newPrice").value;

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
    alert("保存失敗");
    return;
}

alert("Supabaseに保存成功！");
await loadPrices();
    alert("価格を登録しました");
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
    const latestData = getLatestPricesByStore(data);
    const list = document.getElementById("price-list");

list.innerHTML = "";

{
if (latestData.length === 0) {
    list.innerHTML = `
<div class="empty-state">
    <div class="empty-state-icon">💬</div>
    <p>まだ投稿がありません</p>
</div>`;
    return latestData;
}

latestData.forEach((item, index) => {
    list.innerHTML += `
        <div class="rank">
            <span class="rank-label">${getRankLabel(index)}</span>
            <div class="rank-main">
                <div class="rank-product">${item.product_name}</div>
                <div class="rank-store">${item.store_name}</div>
            </div>
            <span class="rank-price">${item.price}円</span>
        </div>`;
});

return latestData;
}

latestData.forEach((item, index) => {
    list.innerHTML += `
        <div class="rank">
            #${index + 1}
            ${item.product_name}
            ${item.store_name}
            ：
            ${item.price}円
        </div>
    `;
});

return latestData;
}

loadPrices();
const productInput = document.getElementById("productName");
const suggestionsBox = document.getElementById("suggestions");
const newProductInput =
    document.getElementById("newProduct");

const newSuggestionsBox =
    document.getElementById("newSuggestions");

const storeInput =
    document.getElementById("newStore");

const storeSuggestionsBox =
    document.getElementById("storeSuggestions");
productInput.addEventListener("input", () => {

    const keyword = productInput.value.trim();

    suggestionsBox.innerHTML = "";

    if (!keyword) return;

    const searchWord = normalizeText(keyword);

    const matches = products
     .filter(product =>
        normalizeText(product.name).includes(searchWord)
     )
     .map(product => product.name);

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
storeInput.addEventListener("input", () => {

    const keyword = storeInput.value.trim();

    storeSuggestionsBox.innerHTML = "";

    if (!keyword) return;

    const searchWord = normalizeText(keyword);

    const selectedCities =
      JSON.parse(localStorage.getItem("selectedCities")) || [];

    console.log("検索で使う地域:", selectedCities);

    const matchedBrandCodes = findBrandCodes(searchWord);

    const matches = stores.filter(store => {
        console.log(store.store_name, store.city);
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

    const selectedCities =
        JSON.parse(localStorage.getItem("selectedCities")) || [];

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
productInput.addEventListener("keydown", (event) => {

    if (event.key === "Enter") {

        searchProduct();

    }

});
document.addEventListener("click", (event) => {

    if (
        event.target !== productInput &&
        !suggestionsBox.contains(event.target)
    ) {        suggestionsBox.innerHTML = "";    }
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
productInput.addEventListener("focus", () => {

    const keyword = productInput.value.trim();

    if (!keyword) return;

    suggestionsBox.innerHTML = "";

    const searchWord = normalizeText(keyword);

    const matches = products
     .filter(product =>
        normalizeText(product.name).includes(searchWord)
     )
     .map(product => product.name);

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
        normalizeText(product.name).includes(searchWord)
     )
     .map(product => product.name);
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
        normalizeText(product.name).includes(searchWord)
     )
     .map(product => product.name);

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

function getDistinctOptions(rows, codeKey, labelKey) {

    const map = new Map();

    rows.forEach(row => {
        const code = row[codeKey];
        const label = row[labelKey];

        if (code == null || code === "" || map.has(String(code))) {
            return;
        }

        map.set(String(code), label);
    });

    return [...map.entries()]
        .map(([code, label]) => ({ code, label }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label), "ja"));
}

function fillCodeSelect(selectEl, options) {

    selectEl.innerHTML = "";

    options.forEach(({ code, label }) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = label;
        selectEl.appendChild(option);
    });
}

function getUserSettings() {

    return {
        brand_code: localStorage.getItem("brand_code") || "",
        region_code: localStorage.getItem("region_code") || "",
        prefecture_code: localStorage.getItem("prefecture_code") || "",
        city: localStorage.getItem("city") || ""
    };
}

function saveRegionSettings({ region_code, prefecture_code, city }) {

    localStorage.setItem("region_code", region_code);
    localStorage.setItem("prefecture_code", prefecture_code);
    localStorage.setItem("city", city);
    localStorage.removeItem("region");
    localStorage.removeItem("prefecture");
}

async function loadRegions() {

    const { data, error } = await db
        .from("store_master")
        .select("region, region_code")
        .order("region_code");

    if (error) {
        console.error(error);
        return;
    }

    const regions = getDistinctOptions(data, "region_code", "region");
    const regionSelect = document.getElementById("regionSelect");

    fillCodeSelect(regionSelect, regions);

    const { region_code: savedRegionCode } = getUserSettings();
    const selectedRegionCode =
        savedRegionCode && regions.some(item => item.code === savedRegionCode)
            ? savedRegionCode
            : regions[0]?.code;

    if (selectedRegionCode) {
        regionSelect.value = selectedRegionCode;
        await loadPrefectures(selectedRegionCode);
    }
}

async function loadPrefectures(regionCode) {

    const { data, error } = await db
        .from("store_master")
        .select("prefecture, prefecture_code")
        .eq("region_code", regionCode)
        .order("prefecture_code");

    if (error) {
        console.error(error);
        return;
    }

    const prefectures = getDistinctOptions(data, "prefecture_code", "prefecture");
    const prefectureSelect = document.getElementById("prefectureSelect");

    fillCodeSelect(prefectureSelect, prefectures);

    const { prefecture_code: savedPrefectureCode } = getUserSettings();
    const selectedPrefectureCode =
        savedPrefectureCode && prefectures.some(item => item.code === savedPrefectureCode)
            ? savedPrefectureCode
            : prefectures[0]?.code;

    if (selectedPrefectureCode) {
        prefectureSelect.value = selectedPrefectureCode;
        await loadCities(selectedPrefectureCode);
    }
}

async function loadCities(prefectureCode) {

    const { data, error } = await db
        .from("store_master")
        .select("city")
        .eq("prefecture_code", Number(prefectureCode))
        .order("city");

    if (error) {
        console.error(error);
        return;
    }

    const cities = [...new Set(data.map(row => row.city).filter(Boolean))];
    const citySelect = document.getElementById("citySelect");

    citySelect.innerHTML = "";

    cities.forEach(city => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });

    const { city: savedCity } = getUserSettings();

    if (savedCity && cities.includes(savedCity)) {
        citySelect.value = savedCity;
    }
}

const regionModal =
document.getElementById("regionModal");

const regionSelect =
document.getElementById("regionSelect");

const prefectureSelect =
document.getElementById("prefectureSelect");

if(localStorage.getItem("city")){

    regionModal.style.display="none";

}else{

    loadRegions();

}

regionSelect.addEventListener("change", () => {

    loadPrefectures(regionSelect.value);

});

prefectureSelect.addEventListener("change", () => {

    loadCities(prefectureSelect.value);

});

document
.getElementById("saveRegionBtn")
.addEventListener("click",()=>{

    saveRegionSettings({
        region_code: document.getElementById("regionSelect").value,
        prefecture_code: document.getElementById("prefectureSelect").value,
        city: document.getElementById("citySelect").value
    });

    regionModal.style.display="none";

});
function openCitySettings(){

    const cityList =
        document.getElementById("cityList");

    cityList.innerHTML = "";

    const selectedCities =
     JSON.parse(localStorage.getItem("selectedCities")) || [];

    const cities = [...new Set(
        stores
            .map(store => store.city)
            .filter(Boolean)
    )].sort();

    cities.forEach(city => {

        const label = document.createElement("label");

        const checked =
           selectedCities.includes(city)
               ? "checked"
               : "";

        label.innerHTML = `
            <input
                 type="checkbox"
                 value="${city}"
                 ${checked}
            >
            ${city}
        `;

        cityList.appendChild(label);
        cityList.appendChild(document.createElement("br"));

    });

    document
        .getElementById("citySettings")
        .classList.remove("hidden");

}
// 設定ボタン
document
.getElementById("settingsButton")
.addEventListener("click", () => {

    openCitySettings();

});

document
.getElementById("closeCitySettings")
.addEventListener("click", () => {

    document
        .getElementById("citySettings")
        .classList.add("hidden");

});

document
.getElementById("saveCitySettings")
.addEventListener("click", () => {

    const checkedCities = [];

    document
    .querySelectorAll("#cityList input:checked")
    .forEach(cb => {

        checkedCities.push(cb.value);

    });

    localStorage.setItem(
        "selectedCities",
        JSON.stringify(checkedCities)
    );

    alert("地域設定を保存しました");

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