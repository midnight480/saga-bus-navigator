# 時刻表検索機能 - 要件定義書

## Introduction

佐賀市内の複数事業者（佐賀市営バス、祐徳バス、西鉄バス）の時刻表データを横断的に検索し、出発地から目的地までの直通便を表示する機能。ユーザーは乗車バス停、降車バス停、乗車時刻を指定して検索を実行し、該当する便の一覧を時刻順に確認できる。

## Glossary

- **System**: 時刻表検索システム
- **User**: 佐賀市内のバスを利用するスマートフォンユーザー（10代〜50代）
- **Bus Stop**: バス停（緯度・経度情報を持つ）
- **Route**: 路線（事業者、路線名、経由バス停の順序を持つ）
- **Trip**: 便（特定の路線の特定の運行）
- **Timetable Data**: 時刻表データ（CSV形式、約1,064件）
- **Departure Stop**: 乗車バス停
- **Arrival Stop**: 降車バス停
- **Departure Time**: 乗車時刻
- **Search Result**: 検索結果（便の一覧）
- **Direct Service**: 直通便（乗り換えなしで目的地に到着する便）
- **NTP Server**: ntp.nict.jp（正確な時刻を提供するサーバー）
- **Weekday Type**: 曜日区分（平日、土日祝、特殊ダイヤ）

## Requirements

### Requirement 1: バス停名による検索

**User Story:** ユーザーとして、乗車バス停名と降車バス停名を入力して検索したい。なぜなら、目的のバス停名を知っている場合に素早く検索できるから。

#### Acceptance Criteria

1. WHEN User enters a partial Bus Stop name in the departure field, THE System SHALL display a list of matching Bus Stop names from Timetable Data
2. WHEN User enters a partial Bus Stop name in the arrival field, THE System SHALL display a list of matching Bus Stop names from Timetable Data
3. WHEN User selects a Departure Stop and an Arrival Stop from the suggestion lists, THE System SHALL enable the search execution button
4. WHEN User selects the same Bus Stop for both Departure Stop and Arrival Stop, THE System SHALL display an error message stating that departure and arrival stops must be different
5. THE System SHALL support incremental search with a minimum of 1 character input for Bus Stop name matching

### Requirement 2: 時刻指定による検索

**User Story:** ユーザーとして、「出発時刻指定」「到着時刻指定」「今すぐ」「始発」「終電」のいずれかを選択して検索したい。なぜなら、状況に応じて最適な便を見つけたいから。

#### Acceptance Criteria

1. THE System SHALL provide five search time options: "Departure Time", "Arrival Time", "Now", "First Bus", and "Last Bus"
2. WHEN User selects "Departure Time" option, THE System SHALL display a time picker and search for trips departing at or after the specified time
3. WHEN User selects "Arrival Time" option, THE System SHALL display a time picker and search for trips arriving at or before the specified time
4. WHEN User selects "Now" option, THE System SHALL retrieve current time from NTP Server (ntp.nict.jp) with a timeout of 5 seconds and search for trips departing at or after current time
5. IF NTP Server connection fails, THEN THE System SHALL use device local time and display a warning message to User
6. WHEN User selects "First Bus" option, THE System SHALL search for the first Trip of the current day for the specified route
7. WHEN User selects "Last Bus" option, THE System SHALL search for the last Trip of the current day for the specified route
8. THE System SHALL display time picker in 24-hour format with hour and minute selection

### Requirement 3: 曜日・祝日判定

**User Story:** ユーザーとして、検索時に自動的に平日・休日を判定してほしい。なぜなら、手動で選択する手間を省きたいから。

#### Acceptance Criteria

1. THE System SHALL determine Weekday Type automatically based on current date from NTP Server
2. WHEN current date is Monday through Friday AND NOT a Japanese national holiday, THE System SHALL classify it as "平日" (weekday)
3. WHEN current date is Saturday OR Sunday OR a Japanese national holiday, THE System SHALL classify it as "土日祝" (weekend/holiday)
4. THE System SHALL load Japanese holiday calendar from holidays-jp.github.io API (format: /api/v1/{year}/datetime.json) with a timeout of 5 seconds
5. IF holiday calendar API fails, THEN THE System SHALL use day-of-week only (Monday-Friday as weekday, Saturday-Sunday as weekend)
6. THE System SHALL cache holiday calendar data by year in memory for the duration of the session

