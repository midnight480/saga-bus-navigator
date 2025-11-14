#!/usr/bin/env python3
import csv

def read_csv(path):
    with open(path, 'r', encoding='utf-8') as f:
        return list(csv.DictReader(f))

# 既存のバス停データを読み込み
existing_stops = {}
with open('./data/master/bus_stop.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['バス停名'].startswith('#'):
            continue
        existing_stops[row['バス停ID']] = row

# GTFSのstopsデータを読み込み
gtfs_stops = read_csv('./open_data/saga-2025-12-01/stops.txt')

# 不足しているバス停を追加
new_stops = []
for stop in gtfs_stops:
    stop_name = stop['stop_name']
    if stop_name not in existing_stops:
        new_stops.append({
            'バス停名': stop_name,
            '緯度': stop['stop_lat'],
            '経度': stop['stop_lon'],
            'バス停ID': stop_name
        })

if new_stops:
    print(f"新しいバス停を{len(new_stops)}件追加します")
    with open('./data/master/bus_stop.csv', 'a', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['バス停名', '緯度', '経度', 'バス停ID'])
        writer.writerows(new_stops)
    print(f"追加したバス停: {', '.join([s['バス停名'] for s in new_stops[:5]])}{'...' if len(new_stops) > 5 else ''}")
else:
    print("バス停データは最新です")

print("\n同期完了")
