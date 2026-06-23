/**
 * FIFO (선입선출) 원가 계산 유틸리티
 * 
 * 커피 생두 재고의 원가를 FIFO 방식으로 계산합니다.
 * - 가장 오래된 입고 로트부터 순차적으로 소진
 * - 각 로트의 단가를 기반으로 투입/잔여 원가 산출
 */

/**
 * FIFO 기준으로 투입 수량만큼 로트를 소진하고, 투입 원가와 잔여 원가를 계산합니다.
 * 
 * @param {Array} lots - 입고 로트 배열 (입고일 오름차순 정렬 필요)
 *   각 로트: { id, quantity, remainingQty, unitCostKRW, unitCostUSD, receiptDate, ... }
 * @param {number} consumedQty - 소진(투입)할 총 수량 (KG)
 * @returns {Object} {
 *   consumedCostKRW: 투입 원가 (KRW),
 *   consumedCostUSD: 투입 원가 (USD),
 *   consumedLots: 소진 내역 [{ lotId, qty, costKRW, costUSD, unitCostKRW, unitCostUSD }],
 *   remainingLots: 갱신된 잔여 로트 배열,
 *   remainingCostKRW: 잔여 원가 (KRW),
 *   remainingCostUSD: 잔여 원가 (USD),
 *   remainingQtyTotal: 잔여 수량 합계
 * }
 */
export function calculateFIFO(lots, consumedQty) {
  // 로트를 입고일 오름차순, 같은 날이면 lotNumber 오름차순 정렬
  const sortedLots = [...lots].sort((a, b) => {
    const dateComp = (a.receiptDate || '').localeCompare(b.receiptDate || '');
    if (dateComp !== 0) return dateComp;
    return (a.lotNumber || 0) - (b.lotNumber || 0);
  });

  let remaining = consumedQty;
  const consumedLots = [];
  const updatedLots = [];

  for (const lot of sortedLots) {
    const lotRemaining = lot.remainingQty || 0;

    if (remaining <= 0 || lotRemaining <= 0) {
      // 소진 완료 or 이미 소진된 로트: 그대로 보존
      updatedLots.push({ ...lot });
      continue;
    }

    if (lotRemaining <= remaining) {
      // 로트 전량 소진
      consumedLots.push({
        lotId: lot.id,
        contractNo: lot.contractNo,
        origin: lot.origin,
        receiptDate: lot.receiptDate,
        qty: lotRemaining,
        costKRW: lotRemaining * (lot.unitCostKRW || 0),
        costUSD: lotRemaining * (lot.unitCostUSD || 0),
        unitCostKRW: lot.unitCostKRW || 0,
        unitCostUSD: lot.unitCostUSD || 0,
      });
      remaining -= lotRemaining;
      updatedLots.push({
        ...lot,
        remainingQty: 0,
        status: 'depleted',
      });
    } else {
      // 로트 부분 소진
      consumedLots.push({
        lotId: lot.id,
        contractNo: lot.contractNo,
        origin: lot.origin,
        receiptDate: lot.receiptDate,
        qty: remaining,
        costKRW: remaining * (lot.unitCostKRW || 0),
        costUSD: remaining * (lot.unitCostUSD || 0),
        unitCostKRW: lot.unitCostKRW || 0,
        unitCostUSD: lot.unitCostUSD || 0,
      });
      updatedLots.push({
        ...lot,
        remainingQty: lotRemaining - remaining,
        status: 'active',
      });
      remaining = 0;
    }
  }

  const consumedCostKRW = consumedLots.reduce((sum, l) => sum + l.costKRW, 0);
  const consumedCostUSD = consumedLots.reduce((sum, l) => sum + l.costUSD, 0);
  const remainingCostKRW = updatedLots.reduce(
    (sum, l) => sum + (l.remainingQty || 0) * (l.unitCostKRW || 0),
    0
  );
  const remainingCostUSD = updatedLots.reduce(
    (sum, l) => sum + (l.remainingQty || 0) * (l.unitCostUSD || 0),
    0
  );
  const remainingQtyTotal = updatedLots.reduce(
    (sum, l) => sum + (l.remainingQty || 0),
    0
  );

  return {
    consumedCostKRW,
    consumedCostUSD,
    consumedLots,
    remainingLots: updatedLots,
    remainingCostKRW,
    remainingCostUSD,
    remainingQtyTotal,
  };
}

