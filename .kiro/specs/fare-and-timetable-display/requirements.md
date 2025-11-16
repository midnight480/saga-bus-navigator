# 要件定義書

## はじめに

本ドキュメントは、佐賀バスナビゲーターアプリケーションに運賃計算・表示機能と時刻表表示機能を追加するための要件を定義します。これらの機能により、ユーザーは乗車バス停と降車バス停間の運賃を確認でき、バス停選択時に詳細な時刻表情報を閲覧できるようになります。

## 用語集

- **Application**: 佐賀バスナビゲーターアプリケーション
- **User**: アプリケーションを使用するエンドユーザー
- **GTFS**: General Transit Feed Specification（公共交通データの標準形式）
- **Fare Calculator**: 運賃計算機能を提供するシステムコンポーネント
- **Timetable Display**: 時刻表表示機能を提供するシステムコンポーネント
- **Route**: バス路線
- **Stop**: バス停
- **Service Day Type**: 運行日種別（平日、土日祝）
- **fare_attributes.txt**: GTFS形式の運賃属性ファイル
- **fare_rules.txt**: GTFS形式の運賃ルールファイル
- **stop_times.txt**: GTFS形式の停車時刻ファイル
- **calendar.txt**: GTFS形式の運行カレンダーファイル

## 要件

### 要件1: 運賃計算・表示

**ユーザーストーリー:** ユーザーとして、乗車バス停と降車バス停を選択したときに、その区間の運賃を確認したい。これにより、乗車前に必要な金額を把握できる。

#### 受入基準

1. WHEN User selects a boarding Stop and an alighting Stop, THE Fare Calculator SHALL retrieve fare information from fare_attributes.txt and fare_rules.txt
2. WHEN fare information is retrieved, THE Application SHALL display the calculated fare amount in Japanese Yen
3. IF fare information is not available for the selected Stop pair, THEN THE Application SHALL display a message indicating that fare information is unavailable
4. THE Fare Calculator SHALL support fare calculation for all Routes operated by the three bus operators (佐賀市営バス, 祐徳バス, 西鉄バス)
5. WHEN multiple fare rules apply to a Stop pair, THE Fare Calculator SHALL select the appropriate fare based on the Route and operator

### 要件2: 時刻表表示UI

**ユーザーストーリー:** ユーザーとして、バス停を選択したときに「時刻表を見る」ボタンを押して、そのバス停の詳細な時刻表を表示したい。これにより、バスの運行スケジュールを確認できる。

#### 受入基準

1. WHEN User selects a Stop on the map, THE Application SHALL display a button labeled "時刻表を見る"
2. WHEN User clicks the "時刻表を見る" button, THE Timetable Display SHALL show a route selection interface
3. THE route selection interface SHALL list all Routes that stop at the selected Stop
4. WHEN User selects a Route from the list, THE Timetable Display SHALL show timetable information for that Route at the selected Stop
5. THE Timetable Display SHALL include tabs for "平日" (weekdays) and "土日祝" (weekends and holidays)

### 要件3: 路線選択機能

**ユーザーストーリー:** ユーザーとして、時刻表を見る際に複数の路線から選択したい。これにより、特定の路線の時刻表を確認できる。

#### 受入基準

1. WHEN Timetable Display shows the route selection interface, THE Application SHALL display a list of all Routes serving the selected Stop
2. THE route selection list SHALL include the Route name and operator name for each Route
3. WHEN User clicks on a Route in the list, THE Timetable Display SHALL navigate to the detailed timetable view for that Route
4. THE Application SHALL retrieve Route information from routes.txt and trips.txt

### 要件4: 経路地図表示

**ユーザーストーリー:** ユーザーとして、選択した路線の経路を地図上で確認したい。これにより、バスがどのルートを通るか視覚的に理解できる。

#### 受入基準

1. WHEN User views a Route timetable, THE Application SHALL display a button labeled "地図で表示する"
2. WHEN User clicks the "地図で表示する" button, THE Application SHALL display a map showing the Route path
3. THE map SHALL highlight all Stops along the selected Route
4. THE map SHALL draw a line connecting the Stops in the order they are served by the Route
5. THE Application SHALL retrieve Stop sequence information from stop_times.txt

### 要件5: 平日・土日祝タブ切り替え

**ユーザーストーリー:** ユーザーとして、時刻表を平日と土日祝で切り替えて表示したい。これにより、運行日に応じた正確な時刻を確認できる。

#### 受入基準

1. WHEN Timetable Display shows a Route timetable, THE Application SHALL display two tabs labeled "平日" and "土日祝"
2. WHEN User clicks the "平日" tab, THE Timetable Display SHALL show departure times for weekday service
3. WHEN User clicks the "土日祝" tab, THE Timetable Display SHALL show departure times for weekend and holiday service
4. THE Application SHALL determine Service Day Type using service_id from calendar.txt
5. THE Timetable Display SHALL sort departure times in chronological order within each tab

### 要件6: 時刻表データ表示

**ユーザーストーリー:** ユーザーとして、選択したバス停における各便の発車時刻を一覧で確認したい。これにより、次のバスの時刻を素早く把握できる。

#### 受入基準

1. WHEN Timetable Display shows a Route timetable for a Service Day Type, THE Application SHALL display all departure times for that Stop
2. THE departure times SHALL be displayed in HH:MM format (24-hour notation)
3. THE Timetable Display SHALL include the destination (trip_headsign) for each departure
4. WHEN a departure time is after midnight (25:00 or later in GTFS format), THE Application SHALL display it correctly as next-day time
5. THE Application SHALL retrieve departure times from stop_times.txt filtered by the selected Stop, Route, and Service Day Type
