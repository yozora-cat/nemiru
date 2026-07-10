brand_code
TR = トライアル
CS = コスモス
DR = ダイレックス
AE = イオン

region_code
HK = 北海道
TH = 東北
KT = 関東
CB = 中部
KK = 近畿
CG = 中国
SK = 四国
KY = 九州

prefecture_code
JIS X 0401を使用
福岡県 = 40
佐賀県 = 41
...
brands（ブランドマスター）
| カラム名          | 型       | 今使う| 説明                     |
| -------------    | -------  | :-:  | ---------------------- |
| brand_code       | TEXT     |  ✅  | ブランドコード（TR、CS、AEなど）※PK |
| brand_name       | TEXT     |  ✅  | ブランド名（トライアル等）          |
| chain_type       | TEXT     |  ✅  | 業態（スーパー・ドラッグストア等）      |
| display_order    | INTEGER  |  ✅  | 表示順                    |
| is_active        | BOOLEAN  |  ✅  | 使用中フラグ                 |
| official_url     | TEXT     |  △  | 公式サイト                  |
| logo_url         | TEXT     |  △  | ロゴ画像URL                |

store_master（店舗マスター）
| カラム名            | 型       | 今使う | 説明                  |
| --------------- | ------- | :-: | ------------------- |
| store_id        | TEXT    |  ✅  | 店舗コード（TR0001等）※PK   |
| store_name      | TEXT    |  ✅  | 店舗名（トライアル 柳川西蒲池店）   |
| brand_code      | TEXT    |  ✅  | ブランドコード（brandsと紐付け） |
| region          | TEXT    |  ✅  | 地方（九州）              |
| region_code     | TEXT    |  ✅  | 地方コード（KY）           |
| prefecture      | TEXT    |  ✅  | 都道府県                |
| prefecture_code | INTEGER |  ✅  | JIS都道府県コード（40等）     |
| city            | TEXT    |  ✅  | 市町村                 |
| postal_code     | TEXT    |  △  | 郵便番号                |
| address         | TEXT    |  △  | 住所                  |
| latitude        | DOUBLE  |  △  | 緯度                  |
| longitude       | DOUBLE  |  △  | 経度                  |
| google_maps_url | TEXT    |  △  | Google Mapsリンク      |
| is_active       | BOOLEAN |  ✅  | 使用中フラグ              |
