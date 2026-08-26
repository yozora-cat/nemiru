document
    .getElementById("calculateButton")
    .addEventListener("click", calculateUnitPrice);


// クリアボタン
document
    .getElementById("clearButton")
    .addEventListener("click", clearUnitPrice);


/*
 * 単価計算
 */
function calculateUnitPrice() {

    const priceA =
        Number(document.getElementById("productAPrice").value);

    const amountA =
        Number(document.getElementById("productAAmount").value);

    const unitA =
        document.getElementById("productAUnit").value;


    const priceB =
        Number(document.getElementById("productBPrice").value);

    const amountB =
        Number(document.getElementById("productBAmount").value);

    const unitB =
        document.getElementById("productBUnit").value;


    const hasA =
        priceA > 0 &&
        amountA > 0;

    const hasB =
        priceB > 0 &&
        amountB > 0;


    // AもBも入力されていない
    if (!hasA && !hasB) {

        alert("価格と内容量を少なくとも1つ入力してください");

        return;
    }


    /*
     * Aだけ入力されている場合
     */
    if (hasA && !hasB) {

        const typeA = getUnitType(unitA);

        const normalizedA =
            normalizeAmount(amountA, unitA);

        const unitPriceA =
            priceA / normalizedA;

        const displayUnit =
            getDisplayUnit(typeA);

        const displayPriceA =
            unitPriceA *
            getDisplayMultiplier(typeA);


        document
            .getElementById("result")
            .classList.remove("hidden");


        document
            .getElementById("resultContent")
            .innerHTML = `

                <div class="unit-price-result">

                    <div class="result-item">
                        <h3>商品A</h3>

                        <strong>
                            ${displayPriceA.toFixed(2)}円
                        </strong>

                        <span>
                            / ${displayUnit}
                        </span>
                    </div>


                    <div class="winner">
                        商品Bを入力すると、
                        2商品の単価を比較できます。
                    </div>

                </div>

            `;


        scrollToResult();

        return;
    }


    /*
     * Bだけ入力されている場合
     */
    if (!hasA && hasB) {

        const typeB = getUnitType(unitB);

        const normalizedB =
            normalizeAmount(amountB, unitB);

        const unitPriceB =
            priceB / normalizedB;

        const displayUnit =
            getDisplayUnit(typeB);

        const displayPriceB =
            unitPriceB *
            getDisplayMultiplier(typeB);


        document
            .getElementById("result")
            .classList.remove("hidden");


        document
            .getElementById("resultContent")
            .innerHTML = `

                <div class="unit-price-result">

                    <div class="result-item">
                        <h3>商品B</h3>

                        <strong>
                            ${displayPriceB.toFixed(2)}円
                        </strong>

                        <span>
                            / ${displayUnit}
                        </span>
                    </div>


                    <div class="winner">
                        商品Aを入力すると、
                        2商品の単価を比較できます。
                    </div>

                </div>

            `;


        scrollToResult();

        return;
    }


    /*
     * A・B両方入力されている場合
     */


    const typeA = getUnitType(unitA);
    const typeB = getUnitType(unitB);


    // g / kg と ml / L など、
    // 異なる種類の単位は比較できない
    if (typeA !== typeB) {

        alert(
            "商品Aと商品Bは同じ種類の単位で入力してください"
        );

        return;
    }


    // 共通単位へ変換
    const normalizedA =
        normalizeAmount(amountA, unitA);

    const normalizedB =
        normalizeAmount(amountB, unitB);


    // 1g / 1ml / 1個などの単価
    const unitPriceA =
        priceA / normalizedA;

    const unitPriceB =
        priceB / normalizedB;


    // 表示単位
    const displayUnit =
        getDisplayUnit(typeA);


    const displayPriceA =
        unitPriceA *
        getDisplayMultiplier(typeA);

    const displayPriceB =
        unitPriceB *
        getDisplayMultiplier(typeA);


    let winner;


    if (unitPriceA < unitPriceB) {

        winner = "🏆 商品Aの方がお得です！";

    }
    else if (unitPriceB < unitPriceA) {

        winner = "🏆 商品Bの方がお得です！";

    }
    else {

        winner = "2つの商品は同じ単価です。";

    }


    document
        .getElementById("result")
        .classList.remove("hidden");


    document
        .getElementById("resultContent")
        .innerHTML = `

            <div class="unit-price-result">

                <div class="result-item">
                    <h3>商品A</h3>

                    <strong>
                        ${displayPriceA.toFixed(2)}円
                    </strong>

                    <span>
                        / ${displayUnit}
                    </span>
                </div>


                <div class="result-item">
                    <h3>商品B</h3>

                    <strong>
                        ${displayPriceB.toFixed(2)}円
                    </strong>

                    <span>
                        / ${displayUnit}
                    </span>
                </div>


                <div class="winner">
                    ${winner}
                </div>

            </div>

        `;


    scrollToResult();
}


/*
 * 計算結果まで自動スクロール
 */
function scrollToResult() {

    document
        .getElementById("result")
        .scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}


/*
 * クリア
 */
function clearUnitPrice() {

    document
        .getElementById("productAPrice")
        .value = "";

    document
        .getElementById("productAAmount")
        .value = "";

    document
        .getElementById("productAUnit")
        .value = "g";


    document
        .getElementById("productBPrice")
        .value = "";

    document
        .getElementById("productBAmount")
        .value = "";

    document
        .getElementById("productBUnit")
        .value = "g";


    document
        .getElementById("result")
        .classList.add("hidden");


    document
        .getElementById("resultContent")
        .innerHTML = "";

}


/*
 * 単位の種類
 */
function getUnitType(unit) {

    if (
        unit === "g" ||
        unit === "kg"
    ) {
        return "weight";
    }


    if (
        unit === "ml" ||
        unit === "L"
    ) {
        return "volume";
    }


    return "count";
}


/*
 * 共通単位へ変換
 *
 * weight → g
 * volume → ml
 * count → 個数
 */
function normalizeAmount(amount, unit) {

    if (unit === "kg") {
        return amount * 1000;
    }


    if (unit === "L") {
        return amount * 1000;
    }


    return amount;
}


/*
 * 表示する単位
 */
function getDisplayUnit(type) {

    if (type === "weight") {
        return "100g";
    }


    if (type === "volume") {
        return "100ml";
    }


    return "1個";
}


/*
 * 100g / 100ml / 1個
 * への換算倍率
 */
function getDisplayMultiplier(type) {

    if (type === "weight") {
        return 100;
    }


    if (type === "volume") {
        return 100;
    }


    return 1;
}