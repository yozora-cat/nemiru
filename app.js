
const products = {
  "アタック抗菌EX": {
    currentPrice: 398,
    lowestPrice: 298,
    averagePrice: 378,
    stores: [
      { name: "コスモス", price: 298 },
      { name: "ダイレックス", price: 318 },
      { name: "サニー", price: 328 }
    ]
  },

  "ネピアティッシュ": {
    currentPrice: 198,
    lowestPrice: 148,
    averagePrice: 178,
    stores: [
      { name: "サニー", price: 148 },
      { name: "コスモス", price: 158 },
      { name: "ダイレックス", price: 168 }
    ]
  }
};
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