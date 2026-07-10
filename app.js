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
let scanner = null;
let stores = [];

async function loadStores() {

    const { data, error } = await db
        .from("store_master")
        .select("*")
        .order("name");

    if (error) {
        console.error(error);
        return;
    }

    stores = data.map(store => store.name);

    console.log("店舗データ読み込み完了");
    console.log(stores);
}

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

    const matches = stores.filter(store =>
       normalizeText(store).includes(searchWord)
    );

    matches.forEach(store => {

        const item = document.createElement("div");

        item.textContent = store;

        item.className = "suggestion-item";

        item.onclick = () => {

            storeInput.value = store;

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

    const matches = stores.filter(store =>
     normalizeText(store).includes(searchWord)
    );

    matches.forEach(store => {

        const item = document.createElement("div");

        item.textContent = store;

        item.className = "suggestion-item";

        item.onclick = () => {

            storeInput.value = store;

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

const regionModal =
document.getElementById("regionModal");

if(localStorage.getItem("city")){

    regionModal.style.display="none";

}

document
.getElementById("saveRegionBtn")
.addEventListener("click",()=>{

    localStorage.setItem(
        "region",
        document.getElementById("regionSelect").value
    );

    localStorage.setItem(
        "prefecture",
        document.getElementById("prefectureSelect").value
    );

    localStorage.setItem(
        "city",
        document.getElementById("citySelect").value
    );

    regionModal.style.display="none";

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