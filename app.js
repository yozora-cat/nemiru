const supabaseUrl = 'https://kbrrfilzdqshlimsgkdy.supabase.co'
const supabaseKey = "sb_publishable_ByrFySYSPpOZPz7DEuNNHw_9LkM6IQj"
const db = window.supabase.createClient(supabaseUrl, supabaseKey)
let products = {};
let scanner = null;
let codeReader = null;
let lastBarcode = "";
let codeReader =
    new ZXing.BrowserMultiFormatReader();
fetch("products.json")
  .then(response => response.json())
  .then(data => {
      products = data;
      console.log("商品データ読み込み完了");
  });
let stores = [];
fetch("stores.json")
    .then(response => response.json())
    .then(data => {
        stores = data;
        console.log("店舗データ読み込み完了");
    });
console.log("ネミル 起動");
console.log("Supabase接続完了");
console.log(products);
async function searchProduct() {

    const name =
        document.getElementById("productName").value;

    console.log("検索:", name);

    const product = products[name];

    if(!product){
        alert("商品が見つかりません");
        return;
    }

    const priceData = await loadPrices(name);
    const stats = calculatePriceStats(priceData);
    const lowestPriceText = stats.count > 0 ? `${stats.lowestPrice}&#20870;` : "&#20385;&#26684;&#12487;&#12540;&#12479;&#12394;&#12375;";
    const averagePriceText = stats.count > 0 ? `${stats.averagePrice}&#20870;` : "&#20385;&#26684;&#12487;&#12540;&#12479;&#12394;&#12375;";

    let score =
    Math.round(
        ((stats.lowestPrice || 0) / product.currentPrice)
        * 100
    );
    let judgement = "";
    if(score >= 95){
    judgement = "🟢 今が買い時！";
  }
else if(score >= 80){
    judgement = "🟡 普通";
}
else{
    judgement = "🔴 まだ高い";
}
    if(product){
     document.getElementById("result").innerHTML = `
     <h2>${name}</h2>
     <p>現在価格：${product.currentPrice}円</p>
     <p>底値：${product.lowestPrice}円</p>
     <p>平均価格：${product.averagePrice}円</p>
     <p>買い時スコア：${score}点</p>
     <p>${judgement}</p>
     `;
     document.getElementById("result").innerHTML = `
     <h2>${name}</h2>
     <p>現在価格：${product.currentPrice}円</p>
     <p>最安値：${lowestPriceText}</p>
     <p>平均価格：${averagePriceText}</p>
     <p>投稿件数：${stats.count}件</p>
     <p>買い時スコア：${score}点</p>
     <p>${judgement}</p>
     `;
     document.getElementById("result").innerHTML = `
     <h2>${name}</h2>
     <p>&#29694;&#22312;&#20385;&#26684;: ${product.currentPrice}&#20870;</p>
     <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">&#26368;&#23433;&#20516;</div>
            <div class="stat-value">${lowestPriceText}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">&#24179;&#22343;&#20385;&#26684;</div>
            <div class="stat-value">${averagePriceText}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">&#25237;&#31295;&#20214;&#25968;</div>
            <div class="stat-value">${stats.count}&#20214;</div>
        </div>
     </div>
     <p>&#36023;&#12356;&#26178;&#12473;&#12467;&#12450;: ${score}&#28857;</p>
     <p>${judgement}</p>
     `;
     let rankingHtml = `
<h2>店舗ランキング</h2>
`;

product.stores.forEach((store, index) => {
    rankingHtml += `
    <p>${index + 1}位 ${store.name} ${store.price}円</p>
    `;
});

document.getElementById("ranking").innerHTML = rankingHtml;
renderProductRanking(priceData);
    }else{
        alert("商品が見つかりません");
    }
}
function calculatePriceStats(priceData) {

    const prices = (priceData || [])
        .map(item => Number(item.price))
        .filter(price => !Number.isNaN(price));

    if (prices.length === 0) {
        return {
            lowestPrice: 0,
            averagePrice: 0,
            count: 0
        };
    }

    const total = prices.reduce((sum, price) => sum + price, 0);

    return {
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
<h2>&#24215;&#33303;&#12521;&#12531;&#12461;&#12531;&#12464;</h2>
`;

        if (!priceData || priceData.length === 0) {
            rankingHtml += `<p>&#20385;&#26684;&#12487;&#12540;&#12479;&#12364;&#12354;&#12426;&#12414;&#12379;&#12435;</p>`;
        } else {
            priceData.forEach((item, index) => {
                rankingHtml += `
    <div class="rank">
        <span class="rank-label">${getRankLabel(index)}</span>
        <span class="rank-main">${item.store_name}</span>
        <span class="rank-price">${item.price}&#20870;</span>
    </div>
    `;
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

if (products[product]) {

    products[product].stores.push({
        name: store,
        price: Number(price)
    });

    products[product].stores.sort(
        (a, b) => a.price - b.price
    );

}
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
latestData.forEach((item, index) => {
    list.innerHTML += `
        <div class="rank">
            <span class="rank-label">${getRankLabel(index)}</span>
            <span class="rank-main">${item.product_name}<br>${item.store_name}</span>
            <span class="rank-price">${item.price}&#20870;</span>
        </div>
    `;
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

    const matches = Object.keys(products).filter(name =>
        name.includes(keyword)
    );

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

    const matches = stores.filter(store =>
        store.startsWith(keyword)
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

    const matches = stores.filter(store =>
        store.startsWith(keyword)
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

    const matches = Object.keys(products).filter(name =>
        name.includes(keyword)
    );

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

    const matches =
        Object.keys(products).filter(name =>
            name.includes(keyword)
        );

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

    const matches =
        Object.keys(products).filter(name =>
            name.includes(keyword)
        );

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
function startScanner() {

    alert("startScanner動作");

    const fileInput =
        document.getElementById("barcodeFile");

    fileInput.value = "";

    fileInput.click();

}
document.getElementById("barcodeFile")
.addEventListener(
    "change",
    async (event) => {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }

        try {

            const result =
                await codeReader.decodeFromImageUrl(
                    URL.createObjectURL(file)
                );

            const decodedText =
                result.getText();

            alert(
                "読取成功: " +
                decodedText
            );

            const { data, error } =
                await db
                .from("product_master")
                .select("*")
                .eq(
                    "barcode",
                    decodedText
                )
                .single();

            if (error || !data) {

                alert(
                    "商品なし\nバーコード: " +
                    decodedText
                );

                document
                .getElementById(
                    "newProduct"
                )
                .value =
                decodedText;

            } else {

                document
                .getElementById(
                    "newProduct"
                )
                .value =
                data.name;
            }

        } catch (err) {

            console.error(err);

            alert(
                "バーコードを認識できませんでした"
            );

        }

        event.target.value = "";

    }
);