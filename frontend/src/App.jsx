import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { RefreshCw, TrendingUp, DollarSign, PieChart, LayoutDashboard, Briefcase, Clock, FileText, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings as SettingsIcon, Search, Layers, List } from 'lucide-react';
import LanguageSelector from './components/LanguageSelector';
import Settings from './components/Settings';
import { PieChart as RPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Sector } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import Login from './components/Login';
import TradesList from './components/TradesList';
import OpenPositions from './components/OpenPositions';
import { LogOut } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

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
  const [activeIndex, setActiveIndex] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const labelsGeometryRef = React.useRef({});
  const chartContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('positions');
  const [distributionMode, setDistributionMode] = useState('symbol'); // 'category', 'currency', 'symbol'
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [globalSearch, setGlobalSearch] = useState('');

  // Sync global search with chart selection
  useEffect(() => {
    if (selectedFilter?.type === 'symbol' && selectedFilter.value) {
      setGlobalSearch(selectedFilter.value);
    }
  }, [selectedFilter]);

  const [user, setUser] = useState(() => localStorage.getItem('ibkr_user_id'));
  const [token, setToken] = useState(() => localStorage.getItem('ibkr_token'));
  const [theme, setTheme] = useState('dark');

  const handleLogin = (userId, accessToken) => {
    localStorage.setItem('ibkr_user_id', userId);
    localStorage.setItem('ibkr_token', accessToken);
    setUser(userId);
    setToken(accessToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('ibkr_user_id');
    localStorage.removeItem('ibkr_token');
    setUser(null);
    setToken(null);
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

  // Fetch and apply user theme preference
  useEffect(() => {
    const fetchTheme = async () => {
      if (user && token) {
        try {
          const config = { headers: { 'Authorization': `Bearer ${token}` } };
          const response = await axios.get(`${API_BASE}/user/preferences`, config);
          if (response.data.theme) {
            setTheme(response.data.theme);
          }
        } catch (err) {
          console.error('Error fetching theme:', err);
        }
      }
    };
    fetchTheme();
  }, [user, token]);

  // Click outside chart to reset focus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chartContainerRef.current && !chartContainerRef.current.contains(event.target)) {
        // Checking if click is not on a table logo, tabs/search, or other interactive elements
        if (!event.target.closest('.ticker-logo-container') && !event.target.closest('.dashboard-controls')) {
          setFocusedIndex(null);
          setSelectedFilter(null);
          setGlobalSearch('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset focus when distribution mode changes
  useEffect(() => {
    setFocusedIndex(null);
    setSelectedFilter(null);
  }, [distributionMode]);

  // Apply theme to body element
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

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

  const getAssetLabel = React.useCallback((code, singular = false) => {
    const normalized = (code || '').trim();
    if (!normalized) return t(singular ? 'asset_types_singular.Other' : 'asset_types.Other');

    // Check if translation exists, otherwise fall back to code
    const key = singular ? `asset_types_singular.${normalized}` : `asset_types.${normalized}`;
    return t(key, { defaultValue: normalized });
  }, [t]);

  const fetchData = async (isSync = false) => {
    setLoading(true);
    setError(null);
    try {
      const config = { headers: { 'Authorization': `Bearer ${token}` } };
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
      if (err.response?.status === 401) {
        handleLogout();
        return;
      }
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        console.error("Sync error:", err);
        setError(t('error_connection'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token]);

  const openPositions = data?.OpenPositions || [];

  // Use summary if available, otherwise fallback (though summary should always be there if data is there)
  const totalEquity = summary ? summary.total_equity : 0;
  const estimatedCash = summary ? summary.estimated_cash : 0;
  const totalPnL = summary ? summary.total_unrealized_pnl : 0;

  const handlePositionClick = (pos) => {
    // Sync with chart focus
    setDistributionMode('symbol');
    const symbol = (pos['@symbol'] || '').split(' ')[0];
    const index = chartData.findIndex(d => d.name.startsWith(symbol));
    if (index !== -1) {
      setFocusedIndex(index);
      setSelectedFilter({ type: 'symbol', value: chartData[index].name });
      // Scroll to chart
      chartContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const chartData = React.useMemo(() => {
    if (!openPositions.length) return [];

    if (distributionMode === 'category') {
      const categories = {};
      openPositions.forEach(pos => {
        const cat = getAssetLabel(pos['@assetCategory']);
        const val = Math.abs(parseFloat(pos['@percentOfNAV']) || 0);
        categories[cat] = (categories[cat] || 0) + val;
      });
      return Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value, type: 'category' }));
    }

    if (distributionMode === 'currency') {
      const currencies = {};
      openPositions.forEach(pos => {
        const curr = (pos['@currency'] || 'USD').trim();
        const val = Math.abs(parseFloat(pos['@percentOfNAV']) || 0);
        currencies[curr] = (currencies[curr] || 0) + val;
      });
      return Object.entries(currencies)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value, type: 'currency' }));
    }

    // Default: symbol (position)
    const sorted = [...openPositions].sort((a, b) =>
      (Math.abs(parseFloat(b['@percentOfNAV'])) || 0) - (Math.abs(parseFloat(a['@percentOfNAV'])) || 0)
    );

    const mainPositions = [];
    let othersValue = 0;

    sorted.forEach(pos => {
      const val = Math.abs(parseFloat(pos['@percentOfNAV']) || 0);
      if (val >= 3) {
        mainPositions.push({ name: pos['@symbol'], value: val, type: 'symbol' });
      } else {
        othersValue += val;
      }
    });

    if (othersValue > 0) {
      mainPositions.push({ name: t('others'), value: othersValue, type: 'symbol', isOthers: true });
    }

    return mainPositions;
  }, [openPositions, distributionMode, t]);

  const insights = React.useMemo(() => {
    if (!openPositions.length) return [];

    // Concentration
    const sorted = [...openPositions].sort((a, b) =>
      (Math.abs(parseFloat(b['@percentOfNAV'])) || 0) - (Math.abs(parseFloat(a['@percentOfNAV'])) || 0)
    );
    const top3 = sorted.slice(0, 3).reduce((acc, pos) => acc + (Math.abs(parseFloat(pos['@percentOfNAV'])) || 0), 0);

    // Market Exposure
    const categories = {};
    openPositions.forEach(pos => {
      const cat = getAssetLabel(pos['@assetCategory']);
      const val = Math.abs(parseFloat(pos['@percentOfNAV']) || 0);
      categories[cat] = (categories[cat] || 0) + val;
    });
    const mainExposure = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

    // Diversification
    let score = t('diversification_low');
    if (openPositions.length > 10 && Object.keys(categories).length > 2) score = t('diversification_high');
    else if (openPositions.length > 5) score = t('diversification_med');

    return [
      { title: t('concentration_top_3'), value: `${top3.toFixed(1)}%`, msg: t('concentration_msg', { percent: top3.toFixed(1) }), icon: <Layers size={20} /> },
      { title: t('market_exposure'), value: mainExposure ? mainExposure[0] : 'N/A', msg: t('exposure_msg', { type: mainExposure ? mainExposure[0] : 'N/A', percent: mainExposure ? mainExposure[1].toFixed(1) : '0' }), icon: <TrendingUp size={20} /> },
      { title: t('diversification_score'), value: score, msg: '', icon: <PieChart size={20} /> }
    ];
  }, [openPositions, t]);

  const internalActiveIndex = activeIndex !== null ? activeIndex : focusedIndex;

  const renderActiveShape = React.useCallback((props) => {
    // Recharts sometimes skips props in active state. Recover from chartData.
    const index = props.index;
    const data = chartData[index];
    if (!data) return null;

    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    const isFocused = index === focusedIndex;
    const isActive = index === activeIndex;

    return (
      <g>
        {/* Glow effect for focused/active segment */}
        {(isFocused || isActive) && (
          <filter id={`glow-${index}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + (isFocused ? 40 : (isActive ? 20 : 0))}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          filter={(isFocused || isActive) ? `url(#glow-${index})` : undefined}
          style={{ transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + (isFocused ? 40 : (isActive ? 20 : 0))}
          outerRadius={outerRadius + (isFocused ? 52 : (isActive ? 30 : 5))}
          fill={fill}
          opacity={isFocused ? 0.7 : (isActive ? 0.4 : 0.2)}
          style={{ transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}
        />
      </g>
    );
  }, [chartData, focusedIndex, activeIndex]);

  const renderCustomizedLabel = React.useCallback((props) => {
    // Recover missing props from chartData using index
    const index = chartData.findIndex(d => d.name === (props.name || props.payload?.name));
    if (index === -1) return null;

    const data = chartData[index];
    if (!data) return null;

    // Cache geometry for hover stability
    if (props.midAngle !== undefined && props.outerRadius !== undefined) {
      labelsGeometryRef.current[index] = {
        midAngle: props.midAngle,
        outerRadius: props.outerRadius,
        cx: props.cx,
        cy: props.cy
      };
    }

    const geom = labelsGeometryRef.current[index];
    // If we have neither current props nor cached geometry, we can't draw, 
    // but we should check if we can at least find the midpoint from chartData order if necessary.
    if (!geom && props.midAngle === undefined) return null;

    const RADIAN = Math.PI / 180;
    const cx = props.cx ?? geom?.cx;
    const cy = props.cy ?? geom?.cy;
    const midAngle = props.midAngle ?? geom?.midAngle;
    const outerRadius = props.outerRadius ?? geom?.outerRadius;
    const fill = props.fill;

    const name = data.name;
    const value = data.value;

    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 45) * cos;
    const my = cy + (outerRadius + 45) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 45;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const isSymbol = data.type === 'symbol' && !data.isOthers;
    const isHovered = index === activeIndex;
    const isSelected = index === focusedIndex;
    const isFocused = isHovered || isSelected;
    const someoneElseIsSelected = focusedIndex !== null && focusedIndex !== index;

    const ticker = (name || '').split(' ')[0];
    const logoToken = import.meta.env.VITE_LOGO_DEV_TOKEN;
    const logoUrl = (isSymbol && ticker && logoToken) ? `https://img.logo.dev/ticker/${ticker.toLowerCase()}?token=${logoToken}` : null;
    const logoSize = isSelected ? 44 : (isHovered ? 36 : 32);

    return (
      <g
        opacity={1}
        style={{
          pointerEvents: 'none',
          filter: someoneElseIsSelected ? 'blur(1.5px)' : 'none',
          opacity: someoneElseIsSelected ? 0.6 : 1,
          transition: 'all 0.4s ease'
        }}
      >
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" opacity={isFocused ? 1 : 0.8} strokeWidth={isSelected ? 3 : (isHovered ? 2 : 1.5)} />
        <circle cx={ex} cy={ey} r={isSelected ? 4 : (isHovered ? 3 : 2)} fill={fill} stroke="none" />

        <g transform={`translate(${ex + (cos >= 0 ? 8 : -8)}, ${ey})`}>
          {isSymbol && logoUrl && (
            <foreignObject x={cos >= 0 ? 0 : -logoSize} y={-logoSize / 2} width={logoSize} height={logoSize}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: isSelected ? '10px' : '8px',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${isFocused ? fill : 'rgba(255,255,255,0.1)'}`,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s ease'
              }}>
                <img
                  src={logoUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
                  onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.style.background = fill; }}
                />
              </div>
            </foreignObject>
          )}

          <text
            x={cos >= 0 ? (isSymbol ? (isSelected ? 52 : 44) : 0) : (isSymbol ? (isSelected ? -52 : -44) : 0)}
            y={0}
            dy={4}
            textAnchor={textAnchor}
            fill={isSelected ? 'var(--accent-primary)' : (isHovered ? 'var(--text-main)' : 'var(--text-dim)')}
            style={{ fontSize: isSelected ? '1.35rem' : (isHovered ? '1.15rem' : '1rem'), fontWeight: isSelected ? 900 : (isHovered ? 800 : 500), transition: 'all 0.3s ease', letterSpacing: isSelected ? '0.02em' : 'normal' }}
          >
            {name}
          </text>
          <text
            x={cos >= 0 ? (isSymbol ? (isSelected ? 52 : 44) : 0) : (isSymbol ? (isSelected ? -52 : -44) : 0)}
            y={isSelected ? 28 : 24}
            textAnchor={textAnchor}
            fill={isFocused ? 'var(--accent-primary)' : 'var(--text-dim)'}
            style={{ fontSize: isSelected ? '1.1rem' : (isHovered ? '1rem' : '0.85rem'), fontWeight: 700, transition: 'all 0.3s ease' }}
          >
            {value.toFixed(1)}%
          </text>
        </g>
      </g>
    );
  }, [chartData, internalActiveIndex, focusedIndex]);

  const COLORS = [
    '#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185',
    '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf',
    '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6'
  ];

  if (!user || !token) {
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
            <img src="/icon.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
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
        token={token}
        onThemeChange={setTheme}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('distribution')}</h2>
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
                {['symbol', 'category', 'currency'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDistributionMode(mode)}
                    className={`toggle-tab ${distributionMode === mode ? 'active' : ''}`}
                    style={{ border: 'none', padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    {t(`by_${mode === 'category' ? 'asset_class' : mode === 'currency' ? 'currency' : 'symbol'}`)}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '0.75rem', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <PieChart size={20} color="var(--accent-primary)" />
            </div>
          </div>

          <div className="distribution-content-wrapper">
            <div className="distribution-chart-section" ref={chartContainerRef}>
              <div style={{ minHeight: '450px', width: '100%', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={450}>
                  <RPieChart margin={{ top: 10, right: 180, bottom: 10, left: 180 }}>
                    <defs>
                      <filter id="labelBlur" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.5" />
                      </filter>
                    </defs>
                    <Pie
                      isAnimationActive={false}
                      activeIndex={internalActiveIndex}
                      activeShape={renderActiveShape}
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={110}
                      outerRadius={150}
                      paddingAngle={chartData.length > 1 ? 4 : 0}
                      dataKey="value"
                      label={renderCustomizedLabel}
                      labelLine={false}
                      onMouseEnter={onPieEnter}
                      onMouseLeave={() => setActiveIndex(null)}
                      onClick={(data, index) => {
                        if (data && data.name) {
                          // Toggle focus
                          if (focusedIndex === index) {
                            setFocusedIndex(null);
                            setSelectedFilter(null);
                          } else {
                            setFocusedIndex(index);
                            setSelectedFilter({ type: distributionMode, value: data.name });
                          }
                        }
                      }}
                      style={{ cursor: 'pointer', outline: 'none' }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                          stroke="rgba(0,0,0,0.3)"
                          strokeWidth={2}
                          opacity={focusedIndex !== null && focusedIndex !== index ? 0.25 : 1}
                          style={{ transition: 'all 0.4s ease', outline: 'none' }}
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
                  width: '140px',
                  zIndex: 10
                }}>
                  <span style={{
                    fontSize: '0.85rem',
                    color: activeIndex !== null ? 'var(--accent-primary)' : 'var(--text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    fontWeight: 800,
                    transition: 'all 0.3s ease',
                    marginBottom: '8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {activeIndex !== null ? chartData[activeIndex]?.name : t('total')}
                  </span>
                  <span style={{
                    fontSize: '3.5rem',
                    fontWeight: 900,
                    color: 'var(--text-main)',
                    lineHeight: 1,
                    transition: 'all 0.3s ease',
                    textShadow: '0 0 20px rgba(56, 189, 248, 0.2)'
                  }}>
                    {internalActiveIndex !== null ? `${chartData[internalActiveIndex]?.value.toFixed(1)}%` : '100%'}
                  </span>
                  {internalActiveIndex !== null && (
                    <motion.span
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '4px', fontWeight: 500 }}
                    >
                      {t('percent_portfolio')}
                    </motion.span>
                  )}
                </div>
              </div>

              {/* Minimal Legend for multi-value modes */}
              {distributionMode !== 'symbol' && chartData.length > 1 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
                  {chartData.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.75rem',
                        color: internalActiveIndex === i ? 'var(--text-main)' : 'var(--text-dim)',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        background: internalActiveIndex === i ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                      onClick={() => {
                        if (focusedIndex === i) {
                          setFocusedIndex(null);
                          setSelectedFilter(null);
                        } else {
                          setFocusedIndex(i);
                          setSelectedFilter({ type: distributionMode, value: item.name });
                        }
                      }}
                    >
                      <div
                        style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}
                      />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="insights-panel">
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '1.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {t('portfolio_insights')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {insights.map((insight, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="insight-card"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
                        {insight.icon}
                        {insight.title}
                      </span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{insight.value}</span>
                    </div>
                    {insight.msg && <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', margin: 0, opacity: 0.8, lineHeight: 1.5 }}>{insight.msg}</p>}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="dashboard-controls" style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', flex: 1 }}>
              <button
                onClick={() => setActiveTab('positions')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === 'positions' ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'positions' ? '2px solid var(--accent-primary)' : '1px solid transparent',
                  color: activeTab === 'positions' ? 'var(--text-main)' : 'var(--text-dim)',
                  fontWeight: activeTab === 'positions' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Briefcase size={18} />
                {t('open_positions')}
              </button>
              <button
                onClick={() => setActiveTab('trades')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: activeTab === 'trades' ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'trades' ? '2px solid var(--accent-primary)' : '1px solid transparent',
                  color: activeTab === 'trades' ? 'var(--text-main)' : 'var(--text-dim)',
                  fontWeight: activeTab === 'trades' ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <List size={18} />
                {t('trades_history')}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', borderLeft: '1px solid var(--glass-border)', gap: '1rem' }}>
              {selectedFilter && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => {
                    setSelectedFilter(null);
                    setGlobalSearch('');
                    setFocusedIndex(null);
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {t('clear_filter')} ({selectedFilter.value})
                </motion.button>
              )}
              <div className="glass-input-container" style={{ width: '200px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', zIndex: 2 }} />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => {
                    setGlobalSearch(e.target.value);
                    if (selectedFilter?.type === 'symbol') {
                      setSelectedFilter(null);
                    }
                  }}
                  placeholder={t('search_symbol')}
                  className="glass-input"
                  style={{ padding: '0.5rem 0.5rem 0.5rem 2.5rem', fontSize: '0.9rem', height: '36px' }}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <AnimatePresence mode="wait">
              {activeTab === 'positions' ? (
                <motion.div
                  key="positions"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <OpenPositions
                    positions={openPositions}
                    selectedFilter={selectedFilter}
                    searchQuery={globalSearch}
                    onPositionClick={handlePositionClick}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="trades"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {data?.Trades ? (
                    <TradesList
                      trades={data.Trades}
                      distributionMode={distributionMode}
                      selectedFilter={selectedFilter}
                      searchQuery={globalSearch}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-dim)' }}>
                      {t('no_data_available')}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </div>
    </div>
  );
}

export default App;
