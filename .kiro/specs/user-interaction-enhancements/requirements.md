# 要件定義書

## はじめに

本ドキュメントは、佐賀バスナビゲーターアプリにおけるユーザー操作機能の強化に関する要件を定義します。ユーザーが地図表示や検索結果をより効率的に管理し、検索結果をカレンダーに登録できる機能を追加します。

## 用語集

- **System**: 佐賀バスナビゲーターアプリケーション
- **User**: アプリケーションを使用するエンドユーザー
- **Map_Display**: 地図表示エリア（OpenStreetMapベース）
- **Route_Visualization**: 地図上に表示されたバス経路の可視化
- **Search_Results**: バス停検索または時刻表検索の結果リスト
- **Calendar_Event**: iCalまたはGoogle Calendar形式のカレンダーイベント
- **Current_Location**: ユーザーの現在地（GPS座標）
- **Clear_Button**: データや表示をクリアするためのボタンUI要素

## 要件

### 要件1: 地図経路クリア機能

**ユーザーストーリー:** ユーザーとして、地図上に表示された経路情報をクリアして、新しい検索を開始したい

#### 受入基準

1. WHEN THE User SHALL click "地図で表示する" button, THE System SHALL display a "経路をクリア" button near the Map_Display
2. WHEN THE User SHALL click the "経路をクリア" button, THE System SHALL remove all Route_Visualization from the Map_Display
3. WHEN THE User SHALL click the "経路をクリア" button, THE System SHALL remove all bus stop markers associated with the current route from the Map_Display
4. WHEN THE User SHALL click the "経路をクリア" button, THE System SHALL hide the "経路をクリア" button
5. WHEN THE System SHALL clear the route, THE Map_Display SHALL remain visible with the base map layer

### 要件2: 現在地表示機能

**ユーザーストーリー:** ユーザーとして、地図上で自分の現在地を確認し、現在地を中心に地図を表示したい

#### 受入基準

1. THE System SHALL display a current location button with a recognizable icon (◎) on the Map_Display
2. THE System SHALL position the current location button at the bottom-right corner of the Map_Display
3. THE System SHALL render the current location button in the foreground layer with a z-index value greater than the map layer
4. WHEN THE User SHALL click the current location button, THE System SHALL request the Current_Location from the browser geolocation API
5. IF THE User SHALL grant location permission, THEN THE System SHALL center the Map_Display on the Current_Location
6. IF THE User SHALL grant location permission, THEN THE System SHALL display a marker at the Current_Location on the Map_Display
7. IF THE User SHALL deny location permission, THEN THE System SHALL display an error message stating "位置情報の取得に失敗しました"
8. WHEN THE System SHALL center the map on Current_Location, THE Map_Display SHALL zoom to a level of 15

### 要件3: 検索結果クリア機能

**ユーザーストーリー:** ユーザーとして、表示されている検索結果をクリアして、新しい検索を開始したい

#### 受入基準

1. WHEN THE System SHALL display Search_Results, THE System SHALL display a "検索結果をクリア" button below the search input field
2. WHEN THE User SHALL click the "検索結果をクリア" button, THE System SHALL remove all items from the Search_Results display
3. WHEN THE User SHALL click the "検索結果をクリア" button, THE System SHALL clear the search input field
4. WHEN THE User SHALL click the "検索結果をクリア" button, THE System SHALL hide the "検索結果をクリア" button
5. WHEN THE Search_Results SHALL be empty, THE System SHALL not display the "検索結果をクリア" button

### 要件4: カレンダー登録機能

**ユーザーストーリー:** ユーザーとして、検索したバスの時刻表をカレンダーに登録して、乗車予定を管理したい

#### 受入基準

1. WHEN THE System SHALL display a timetable search result with departure and arrival times, THE System SHALL display a "カレンダーに登録" button below the "地図で表示" button
2. WHEN THE User SHALL click the "カレンダーに登録" button, THE System SHALL display a modal dialog with two options: "iCal形式でダウンロード" and "Google Calendarで開く"
3. WHEN THE User SHALL select "iCal形式でダウンロード", THE System SHALL generate a Calendar_Event in iCal format with the departure time, arrival time, bus stop names, and route information
4. WHEN THE User SHALL select "iCal形式でダウンロード", THE System SHALL trigger a file download with the filename format "bus-schedule-YYYYMMDD-HHMM.ics"
5. WHEN THE User SHALL select "Google Calendarで開く", THE System SHALL open a new browser tab with the Google Calendar event creation URL pre-filled with the departure time, arrival time, bus stop names, and route information
6. THE Calendar_Event SHALL include the following fields: event title (format: "バス: [出発バス停] → [到着バス停]"), start time (departure time), end time (arrival time), location (departure bus stop name), and description (route name and fare information)
7. WHEN THE System SHALL generate the Calendar_Event, THE System SHALL use the current date combined with the departure time to create the event datetime
8. IF THE arrival time SHALL be earlier than the departure time (indicating next-day arrival), THEN THE System SHALL set the event end date to the next day
