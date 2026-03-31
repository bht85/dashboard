import React from 'react';
import { createPortal } from 'react-dom';
import { formatKRW, formatUSD } from '../../utils/formatters';

const PrintReport = ({
  selectedDate,
  composeAccounts,
  smartAccounts,
  composeTotal,
  smartTotal,
  fxSchedule = [],
  dailyIssues = {},
  exchangeRate = 1520,
  isFinal = false,
  usdPending = 0,
  usdThisWeek = 0,
  dailyWithdrawals = [],
}) => {
  const issueText = dailyIssues[selectedDate] || '';
  const printTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const totalKRWAssets = composeTotal.krw.balance + smartTotal.krw.balance;
  const totalUSDAssets = composeTotal.usd.balance + smartTotal.usd.balance;
  const totalKRWFinal = composeTotal.krw.final + smartTotal.krw.final;
  const totalUSDFinal = composeTotal.usd.final + smartTotal.usd.final;
  const totalNetOut =
    (composeTotal.krw.withdraw - composeTotal.krw.internal) +
    (smartTotal.krw.withdraw - smartTotal.krw.internal);
  const totalNetOutUSD =
    (composeTotal.usd.withdraw - composeTotal.usd.internal) +
    (smartTotal.usd.withdraw - smartTotal.usd.internal);

  const todayFXSchedule = fxSchedule.filter(
    (s) => s.date === selectedDate && s.status !== '송금 완료(집행)'
  );

  const renderTable = (accounts, totals, title, color) => (
    <div className="print-table-section">
      <div className="print-table-header" style={{ background: color }}>
        {title}
      </div>
      <table className="print-table" style={{ tableLayout: 'fixed', width: '100%' }}>
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '17%' }} />
          <col style={{ width: '16%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>계좌번호</th>
            <th>구분</th>
            <th style={{ textAlign: 'right' }}>전일 잔액</th>
            <th style={{ textAlign: 'right' }}>출금액</th>
            <th style={{ textAlign: 'right' }}>내부 입금</th>
            <th style={{ textAlign: 'right', color: '#3730a3' }}>출금 후 잔액</th>
            <th>별칭</th>
          </tr>
        </thead>
        <tbody>
          <tr className="print-total-row">
            <td colSpan={2} style={{ textAlign: 'center', fontWeight: 'bold' }}>합 계</td>
            <td style={{ textAlign: 'right' }}>
              <div>{formatKRW(totals.krw.balance)}</div>
              {totals.usd.balance > 0 && (
                <div style={{ color: '#2563eb', fontSize: '9px', fontWeight: 900 }}>
                  {formatUSD(totals.usd.balance)}
                </div>
              )}
            </td>
            <td style={{ textAlign: 'right', color: '#dc2626' }}>
              <div>{formatKRW(totals.krw.withdraw)}</div>
              {totals.usd.withdraw > 0 && (
                <div style={{ color: '#dc2626', fontSize: '9px', fontWeight: 900 }}>
                  {formatUSD(totals.usd.withdraw)}
                </div>
              )}
            </td>
            <td style={{ textAlign: 'right', color: '#16a34a' }}>
              <div>{totals.krw.internal > 0 ? formatKRW(totals.krw.internal) : '–'}</div>
              {totals.usd.internal > 0 && (
                <div style={{ color: '#16a34a', fontSize: '9px', fontWeight: 900 }}>
                  {formatUSD(totals.usd.internal)}
                </div>
              )}
            </td>
            <td style={{ textAlign: 'right', color: '#3730a3', fontWeight: 900 }}>
              <div>{formatKRW(totals.krw.final)}</div>
              {totals.usd.final > 0 && (
                <div style={{ color: '#1e40af', fontSize: '9px', fontWeight: 900 }}>
                  {formatUSD(totals.usd.final)}
                </div>
              )}
            </td>
            <td></td>
          </tr>
          {accounts.map((acc) => (
            <tr key={acc.id}>
              <td style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '10px' }}>{acc.no}</td>
              <td>{acc.type}</td>
              <td style={{ textAlign: 'right' }}>
                {acc.isUSD ? formatUSD(acc.balance) : formatKRW(acc.balance)}
              </td>
              <td style={{ textAlign: 'right', color: acc.withdraw > 0 ? '#dc2626' : '#94a3b8' }}>
                {acc.withdraw > 0
                  ? (acc.isUSD ? formatUSD(acc.withdraw) : formatKRW(acc.withdraw))
                  : '–'}
              </td>
              <td style={{ textAlign: 'right', color: acc.internal > 0 ? '#16a34a' : '#94a3b8' }}>
                {acc.internal > 0
                  ? (acc.isUSD ? formatUSD(acc.internal) : formatKRW(acc.internal))
                  : '–'}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 700, color: '#312e81' }}>
                {acc.isUSD ? formatUSD(acc.final) : formatKRW(acc.final)}
              </td>
              <td style={{ fontSize: '10px', color: '#64748b' }}>{acc.note || acc.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return createPortal(
    <div id="print-report-root">
      {/* ─── 1페이지 콘텐츠 ─── */}
      {/* ─── 보고서 헤더 ─── */}
      <div className="print-header">
        <div className="print-header-left">
          <div className="print-company-badge">CONFIDENTIAL</div>
          <h1 className="print-title">일일 자금 일보</h1>
          <p className="print-subtitle">Daily Treasury Report</p>
        </div>
        <div className="print-header-right">
          <table className="print-meta-table">
            <tbody>
              <tr>
                <td className="print-meta-label">기준일</td>
                <td className="print-meta-value">{selectedDate}</td>
              </tr>
              <tr>
                <td className="print-meta-label">리포트 유형</td>
                <td className="print-meta-value">
                  <span style={{ color: isFinal ? '#16a34a' : '#d97706', fontWeight: 900 }}>
                    {isFinal ? '✓ 확정 리포트' : '⚠ 예측 리포트'}
                  </span>
                </td>
              </tr>
              <tr>
                <td className="print-meta-label">기준 환율</td>
                <td className="print-meta-value">{formatKRW(exchangeRate)} / USD</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 핵심 요약 수치 4박스 ─── */}
      <div className="print-summary-grid">
        <div className="print-summary-box">
          <div className="print-summary-label">기초 가용 자산 (Baseline)</div>
          <div className="print-summary-value">{formatKRW(totalKRWAssets)}</div>
          {totalUSDAssets > 0 && (
            <div className="print-summary-sub">{formatUSD(totalUSDAssets)} (USD)</div>
          )}
        </div>
        <div className="print-summary-box print-summary-box--red">
          <div className="print-summary-label">금일 순지출 (외부 집행)</div>
          <div className="print-summary-value" style={{ color: '#dc2626' }}>
            {formatKRW(totalNetOut)}
          </div>
          {totalNetOutUSD > 0 && (
            <div className="print-summary-sub" style={{ color: '#dc2626' }}>
              {formatUSD(totalNetOutUSD)} (USD)
            </div>
          )}
        </div>
        <div className="print-summary-box print-summary-box--indigo">
          <div className="print-summary-label" style={{ color: '#c7d2fe' }}>출금 후 예상 잔액 (Closing)</div>
          <div className="print-summary-value" style={{ color: '#fff', fontSize: '15px' }}>
            {formatKRW(totalKRWFinal)}
          </div>
          {totalUSDFinal > 0 && (
            <div className="print-summary-sub" style={{ color: '#a5f3fc' }}>
              {formatUSD(totalUSDFinal)} (USD)
            </div>
          )}
        </div>
        <div className="print-summary-box">
          <div className="print-summary-label">외화 송금 대기 (USD)</div>
          <div className="print-summary-value" style={{ color: '#059669', fontSize: '13px', lineHeight: '1.2' }}>
            <span style={{ fontSize: '9px', color: '#64748b', marginRight: '4px' }}>금주:</span>
            {formatUSD(usdThisWeek)}
          </div>
          <div className="print-summary-sub" style={{ fontSize: '10px' }}>
            <span style={{ fontSize: '8px', color: '#94a3b8', marginRight: '4px' }}>총액:</span>
            {formatUSD(usdPending)}
          </div>
        </div>
      </div>

      {/* ─── 주요 이슈 사항 ─── */}
      {issueText && (
        <div className="print-issues-box">
          <div className="print-issues-title">■ 금일 주요 이슈 사항</div>
          <div className="print-issues-content">{issueText}</div>
        </div>
      )}

      {/* ─── 컴포즈커피 계좌 현황 ─── */}
      {renderTable(composeAccounts, composeTotal, '1. 컴포즈커피 계좌 현황 (확정 리포트)', '#0f172a')}

      {/* ─── 스마트팩토리 계좌 현황 ─── */}
      {renderTable(smartAccounts, smartTotal, '2. 스마트팩토리 계좌 현황 (확정 리포트)', '#064e3b')}

      {/* ─── 외화 송금 일정 (오늘) ─── */}
      {todayFXSchedule.length > 0 && (
        <div className="print-table-section">
          <div className="print-table-header" style={{ background: '#1e3a5f' }}>
            3. 금일 외화 송금 예정 일정 (스마트팩토리_생두)
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th>지급예정일</th>
                <th>거래처</th>
                <th style={{ textAlign: 'right' }}>금액 (USD)</th>
                <th>은행명</th>
                <th>내용</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {todayFXSchedule.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 700, color: '#2563eb' }}>{s.date}</td>
                  <td style={{ fontWeight: 700 }}>{s.client}</td>
                  <td style={{ textAlign: 'right', fontWeight: 900, color: '#2563eb' }}>
                    {formatUSD(s.amount)}
                  </td>
                  <td>{s.bank}</td>
                  <td style={{ fontSize: '10px', color: '#64748b' }}>{s.desc}</td>
                  <td>
                    <span style={{
                      fontSize: '9px', fontWeight: 700, padding: '1px 6px',
                      background: '#eff6ff', color: '#1d4ed8', borderRadius: '4px',
                      border: '1px solid #bfdbfe'
                    }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── 보고서 하단 ─── */}
      <div className="print-footer" style={dailyWithdrawals.length > 0 ? { pageBreakAfter: 'always', breakAfter: 'page' } : {}}>
        <span>출력일시: {printTime}</span>
        <span style={{ fontWeight: 700 }}>본 문서는 대외비입니다. 무단 배포를 금합니다.</span>
        <span>© (주)컴포즈커피 / (주)스마트팩토리 재무팀</span>
      </div>

      {/* ─── 2페이지: 금일 출금 요청 로우 데이터 ─── */}
      {dailyWithdrawals.length > 0 && (
        <>
          {/* 2페이지 헤더 */}
          <div className="print-header" style={{ marginBottom: 12 }}>
            <div className="print-header-left">
              <div className="print-company-badge">CONFIDENTIAL</div>
              <h1 className="print-title">일일 자금 일보 — 출금 세부 내역</h1>
              <p className="print-subtitle">{selectedDate} · Daily Withdrawal Details</p>
            </div>
            <div className="print-header-right">
              <table className="print-meta-table">
                <tbody>
                  <tr>
                    <td className="print-meta-label">기준일</td>
                    <td className="print-meta-value">{selectedDate}</td>
                  </tr>
                  <tr>
                    <td className="print-meta-label">출금 건수</td>
                    <td className="print-meta-value" style={{ fontWeight: 900, color: '#dc2626' }}>
                      {dailyWithdrawals.length}건
                    </td>
                  </tr>
                  <tr>
                    <td className="print-meta-label">총 출금 (KRW)</td>
                    <td className="print-meta-value" style={{ fontWeight: 900 }}>
                      {formatKRW(dailyWithdrawals.filter(w => !w.isUSD).reduce((s, w) => s + w.amount, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 출금 로우 데이터 테이블 */}
          <div className="print-table-section">
            <div className="print-table-header" style={{ background: '#1e293b' }}>
              ■ 금일 출금 요청 전체 내역
            </div>
            <table className="print-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>지급일</th>
                  <th style={{ width: '70px' }}>담당 법인</th>
                  <th>출금 계좌</th>
                  <th>입금은행</th>
                  <th>입금 계좌번호</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>금액</th>
                  <th>예금주 (지급대상)</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {dailyWithdrawals.map((w, idx) => (
                  <tr key={w.id || idx} style={{
                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    borderLeft: w.isInternal ? '3px solid #818cf8' : '3px solid transparent'
                  }}>
                    <td style={{ color: '#64748b', fontSize: '10px' }}>{w.paymentDate}</td>
                    <td>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px',
                        background: w.section === '컴포즈커피' ? '#eef2ff' : '#ecfdf5',
                        color: w.section === '컴포즈커피' ? '#4338ca' : '#065f46'
                      }}>
                        {w.section === '컴포즈커피' ? '컴포즈' : '스마트'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '10px', color: '#475569' }}>
                      {w.fromAccount}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '10px' }}>{w.bank}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>
                      {w.account}
                    </td>
                    <td style={{
                      textAlign: 'right', fontWeight: 900, color: '#dc2626',
                      fontFamily: 'monospace', whiteSpace: 'nowrap'
                    }}>
                      {w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '11px' }}>
                      {w.payee}
                      {w.isInternal && (
                        <span style={{ fontSize: '8px', color: '#6366f1', fontWeight: 900, marginLeft: 4 }}>
                          ★ 내부
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                      {w.memo || w.withdrawLabel || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2페이지 하단 */}
          <div className="print-footer">
            <span>출력일시: {printTime}</span>
            <span style={{ fontWeight: 700 }}>본 문서는 대외비입니다. 무단 배포를 금합니다.</span>
            <span>© (주)컴포즈커피 / (주)스마트팩토리 재무팀</span>
          </div>
        </>
      )}
    </div>,
    document.body
  );
};

export default PrintReport;
