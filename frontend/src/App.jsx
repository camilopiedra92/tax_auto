import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { RefreshCw, TrendingUp, DollarSign, PieChart, LayoutDashboard, Briefcase, Clock, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings as SettingsIcon } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import Settings from './components/Settings';
import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Sector } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import { LogOut } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 8}
        outerRadius={outerRadius + 12}
        fill={fill}
        opacity={0.3}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }) => {
  const { t } = useTranslation();
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(30, 41, 59, 0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '4px' }}>{payload[0].name}</div>
        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          {payload[0].value}{t('percent_portfolio')}
        </div>
      </div>
    );
  }
  return null;
};

function App() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [lastReportGenerated, setLastReportGenerated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sortConfig, setSortConfig] = useState({ key: '@percentOfNAV', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [activeIndex, setActiveIndex] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [user, setUser] = useState(() => localStorage.getItem('ibkr_user_id'));

  const handleLogin = (userId) => {
    localStorage.setItem('ibkr_user_id', userId);
    setUser(userId);
  };

  const handleLogout = () => {
    localStorage.removeItem('ibkr_user_id');
    setUser(null);
    setData(null);
    setSummary(null);
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  // Update current time every minute for relative time display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatIBKRDate = (timestamp) => {
    if (!timestamp) return t('not_available');
    try {
      // IBKR format: YYYYMMDD;HHMMSS
      if (timestamp.includes(';')) {
        const [datePart, timePart] = timestamp.split(';');
        const year = datePart.substring(0, 4);
        const month = datePart.substring(4, 6);
        const day = datePart.substring(6, 8);
        const hour = timePart.substring(0, 2);
        const minute = timePart.substring(2, 4);
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }
      return timestamp;
    } catch (e) {
      return String(timestamp);
    }
  };

  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '0.00';
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getRelativeTime = (isoString) => {
    if (!isoString) return null;
    const then = new Date(isoString);
    const diffInSeconds = Math.floor((currentTime - then) / 1000);

    if (diffInSeconds < 5) return t('synced_just_now');
    if (diffInSeconds < 60) return t('synced_seconds_ago', { count: diffInSeconds });

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return t('synced_min_ago', { count: diffInMinutes });

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return t('synced_hour_ago', { count: diffInHours });
    if (diffInHours < 24) return t('synced_hours_ago', { count: diffInHours });

    return then.toLocaleDateString();
  };

  const fetchData = async (isSync = false) => {
    setLoading(true);
    setError(null);
    try {
      const config = { headers: { 'X-User-ID': user } };
      const response = isSync
        ? await axios.post(`${API_BASE}/sync`, {}, config)
        : await axios.get(`${API_BASE}/latest`, config);
      if (response.data.status === 'success') {
        setData(response.data.data);
        setSummary(response.data.summary);
        setLastReportGenerated(response.data.last_report_generated);
        setLastSync(response.data.last_sync);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(t('error_connection'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Reset to first page when sorting or rows per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [sortConfig, rowsPerPage]);

  const openPositions = data?.OpenPositions || [];

  // Use summary if available, otherwise fallback (though summary should always be there if data is there)
  const totalEquity = summary ? summary.total_equity : 0;
  const estimatedCash = summary ? summary.estimated_cash : 0;
  const totalPnL = summary ? summary.total_unrealized_pnl : 0;

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPositions = (positions) => {
    if (!sortConfig.key) return positions;

    return [...positions].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Convert to number if possible
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        aValue = aNum;
        bValue = bNum;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const sortedPositions = getSortedPositions(openPositions);

  const totalPages = Math.ceil(sortedPositions.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedPositions = sortedPositions.slice(startIndex, startIndex + rowsPerPage);

  const topPositionsForChart = [...openPositions].sort((a, b) => {
    return Math.abs(parseFloat(b['@percentOfNAV']) || 0) - Math.abs(parseFloat(a['@percentOfNAV']) || 0);
  });

  const chartData = topPositionsForChart.map(pos => ({
    name: pos['@symbol'],
    value: Math.abs(parseFloat(pos['@percentOfNAV']) || 0)
  }));

  const COLORS = [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185',
    '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf',
    '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6'
  ];

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="dashboard-container">
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '0.75rem',
            borderRadius: '1rem',
            border: '1px solid rgba(56, 189, 248, 0.2)'
          }}>
            <LayoutDashboard size={28} color="var(--accent-primary)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{t('app_title')}</h1>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.25rem 0.75rem', borderRadius: '100px', border: '1px solid var(--glass-border)' }}>
                <Clock size={12} color="var(--accent-primary)" />
                {t('synced')} <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{lastSync ? getRelativeTime(lastSync) : t('not_synced')}</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.03)', padding: '0.25rem 0.75rem', borderRadius: '100px', border: '1px solid var(--glass-border)' }}>
                <FileText size={12} color="var(--accent-secondary)" />
                {t('ibkr_report')} <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatIBKRDate(lastReportGenerated)}</span>
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '0.25rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--glass-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <LanguageSelector />
            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }} />
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              title={t('settings')}
            >
              <SettingsIcon size={20} />
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)' }} />
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              title={t('logout')}
            >
              <LogOut size={20} />
            </button>
          </div>
          <button
            className={`sync-button ${loading ? 'loading' : ''}`}
            onClick={() => fetchData(true)}
            disabled={loading}
          >
            <RefreshCw size={18} />
            {loading ? t('syncing') : t('sync_button')}
          </button>
        </div>
      </header>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaveSuccess={() => fetchData()}
        userId={user}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '1rem', marginBottom: '2rem', color: '#f87171' }}
        >
          {error}
        </motion.div>
      )}


      <div className="portfolio-overview-container">
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Briefcase size={20} color="var(--accent-primary)" />
              {t('nav_composition')}
            </h2>
            <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <LayoutDashboard size={18} color="var(--accent-primary)" />
            </div>
          </div>

          <div className="nav-equation">
            <motion.div whileHover={{ scale: 1.02 }} className="nav-item">
              <div className="label">
                <PieChart size={16} color="var(--accent-secondary)" />
                {t('stocks')}
              </div>
              <div className="value">${(summary?.total_position_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t('current_market_value')}</div>
            </motion.div>

            <div className="nav-operator">+</div>

            <motion.div whileHover={{ scale: 1.02 }} className="nav-item">
              <div className="label">
                <DollarSign size={16} color="var(--success)" />
                {t('cash')}
              </div>
              <div className={`value ${estimatedCash < 0 ? 'negative' : 'positive'}`}>
                {estimatedCash < 0 ? '-' : ''}${Math.abs(estimatedCash || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t('available_liquidity')}</div>
            </motion.div>

            <div className="nav-operator">+</div>

            <motion.div whileHover={{ scale: 1.02 }} className="nav-item">
              <div className="label">
                <Clock size={16} color="var(--warning)" />
                {t('dividends')}
              </div>
              <div className={`value ${(summary?.dividend_accruals || 0) >= 0 ? 'positive' : 'negative'}`} style={{ color: (summary?.dividend_accruals || 0) < 0 ? 'var(--danger)' : undefined }}>
                {(summary?.dividend_accruals || 0) < 0 ? '-' : ''}${Math.abs(summary?.dividend_accruals || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t('accrued_receivable')}</div>
            </motion.div>

            <div className="nav-operator">=</div>

            <motion.div whileHover={{ scale: 1.05 }} className="nav-item result">
              <div className="label" style={{ color: 'var(--accent-primary)' }}>
                <LayoutDashboard size={16} color="var(--accent-primary)" />
                {t('total_nav')}
              </div>
              <div className="value" style={{ color: 'var(--accent-primary)' }}>${(totalEquity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{t('total_equity')}</div>
            </motion.div>
          </div>

          <div className="nav-bar-container">
            <div
              className="nav-bar-segment"
              style={{
                width: `${Math.min(100, Math.max(0, ((summary?.total_position_value || 0) / totalEquity) * 100))}%`,
                background: 'var(--accent-secondary)',
                opacity: 0.8
              }}
              title={t('stocks')}
            />
            <div
              className="nav-bar-segment"
              style={{
                width: `${Math.min(100, Math.max(0, (estimatedCash / totalEquity) * 100))}%`,
                background: 'var(--success)',
                opacity: 0.8
              }}
              title={t('cash')}
            />
            <div
              className="nav-bar-segment"
              style={{
                width: `${Math.min(100, Math.max(0, ((summary?.dividend_accruals || 0) / totalEquity) * 100))}%`,
                background: 'var(--warning)',
                opacity: 0.8
              }}
              title={t('dividends')}
            />
          </div>

          <div className="pnl-row">
            <motion.div whileHover={{ y: -3 }} className="pnl-metric">
              <div className="label-group">
                <div className="label">{t('pnl_realized')}</div>
                <div className={`value ${(summary?.total_realized_pnl || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {(summary?.total_realized_pnl || 0) >= 0 ? '+' : '-'}${Math.abs(summary?.total_realized_pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <TrendingUp size={24} color={(summary?.total_realized_pnl || 0) >= 0 ? 'var(--success)' : 'var(--danger)'} style={{ opacity: 0.4 }} />
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="pnl-metric">
              <div className="label-group">
                <div className="label">{t('pnl_unrealized')}</div>
                <div className={`value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
                  {totalPnL >= 0 ? '+' : '-'}${Math.abs(totalPnL || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <TrendingUp size={24} color={totalPnL >= 0 ? 'var(--success)' : 'var(--danger)'} style={{ opacity: 0.4 }} />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('distribution')}</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{t('portfolio_breakdown')}</span>
            </div>
            <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.03)' }}>
              <PieChart size={18} color="var(--accent-primary)" />
            </div>
          </div>

          <div className="distribution-grid">
            <div style={{ height: '280px', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie
                    activeIndex={activeIndex}
                    activeShape={renderActiveShape}
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={75}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={onPieEnter}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </RPieChart>
              </ResponsiveContainer>

              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                width: '120px',
                zIndex: 10
              }}>
                <span style={{
                  fontSize: '0.8rem',
                  color: activeIndex !== null ? 'var(--accent-primary)' : 'var(--text-dim)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                  transition: 'all 0.3s ease',
                  marginBottom: '2px'
                }}>
                  {activeIndex !== null ? chartData[activeIndex]?.name : t('total')}
                </span>
                <span style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: 1,
                  transition: 'all 0.3s ease'
                }}>
                  {activeIndex !== null ? `${chartData[activeIndex]?.value.toFixed(1)}%` : '100%'}
                </span>
                {activeIndex !== null && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-dim)',
                      marginTop: '4px',
                      fontWeight: 500
                    }}
                  >
                    {t('percent_portfolio')}
                  </motion.span>
                )}
              </div>
            </div>

            <div className="legend-container" style={{
              maxHeight: '300px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: '0.5rem',
              paddingRight: '0.5rem',
              width: '100%'
            }}>
              {chartData.map((item, i) => (
                <motion.div
                  key={i}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.75rem',
                    background: activeIndex === i ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid',
                    borderColor: activeIndex === i ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  whileHover={{ x: 3 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', zIndex: 1 }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: COLORS[i % COLORS.length],
                      boxShadow: `0 0 8px ${COLORS[i % COLORS.length]}80`
                    }} />
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: activeIndex === i ? 700 : 500,
                      color: activeIndex === i ? 'var(--text-main)' : 'var(--text-dim)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '60px'
                    }}>
                      {item.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: activeIndex === i ? 'var(--accent-primary)' : 'var(--text-main)',
                    zIndex: 1
                  }}>
                    {item.value.toFixed(1)}%
                  </span>
                  {activeIndex === i && (
                    <motion.div
                      layoutId="legend-bg"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: '3px',
                        background: COLORS[i % COLORS.length]
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('open_positions')}</h2>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-dim)' }}>{t('portfolio_detail')}</div>
          </div>
          <div style={{ overflowX: 'auto', margin: '0 -1.75rem' }}>
            <div style={{ padding: '0 1.75rem' }}>
              <table style={{ minWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th onClick={() => requestSort('@symbol')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('symbol')}
                        {sortConfig.key === '@symbol' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@assetCategory')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('type')}
                        {sortConfig.key === '@assetCategory' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@position')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('quantity')}
                        {sortConfig.key === '@position' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@currency')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('currency')}
                        {sortConfig.key === '@currency' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@openPrice')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('avg_price')}
                        {sortConfig.key === '@openPrice' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@markPrice')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('current_price')}
                        {sortConfig.key === '@markPrice' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@positionValue')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('value')}
                        {sortConfig.key === '@positionValue' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@percentOfNAV')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('nav_percent')}
                        {sortConfig.key === '@percentOfNAV' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('@fifoPnlUnrealized')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('pnl_unrealized_short')}
                        {sortConfig.key === '@fifoPnlUnrealized' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                    <th onClick={() => requestSort('realized_pnl')} className="sortable">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {t('pnl_realized_short')}
                        {sortConfig.key === 'realized_pnl' && (
                          sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="wait">
                    {paginatedPositions.length > 0 ? (
                      paginatedPositions.map((pos, idx) => (
                        <motion.tr
                          key={`${pos['@symbol']}-${idx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          <td style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span>{pos['@symbol']}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>{pos['@description']}</span>
                            </div>
                          </td>
                          <td>{pos['@assetCategory']}</td>
                          <td>{parseFloat(pos['@position']).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                          <td>{pos['@currency']}</td>
                          <td style={{ fontWeight: 500 }}>${parseFloat(pos['@openPrice']).toFixed(2)}</td>
                          <td style={{ fontWeight: 500 }}>${parseFloat(pos['@markPrice']).toFixed(2)}</td>
                          <td style={{ fontWeight: 600 }}>${parseFloat(pos['@positionValue']).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>{pos['@percentOfNAV']}%</td>
                          <td className={(parseFloat(pos['@fifoPnlUnrealized']) || 0) >= 0 ? 'positive' : 'negative'}>
                            {(parseFloat(pos['@fifoPnlUnrealized']) || 0) >= 0 ? '+' : ''}
                            ${formatCurrency(pos['@fifoPnlUnrealized'])}
                          </td>
                          <td className={(parseFloat(pos['realized_pnl']) || 0) >= 0 ? 'positive' : 'negative'}>
                            {(parseFloat(pos['realized_pnl']) || 0) >= 0 ? '+' : ''}
                            ${formatCurrency(pos['realized_pnl'])}
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                          {t('no_positions')}
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {sortedPositions.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                {t('showing_rows')} {startIndex + 1}-{Math.min(startIndex + rowsPerPage, sortedPositions.length)} {t('of')} {sortedPositions.length}
              </div>

              <div className="pagination-controls">
                <div className="rows-selector">
                  <span>{t('rows_per_page')}</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                    className="glass-select"
                  >
                    {[10, 25, 50, 100].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>

                <div className="page-navigation">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="nav-button"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, i, arr) => {
                        const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="ellipsis">...</span>}
                            <button
                              onClick={() => setCurrentPage(p)}
                              className={`page-number ${currentPage === p ? 'active' : ''}`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })
                    }
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="nav-button"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}

export default App;
