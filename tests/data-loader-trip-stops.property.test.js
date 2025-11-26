/**
 * DataLoader - Trip-Stopマッピングのプロパティテスト
 * Feature: data-structure-optimization, Property 8, 9, 10
 * Validates: Requirements 3.2, 3.3, 3.4
 */
import { describe, it } from 'vitest';
import * as fc from 'fast-check';

// data-loader.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const dataLoaderCode = fs.readFileSync(
  path.join(process.cwd(), 'js/data-loader.js'),
  'utf-8'
);
eval(dataLoaderCode);

const DataLoader = global.DataLoader;

// 英数字のみの非空白文字列ジェネレータ（現実的なデータ）
// プロトタイプチェーンのプロパティ名を除外
const prototypeProps = ['toString', 'valueOf', 'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', '__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'];
const nonEmptyString = (minLength, maxLength) => 
  fc.stringMatching(/^[a-zA-Z0-9_-]+$/)
    .filter(s => s.length >= minLength && s.length <= maxLength && s.trim().length > 0)
    .filter(s => !prototypeProps.includes(s));

// 時刻文字列ジェネレータ（HH:MM:SS形式）
const timeString = fc.tuple(
  fc.integer({ min: 0, max: 23 }),
  fc.integer({ min: 0, max: 59 }),
  fc.integer({ min: 0, max: 59 })
).map(([h, m, s]) => 
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
);