### Requirement 4: 直通便の検索実行

**User Story:** ユーザーとして、指定した条件で直通便を検索したい。なぜなら、乗り換えなしで目的地に到着できる便を知りたいから。

#### Acceptance Criteria

1. WHEN User executes search with valid Departure Stop, Arrival Stop, and Departure Time, THE System SHALL query Timetable Data for Direct Service trips
2. THE System SHALL filter trips where Departure Stop appears before Arrival Stop in the same Trip's stop sequence
3. THE System SHALL filter trips where departure time at Departure Stop is equal to or later than specified Departure Time
4. THE System SHALL determine current Weekday Type based on NTP Server time and filter trips accordingly
5. THE System SHALL complete the search query within 2 seconds for datasets up to 2,000 records

### Requirement 5: 検索結果の表示

**User Story:** ユーザーとして、検索結果を時刻順に一覧で確認したい。なぜなら、複数の選択肢から最適な便を選びたいから。

#### Acceptance Criteria

1. THE System SHALL display Search Result as a list sorted by departure time in ascending order
2. WHEN Search Result contains trips, THE System SHALL display for each trip: departure time, arrival time, travel duration, fare, operator name, and route name
3. WHEN Search Result contains zero trips, THE System SHALL display a message stating "No direct buses found for the specified conditions"
4. THE System SHALL display up to 20 trips in the initial Search Result view
5. WHEN Search Result contains more than 20 trips, THE System SHALL provide a "Load More" button to display additional trips in increments of 20

### Requirement 6: 運賃情報の表示

**User Story:** ユーザーとして、各便の運賃を確認したい。なぜなら、移動コストを事前に把握したいから。

#### Acceptance Criteria

1. THE System SHALL retrieve fare information from fare data (fare_major_routes.csv or fare_info.csv) based on Departure Stop, Arrival Stop, and operator
2. WHEN exact fare data exists for the route, THE System SHALL display the adult fare and child fare
3. WHEN exact fare data does not exist, THE System SHALL display "Fare information unavailable" message
4. THE System SHALL display fare in Japanese Yen with the "円" symbol
5. THE System SHALL display both adult fare and child fare in the format "Adult: XXX円 / Child: XXX円"

### Requirement 7: エラーハンドリング

**User Story:** ユーザーとして、入力エラーや検索エラーが発生した際に明確なメッセージを受け取りたい。なぜなら、問題を理解して修正したいから。

#### Acceptance Criteria

1. WHEN User attempts to execute search without selecting Departure Stop, THE System SHALL display an error message "Please select a departure bus stop"
2. WHEN User attempts to execute search without selecting Arrival Stop, THE System SHALL display an error message "Please select an arrival bus stop"
3. WHEN Timetable Data fails to load, THE System SHALL display an error message "Failed to load timetable data. Please try again later"
4. WHEN NTP Server connection fails during "Now" search, THE System SHALL display a warning message "Using device time (NTP server unavailable)"
5. THE System SHALL clear error messages when User corrects the input condition

### Requirement 8: データの読み込みと管理

**User Story:** ユーザーとして、アプリ起動時に時刻表データが自動的に読み込まれることを期待する。なぜなら、待ち時間なく検索を開始したいから。

#### Acceptance Criteria

1. WHEN System initializes, THE System SHALL load Timetable Data from timetable_all_complete.csv file
2. WHEN System initializes, THE System SHALL load Bus Stop data from bus_stop.csv file
3. WHEN System initializes, THE System SHALL load fare data from fare_major_routes.csv file
4. THE System SHALL complete data loading within 3 seconds for total data size up to 200KB
5. WHEN data loading fails, THE System SHALL display an error message and provide a retry button
