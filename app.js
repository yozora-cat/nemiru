let products = {};
fetch("products.json")
  .then(response => response.json())
  .then(data => {
      products = data;
      console.log("商品データ読み込み完了");
  });
console.log("トクミル 起動");
console.log(products);
function searchProduct() {

    const name =
        document.getElementById("productName").value;

    console.log("検索:", name);

    const product = products[name];
    let score =
    Math.round(
        (product.lowestPrice / product.currentPrice)
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
     let rankingHtml = `
<h2>店舗ランキング</h2>
`;

product.stores.forEach((store, index) => {
    rankingHtml += `
    <p>${index + 1}位 ${store.name} ${store.price}円</p>
    `;
});

document.getElementById("ranking").innerHTML = rankingHtml;
    }else{
        alert("商品が見つかりません");
    }
}
function addPrice() {

    const product =
        document.getElementById("newProduct").value;

    const store =
        document.getElementById("newStore").value;

    const price =
        document.getElementById("newPrice").value;

    console.log("商品:", product);
    console.log("店舗:", store);
    console.log("価格:", price);
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