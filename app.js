const supabaseUrl = 'https://kbrrfilzdqshlimsgkdy.supabase.co'
const supabaseKey = "sb_publishable_ByrFySYSPpOZPz7DEuNNHw_9LkM6IQj"
const db = window.supabase.createClient(supabaseUrl, supabaseKey)
let products = {};
fetch("products.json")
  .then(response => response.json())
  .then(data => {
      products = data;
      console.log("商品データ読み込み完了");
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
     <p>&#26368;&#23433;&#20516;: ${lowestPriceText}</p>
     <p>&#24179;&#22343;&#20385;&#26684;: ${averagePriceText}</p>
     <p>&#25237;&#31295;&#20214;&#25968;: ${stats.count}&#20214;</p>
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

function renderProductRanking(priceData) {

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
    const list = document.getElementById("price-list");

list.innerHTML = "";

data.forEach((item, index) => {
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

return data;
}

loadPrices();