/**
 * 월별 재고 원가를 계산합니다.
 * 
 * 기초재고 + 매입 - 잔여재고(공장 입력) = 투입 수량
 * FIFO 기준으로 투입 원가와 잔여 원가를 산출
 * 
 * @param {Array} openingLots - 기초재고 로트 배열 (전월 잔여 로트)
 * @param {Array} purchaseLots - 당월 매입(입고) 로트 배열
 * @param {number} closingQty - 잔여재고 수량 (공장 입력 KG)
 * @returns {Object} 월별 원가 계산 결과
 */
export function calculateMonthlyInventory(openingLots, purchaseLots, closingQty) {
  // 기초재고 수량 합계
  const openingQty = openingLots.reduce((sum, l) => sum + (l.remainingQty || 0), 0);
  const openingCostKRW = openingLots.reduce(
    (sum, l) => sum + (l.remainingQty || 0) * (l.unitCostKRW || 0),
    0
  );

  // 당월 매입 수량 합계
  const purchaseQty = purchaseLots.reduce((sum, l) => sum + (l.quantity || 0), 0);
  const purchaseCostKRW = purchaseLots.reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.unitCostKRW || 0),
    0
  );

  // 투입 수량 계산
  const consumedQty = Math.max(0, openingQty + purchaseQty - closingQty);

  // 전체 로트 합산 (기초 + 매입)
  const allLots = [
    ...openingLots,
    ...purchaseLots.map((l) => ({
      ...l,
      remainingQty: l.quantity || l.remainingQty || 0,
      status: 'active',
    })),
  ];

  // FIFO 계산
  const fifoResult = calculateFIFO(allLots, consumedQty);

  return {
    openingQty,
    openingCostKRW,
    purchaseQty,
    purchaseCostKRW,
    consumedQty,
    consumedCostKRW: fifoResult.consumedCostKRW,
    consumedCostUSD: fifoResult.consumedCostUSD,
    consumedLots: fifoResult.consumedLots,
    closingQty,
    closingCostKRW: fifoResult.remainingCostKRW,
    closingCostUSD: fifoResult.remainingCostUSD,
    remainingLots: fifoResult.remainingLots.filter((l) => (l.remainingQty || 0) > 0),
    avgUnitCost: consumedQty > 0 ? fifoResult.consumedCostKRW / consumedQty : 0,
  };
}

/**
 * 특정 수량의 재고 원가를 FIFO 기준으로 역산합니다.
 * (잔여재고 원가 평가: 뒤에서부터 계산)
 * 
 * @param {Array} lots - 전체 로트 배열
 * @param {number} targetQty - 평가할 수량
 * @returns {Object} { totalCostKRW, avgUnitCost, lotBreakdown }
 */
export function evaluateInventoryCost(lots, targetQty) {
  // 잔여재고는 가장 최근 로트부터 역순으로 매칭 (FIFO의 반대)
  const sortedLots = [...lots].sort((a, b) => {
    const dateComp = (b.receiptDate || '').localeCompare(a.receiptDate || '');
    if (dateComp !== 0) return dateComp;
    return (b.lotNumber || 0) - (a.lotNumber || 0);
  });

  let remaining = targetQty;
  const breakdown = [];

  for (const lot of sortedLots) {
    const lotRemaining = lot.remainingQty || lot.quantity || 0;

    if (remaining <= 0 || lotRemaining <= 0) continue;

    const used = Math.min(lotRemaining, remaining);
    breakdown.push({
      lotId: lot.id,
      contractNo: lot.contractNo,
      origin: lot.origin,
      receiptDate: lot.receiptDate,
      qty: used,
      costKRW: used * (lot.unitCostKRW || 0),
      unitCostKRW: lot.unitCostKRW || 0,
    });
    remaining -= used;
  }

  const totalCostKRW = breakdown.reduce((sum, b) => sum + b.costKRW, 0);

  return {
    totalCostKRW,
    avgUnitCost: targetQty > 0 ? totalCostKRW / targetQty : 0,
    lotBreakdown: breakdown,
  };
}

/**
 * 숫자를 한국 원화 형식으로 포맷합니다.
 * @param {number} value
 * @returns {string}
 */
export function formatCostKRW(value) {
  if (value === null || value === undefined || isNaN(value)) return '₩0';
  return '₩' + Math.round(value).toLocaleString('ko-KR');
}

/**
 * 숫자를 KG 형식으로 포맷합니다.
 * @param {number} value
 * @returns {string}
 */
export function formatKG(value) {
  if (value === null || value === undefined || isNaN(value)) return '0 kg';
  return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + ' kg';
}

/**
 * 숫자를 백만원 단위로 포맷합니다.
 * @param {number} value
 * @returns {string}
 */
export function formatMillionKRW(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const millions = value / 1000000;
  return millions.toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + 'M';
}
