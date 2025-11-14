#!/usr/bin/env python3
import csv
from pathlib import Path
from datetime import datetime

class GTFSLoader:
    def __init__(self, gtfs_dir='./open_data/saga-2025-12-01'):
        self.gtfs_dir = Path(gtfs_dir)
        self._cache = {}
    
    def _load(self, filename):
        if filename not in self._cache:
            with open(self.gtfs_dir / filename, 'r', encoding='utf-8') as f:
                self._cache[filename] = list(csv.DictReader(f))
        return self._cache[filename]
    
    def get_stops(self):
        """全バス停を取得"""
        return self._load('stops.txt')
    
    def get_routes(self):
        """全路線を取得"""
        return self._load('routes.txt')
    
    def get_trips(self):
        """全便を取得"""
        return self._load('trips.txt')
    
    def get_stop_times(self):
        """全停車時刻を取得"""
        return self._load('stop_times.txt')
    
    def get_agencies(self):
        """全事業者を取得"""
        return self._load('agency.txt')
    
    def find_stop(self, stop_name):
        """バス停名で検索"""
        return [s for s in self.get_stops() if stop_name in s['stop_name']]
    
    def get_route_trips(self, route_id):
        """特定路線の便を取得"""
        return [t for t in self.get_trips() if t['route_id'] == route_id]
    
    def get_trip_stops(self, trip_id):
        """特定便の停車バス停と時刻を取得"""
        stops = [st for st in self.get_stop_times() if st['trip_id'] == trip_id]
        return sorted(stops, key=lambda x: int(x['stop_sequence']))

if __name__ == '__main__':
    loader = GTFSLoader()
    print(f"バス停数: {len(loader.get_stops())}")
    print(f"路線数: {len(loader.get_routes())}")
    print(f"便数: {len(loader.get_trips())}")
    print(f"事業者数: {len(loader.get_agencies())}")
