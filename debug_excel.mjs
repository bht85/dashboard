/**
 * 디버그 스크립트: 자금시재현황 엑셀 파일을 실제 파싱하여
 * 102-910076-52504 계좌가 왜 업로드에서 누락되는지 분석합니다.
 *
 * 사용법: node debug_excel.mjs "파일경로.xls"
 */

import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const filePath = process.argv[2];
if (!filePath) {
  console.error('사용법: node debug_excel.mjs "파일경로.xls"');
  process.exit(1);
}

const TARGET_ACCOUNT = '10291007652504'; // 102-910076-52504 대시 제거
const MARKERS = ['퇴직연금신탁', '71452', '48252', '10291017771452'];

const bstr = readFileSync(filePath);
const wb = XLSX.read(bstr, { type: 'buffer' });
const wsname = wb.SheetNames[0];
const ws = wb.Sheets[wsname];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`\n📄 파일: ${filePath}`);
console.log(`📊 총 행 수: ${data.length}`);
console.log(`📋 시트명: ${wsname}\n`);
console.log('='.repeat(80));

let currentEntity = '';
let currentGroup = '';
let targetFound = false;

data.forEach((row, idx) => {
  const rawRow = row.map(c => (c !== undefined && c !== null ? String(c).trim() : ''));

  if (idx < 1) {
    console.log(`[Row ${idx}] HEADER: ${rawRow.slice(0, 11).join(' | ')}\n`);
    return;
  }

  const valEntity = rawRow[0] || '';
  const valGroup  = rawRow[1] || '';
  const valBank   = rawRow[2] || '';
  const valAccount = rawRow[3] || '';
  const valNickname = rawRow[4] || '';
  const valType   = rawRow[5] || '';
  const valCurrency = rawRow[6] ? rawRow[6].toUpperCase() : 'KRW';
  const valPrev   = rawRow[7] || '';
  const valIn     = rawRow[8] || '';
  const valOut    = rawRow[9] || '';
  const valTotal  = rawRow[10] || '';

  // 대상 계좌 포함 여부 확인 (대시 제거 비교)
  const normalizedAccount = valAccount.replace(/[\s-]/g, '');
  const isTarget = normalizedAccount === TARGET_ACCOUNT || valAccount.includes('910076');

  // --- 파싱 로직 시뮬레이션 (CashStatusPage.jsx 기준) ---

  // sticky 값 업데이트
  if (valEntity && !valEntity.includes('계') && !valEntity.includes('합계')) {
    currentEntity = valEntity;
  }
  if (valGroup && !valGroup.includes('계')) {
    currentGroup = valGroup;
  }

  // 탈락 조건 1: 계좌와 은행 모두 없음
  const drop1 = !valAccount && !valBank;
  // 탈락 조건 2: 총계/합계/소계 행
  const drop2 = valEntity.includes('총계') || valEntity.includes('합계') || valGroup.includes('소계');
  // 탈락 조건 3: isExcludedAccount
  const entryJson = JSON.stringify({ entity: currentEntity, group: currentGroup, bank: valBank, account: valAccount, nickname: valNickname, type: valType, currency: valCurrency });
  const normalized = entryJson.replace(/[\s-]/g, '');
  const drop3 = MARKERS.some(m => entryJson.includes(m) || normalized.includes(m));

  const isDropped = drop1 || drop2 || drop3;

  if (isTarget || isDropped && idx < 20) {
    console.log(`\n[Row ${idx}] ${isTarget ? '🎯 대상 계좌!' : '❌ 탈락'}`);
    console.log(`  A(entity): "${valEntity}" → currentEntity: "${currentEntity}"`);
    console.log(`  B(group):  "${valGroup}" → currentGroup: "${currentGroup}"`);
    console.log(`  C(bank):   "${valBank}"`);
    console.log(`  D(account): "${valAccount}" → normalized: "${normalizedAccount}"`);
    console.log(`  E(nickname): "${valNickname}"  F(type): "${valType}"  G(currency): "${valCurrency}"`);
    console.log(`  H(prev): "${valPrev}"  I(in): "${valIn}"  J(out): "${valOut}"  K(total): "${valTotal}"`);
    console.log(`  탈락 이유:`);
    if (drop1) console.log(`    ❌ [drop1] 계좌(D)와 은행(C) 모두 비어있음`);
    if (drop2) {
      if (valEntity.includes('총계') || valEntity.includes('합계')) console.log(`    ❌ [drop2] A열 = "${valEntity}" (총계/합계 포함)`);
      if (valGroup.includes('소계')) console.log(`    ❌ [drop2] B열 = "${valGroup}" (소계 포함) ← 주요 용의자!`);
    }
    if (drop3) console.log(`    ❌ [drop3] isExcludedAccount 마커 매칭: ${MARKERS.filter(m => entryJson.includes(m) || normalized.includes(m))}`);
    if (!isDropped) console.log(`    ✅ 탈락 없음 → 정상 파싱됨`);
    if (isTarget) targetFound = true;
  }
});

console.log('\n' + '='.repeat(80));
if (!targetFound) {
  console.log('⚠️  102-910076-52504 계좌를 엑셀에서 전혀 찾지 못했습니다!');
  console.log('   → 엑셀 파일에 해당 계좌가 없거나, Column D(4번째 열)에 없을 수 있습니다.');
} else {
  console.log('✅ 분석 완료. 위의 탈락 이유를 확인하세요.');
}

// 전체 행 출력 (처음 15행)
console.log('\n\n[전체 데이터 미리보기 - 처음 15행]\n');
data.slice(0, 15).forEach((row, i) => {
  const r = row.map(c => (c !== undefined && c !== null ? String(c).trim() : ''));
  console.log(`Row ${i}: ${r.slice(0, 11).map(v => v.padEnd(20)).join('|')}`);
});
