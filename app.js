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

    if(product){
     document.getElementById("result").innerHTML = `
     <h2>${name}</h2>
     <p>現在価格：${product.currentPrice}円</p>
     <p>底値：${product.lowestPrice}円</p>
     <p>平均価格：${product.averagePrice}円</p>
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