#!/bin/bash
set -e

GTFS_DIR="./gtfs/current"
BACKUP_DIR="./gtfs/archive/$(date +%Y%m%d)"
OPENDATA_URL="http://opendata.sagabus.info/"

echo "=== 佐賀バスGTFSデータ更新 ==="

# 現在のデータをバックアップ
if [ -d "$GTFS_DIR" ]; then
    echo "既存データをバックアップ: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    cp -r "$GTFS_DIR"/* "$BACKUP_DIR/"
fi

# 最新データを確認（手動でファイル名を指定）
echo "利用可能なデータ:"
echo "  - saga-current.zip (現行ダイヤ)"
echo "  - saga-YYYY-MM-DD.zip (将来のダイヤ)"
echo ""
echo "ダウンロードするファイル名を入力してください:"
read -r FILENAME

# ダウンロード
echo "ダウンロード中: $FILENAME"
wget -q "${OPENDATA_URL}${FILENAME}" -O /tmp/saga-gtfs.zip

# 解凍
echo "解凍中..."
mkdir -p "$GTFS_DIR"
unzip -o /tmp/saga-gtfs.zip -d "$GTFS_DIR"

# 検証
if [ -f "$GTFS_DIR/stops.txt" ]; then
    STOP_COUNT=$(wc -l < "$GTFS_DIR/stops.txt")
    echo "✓ 更新完了: バス停数 $STOP_COUNT"
else
    echo "✗ エラー: GTFSデータが不正です"
    exit 1
fi

rm /tmp/saga-gtfs.zip
echo "=== 更新完了 ==="