describe('DataLoader - Trip-Stopマッピング プロパティテスト', () => {
  describe('Property 8: Trip-Stopマッピングの完全性 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 8: Trip-Stopマッピングの完全性
     * Validates: Requirements 3.2
     * 
     * 任意の有効なtripIdにおいて、
     * Trip-Stopマッピングから停留所IDの順序付きリストを取得できる
     */
    it('should retrieve ordered stop list for any valid tripId', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              tripId: nonEmptyString(1, 20),
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 1, maxLength: 30 }
          ),
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (stopTimesData, stopsData) => {
            const loader = new DataLoader();
            loader.stopTimes = stopTimesData.map(st => ({
              trip_id: st.tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // 全てのtripIdについて検証
            const tripIds = new Set(stopTimesData.map(st => st.tripId));
            
            for (const tripId of tripIds) {
              // マッピングにtripIdが存在することを検証
              if (!mapping[tripId]) {
                return false;
              }
              
              // マッピングが配列であることを検証
              if (!Array.isArray(mapping[tripId])) {
                return false;
              }
              
              // 該当するstop_timesエントリが全て含まれることを検証
              const expectedStops = stopTimesData.filter(st => st.tripId === tripId);
              if (mapping[tripId].length !== expectedStops.length) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * マッピングの構造が正しいことを検証
     */
    it('should have correct mapping structure with tripId keys and array values', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              tripId: nonEmptyString(1, 20),
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 1, maxLength: 30 }
          ),
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (stopTimesData, stopsData) => {
            const loader = new DataLoader();
            loader.stopTimes = stopTimesData.map(st => ({
              trip_id: st.tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // マッピングがオブジェクトであることを検証
            if (typeof mapping !== 'object' || mapping === null) {
              return false;
            }
            
            // 各tripIdのエントリが配列であることを検証
            for (const tripId in mapping) {
              if (!Array.isArray(mapping[tripId])) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: 停留所リストの必須フィールド (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 9: 停留所リストの必須フィールド
     * Validates: Requirements 3.3
     * 
     * 任意の停留所リストエントリにおいて、
     * stopId、stopName、sequence、arrivalTimeの全フィールドを含む
     */
    it('should include all required fields (stopId, stopName, sequence, arrivalTime) in each stop entry', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              tripId: nonEmptyString(1, 20),
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 1, maxLength: 30 }
          ),
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (stopTimesData, stopsData) => {
            const loader = new DataLoader();
            loader.stopTimes = stopTimesData.map(st => ({
              trip_id: st.tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // 全てのエントリについて必須フィールドを検証
            for (const tripId in mapping) {
              for (const stop of mapping[tripId]) {
                // stopIdフィールドが存在し、文字列であることを検証
                if (typeof stop.stopId !== 'string') {
                  return false;
                }
                
                // stopNameフィールドが存在し、文字列であることを検証
                if (typeof stop.stopName !== 'string') {
                  return false;
                }
                
                // sequenceフィールドが存在し、数値であることを検証
                if (typeof stop.sequence !== 'number') {
                  return false;
                }
                
                // arrivalTimeフィールドが存在し、文字列であることを検証
                if (typeof stop.arrivalTime !== 'string') {
                  return false;
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * フィールドの値が正しいことを検証
     */
    it('should have correct field values matching the original stop_times data', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // tripId
          fc.array(
            fc.record({
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (tripId, stops, stopsData) => {
            const loader = new DataLoader();
            loader.stopTimes = stops.map(st => ({
              trip_id: tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // tripIdのエントリが存在することを検証
            if (!mapping[tripId]) {
              return false;
            }
            
            // 各停留所エントリのフィールド値が正しいことを検証
            for (const stop of mapping[tripId]) {
              // 元のstop_timesデータに対応するエントリを検索
              const originalStop = stops.find(s => 
                s.stopId === stop.stopId && 
                s.stopSequence === stop.sequence
              );
              
              if (!originalStop) {
                return false;
              }
              
              // arrivalTimeが一致することを検証
              if (stop.arrivalTime !== originalStop.arrivalTime) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * stopNameが正しく取得されることを検証
     */
    it('should correctly retrieve stop names from gtfsStops', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // tripId
          fc.array(
            fc.record({
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tripId, stops) => {
            // 各stopIdに対応するstop_nameを生成
            const stopsData = stops.map(st => ({
              stop_id: st.stopId,
              stop_name: `Stop Name for ${st.stopId}`
            }));
            
            const loader = new DataLoader();
            loader.stopTimes = stops.map(st => ({
              trip_id: tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // tripIdのエントリが存在することを検証
            if (!mapping[tripId]) {
              return false;
            }
            
            // 各停留所エントリのstopNameが正しいことを検証
            for (const stop of mapping[tripId]) {
              const expectedName = `Stop Name for ${stop.stopId}`;
              if (stop.stopName !== expectedName) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * stopNameが見つからない場合は空文字列になることを検証
     */
    it('should use empty string for stopName when stop is not found in gtfsStops', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // tripId
          fc.array(
            fc.record({
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tripId, stops) => {
            const loader = new DataLoader();
            loader.stopTimes = stops.map(st => ({
              trip_id: tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            // gtfsStopsを空にする
            loader.gtfsStops = [];
            
            const mapping = loader.generateTripStops();
            
            // tripIdのエントリが存在することを検証
            if (!mapping[tripId]) {
              return false;
            }
            
            // 全ての停留所エントリのstopNameが空文字列であることを検証
            for (const stop of mapping[tripId]) {
              if (stop.stopName !== '') {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: 停留所リストのソート順 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 10: 停留所リストのソート順
     * Validates: Requirements 3.4
     * 
     * 任意のtripの停留所リストにおいて、
     * stop_sequenceが昇順にソートされている
     */
    it('should sort stop list by stop_sequence in ascending order', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // tripId
          fc.array(
            fc.record({
              stopId: nonEmptyString(1, 15),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              arrivalTime: timeString
            }),
            { minLength: 2, maxLength: 20 } // 最低2つのエントリでソートを検証
          ),
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (tripId, stops, stopsData) => {
            const loader = new DataLoader();
            loader.stopTimes = stops.map(st => ({
              trip_id: tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // tripIdのエントリが存在することを検証
            if (!mapping[tripId]) {
              return false;
            }
            
            const stopList = mapping[tripId];
            
            // 停留所リストが昇順にソートされていることを検証
            for (let i = 1; i < stopList.length; i++) {
              if (stopList[i].sequence < stopList[i - 1].sequence) {
                return false; // ソート順が正しくない
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * ランダムな順序のstop_timesデータでもソートされることを検証
     */
    it('should sort correctly even when stop_times data is in random order', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // tripId
          fc.integer({ min: 3, max: 15 }), // 停留所数
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (tripId, stopCount, stopsData) => {
            // 連続したstop_sequenceを生成
            const sequences = Array.from({ length: stopCount }, (_, i) => i + 1);
            
            // ランダムにシャッフル
            const shuffledSequences = [...sequences].sort(() => Math.random() - 0.5);
            
            const stops = shuffledSequences.map((seq, i) => ({
              stopId: `stop_${i}`,
              stopSequence: seq,
              arrivalTime: `08:${String(i).padStart(2, '0')}:00`
            }));
            
            const loader = new DataLoader();
            loader.stopTimes = stops.map(st => ({
              trip_id: tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // tripIdのエントリが存在することを検証
            if (!mapping[tripId]) {
              return false;
            }
            
            const stopList = mapping[tripId];
            
            // 停留所リストが昇順にソートされていることを検証
            for (let i = 0; i < stopList.length; i++) {
              if (stopList[i].sequence !== i + 1) {
                return false; // 期待される順序と一致しない
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 重複したstop_sequenceがある場合でもソートされることを検証
     */
    it('should handle duplicate stop_sequences gracefully', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // tripId
          fc.integer({ min: 1, max: 10 }), // 重複するsequence
          fc.integer({ min: 2, max: 5 }), // 重複数
          fc.array(
            fc.record({
              stop_id: nonEmptyString(1, 15),
              stop_name: nonEmptyString(1, 30)
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (tripId, duplicateSeq, duplicateCount, stopsData) => {
            // 重複したstop_sequenceを持つエントリを生成
            const stops = Array.from({ length: duplicateCount }, (_, i) => ({
              stopId: `stop_${i}`,
              stopSequence: duplicateSeq,
              arrivalTime: `08:${String(i).padStart(2, '0')}:00`
            }));
            
            const loader = new DataLoader();
            loader.stopTimes = stops.map(st => ({
              trip_id: tripId,
              stop_id: st.stopId,
              stop_sequence: String(st.stopSequence),
              arrival_time: st.arrivalTime
            }));
            loader.gtfsStops = stopsData;
            
            const mapping = loader.generateTripStops();
            
            // tripIdのエントリが存在することを検証
            if (!mapping[tripId]) {
              return false;
            }
            
            const stopList = mapping[tripId];
            
            // 全てのエントリが同じsequenceを持つことを検証
            for (const stop of stopList) {
              if (stop.sequence !== duplicateSeq) {
                return false;
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
