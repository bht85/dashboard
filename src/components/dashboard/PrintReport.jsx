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

  const renderHeader = (pageTitle = '일일 자금 일보', subtitle = 'Daily Treasury Report') => (
    <div className="print-header">
      <div className="print-header-left">
        <div className="print-company-badge">CONFIDENTIAL</div>
        <h1 className="print-title">{pageTitle}</h1>
        <p className="print-subtitle">{subtitle}</p>
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
  );

  const renderFooter = (showBreak = false) => (
    <div className="print-footer" style={showBreak ? { pageBreakAfter: 'always', breakAfter: 'page' } : {}}>
      <span>출력일시: {printTime}</span>
      <span style={{ fontWeight: 700 }}>본 문서는 대외비입니다. 무단 배포를 금합니다.</span>
      <span>© (주)컴포즈커피 / (주)스마트팩토리 재무팀</span>
    </div>
  );

  const renderTableContent = (accounts, totals, title, color) => (
    <div className="print-table-section">
      <div className="print-table-header" style={{ background: color }}>
        {title}
      </div>
      <table className="print-table" style={{ tableLayout: 'fixed', width: '100%', marginBottom: 0 }}>
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
      {/* ─── 페이지 1: 요약 및 컴포즈커피 ─── */}
      <div className="print-page-wrapper">
        {renderHeader()}
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

        {/* 법인이 분리된 주요 이슈 사항 */}
        {(typeof dailyIssues[selectedDate] === 'object' ? (dailyIssues[selectedDate]?.compose || dailyIssues[selectedDate]?.smart) : dailyIssues[selectedDate]) && (
          <div className="print-issues-box">
            <div className="print-issues-title">■ 금일 주요 이슈 사항</div>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '8px', fontWeight: 900, color: '#4338ca', marginBottom: '3px', borderBottom: '1px solid #eef2ff' }}>[1] 컴포즈커피</div>
                <div className="print-issues-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {typeof dailyIssues[selectedDate] === 'object' ? (dailyIssues[selectedDate]?.compose || '-') : dailyIssues[selectedDate]}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '8px', fontWeight: 900, color: '#059669', marginBottom: '3px', borderBottom: '1px solid #ecfdf5' }}>[2] 스마트팩토리</div>
                <div className="print-issues-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {typeof dailyIssues[selectedDate] === 'object' ? (dailyIssues[selectedDate]?.smart || '-') : '-'}
                </div>
              </div>
            </div>
          </div>
        )}

        {renderTableContent(composeAccounts, composeTotal, '1. 컴포즈커피 계좌 현황 (확정 리포트)', '#0f172a')}
        {renderFooter(true)}
      </div>

      {/* ─── 페이지 2: 스마트팩토리 및 외화 일정 ─── */}
      <div className="print-page-wrapper">
        {renderHeader('일일 자금 일보 (계속)', 'Smart Factory & FX Schedule')}
        {renderTableContent(smartAccounts, smartTotal, '2. 스마트팩토리 계좌 현황 (확정 리포트)', '#064e4b')}

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
        {renderFooter(dailyWithdrawals.length > 0)}
      </div>

      {/* ─── 페이지 3: 출금 세부 내역 ─── */}
      {dailyWithdrawals.length > 0 && (
        <div className="print-page-wrapper">
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

          {/* 법인별 그룹화된 출금 내역 */}
          {['컴포즈커피', '스마트팩토리'].map((section) => {
            const sectionWithdrawals = dailyWithdrawals.filter(w => w.section === section);
            // 내부 입금 (이 법인 계좌로 들어온 돈) 필터링
            const internalDeposits = dailyWithdrawals.filter(w => {
              const toAcc = String(w.account || '').replace(/[^0-9]/g, '');
              const accs = section === '컴포즈커피' ? composeAccounts : smartAccounts;
              const isOurAcc = accs.some(a => String(a.no).replace(/[^0-9]/g, '') === toAcc);
              
              // 예금주 패턴 확인 (내부 이체인지)
              const cleanPayee = String(w.payee || '').replace(/[\s()주식회사]/g, '');
              const patterns = ['컴포즈커피', '스마트팩토리', '제이엠씨에프티', '컴포즈커피스마트', '컴포즈커피스마트팩토리'];
              const isInternalPayee = patterns.some(p => p.replace(/[\s()주식회사]/g, '') === cleanPayee);
              
              return isOurAcc && isInternalPayee;
            });

            if (sectionWithdrawals.length === 0 && internalDeposits.length === 0) return null;

            const totalOut = sectionWithdrawals.reduce((sum, w) => sum + (w.isUSD ? 0 : w.amount), 0);
            const totalIn = internalDeposits.reduce((sum, w) => sum + (w.isUSD ? 0 : w.amount), 0);

            return (
              <div key={section} style={{ marginBottom: '30px' }}>
                <div style={{
                  padding: '5px 12px',
                  background: '#f1f5f9',
                  borderBottom: '2px solid #334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontWeight: 900, fontSize: '11px' }}>■ {section} 출금 및 입금 반영 내역</span>
                  <div style={{ fontSize: '10px', fontWeight: 800 }}>
                    <span style={{ color: '#dc2626', marginRight: '15px' }}>지출계: -{formatKRW(totalOut)}</span>
                    <span style={{ color: '#2563eb' }}>내부입금계: +{formatKRW(totalIn)}</span>
                  </div>
                </div>

                <div className="print-table-section" style={{ marginBottom: 15 }}>
                  <table className="print-table">
                    <thead>
                      <tr>
                        <th style={{ width: '75px' }}>지급일</th>
                        <th>출금계좌</th>
                        <th style={{ width: '60px' }}>입금은행</th>
                        <th>입금계좌번호</th>
                        <th style={{ textAlign: 'right', width: '120px' }}>금액</th>
                        <th>예금주(구분)</th>
                        <th>메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionWithdrawals.map((w, idx) => {
                        const isInternal = String(w.payee || '').includes('컴포즈') || String(w.payee || '').includes('스마트');
                        return (
                          <tr key={w.id || idx}>
                            <td style={{ color: '#94a3b8', fontSize: '9px' }}>{w.paymentDate}</td>
                            <td style={{ fontSize: '9px', color: '#475569' }}>{w.fromAccount}</td>
                            <td style={{ fontWeight: 700, textAlign: 'center' }}>{w.bank}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '9px', color: '#64748b' }}>{w.account}</td>
                            <td style={{ textAlign: 'right', fontWeight: 900, color: '#dc2626' }}>
                              -{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {w.payee}
                              {isInternal && <span style={{ fontSize: '8px', color: '#6366f1', marginLeft: 4 }}>(내부)</span>}
                            </td>
                            <td style={{ fontSize: '9px', color: '#94a3b8', fontStyle: 'italic' }}>{w.memo || '-'}</td>
                          </tr>
                        );
                      })}
                      {internalDeposits.map((w, idx) => (
                        <tr key={`dep_${idx}`} style={{ background: '#f0f9ff' }}>
                          <td style={{ color: '#94a3b8', fontSize: '9px' }}>{w.paymentDate}</td>
                          <td style={{ fontSize: '9px', fontWeight: 700, color: '#0369a1' }}>TO: {w.account}</td>
                          <td style={{ textAlign: 'center', fontSize: '8px', color: '#94a3b8', fontWeight: 900 }}>INTERNAL</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '8px', fontStyle: 'italic', color: '#64748b' }}>From: {w.fromAccount}</td>
                          <td style={{ textAlign: 'right', fontWeight: 900, color: '#0369a1' }}>
                            +{w.isUSD ? formatUSD(w.amount) : formatKRW(w.amount)}
                          </td>
                          <td style={{ fontWeight: 700 }}>{w.payee} <span style={{ fontSize: '8px', color: '#0ea5e9' }}>(내부입금반영)</span></td>
                          <td style={{ fontSize: '9px', color: '#94a3b8' }}>{w.memo || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: 900 }}>
                        <td colSpan={4} style={{ textAlign: 'right', fontSize: '9px', color: '#64748b', padding: '8px' }}>
                          {section} 순지출 합계 (내부이체 제외 실 지출)
                        </td>
                        <td style={{ textAlign: 'right', borderLeft: '1px solid #e2e8f0', color: '#1e293b' }}>
                          {formatKRW(totalOut - totalIn)}
                        </td>
                        <td colSpan={2} style={{ background: '#fff' }}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
          {renderFooter()}
        </div>
      )}

    </div>,
    document.body
  );
};

export default PrintReport;
