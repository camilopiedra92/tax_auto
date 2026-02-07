
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ChevronLeft, ChevronRight, Filter, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TradesList = ({ trades = [], distributionMode, selectedFilter, searchQuery }) => {
    const { t } = useTranslation();
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortConfig, setSortConfig] = useState({ key: 'dateTime', direction: 'descending' });
    const [filterType, setFilterType] = useState('ALL'); // ALL, BUY, SELL

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, filterType]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortedTrades = () => {
        if (!trades) return [];

        let result = [...trades];

        // Filter by search query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(trade =>
                (trade['@symbol'] || '').toLowerCase().includes(q) ||
                (trade['@description'] || '').toLowerCase().includes(q)
            );
        }

        // Filter by type
        if (filterType !== 'ALL') {
            result = result.filter(trade => trade['@buySell'] === filterType);
        }

        // Sort
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aValue = a[`@${sortConfig.key}`] || a[sortConfig.key];
                let bValue = b[`@${sortConfig.key}`] || b[sortConfig.key];

                // Handle specific fields
                if (sortConfig.key === 'dateTime' || sortConfig.key === 'reportDate') {
                    // String comparison is fine for ISO-like dates, but let's be safe
                    if (!aValue) return 1;
                    if (!bValue) return -1;
                } else {
                    // Numeric sort
                    const aNum = parseFloat(aValue);
                    const bNum = parseFloat(bValue);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        aValue = aNum;
                        bValue = bNum;
                    }
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return result;
    };

    const sortedTrades = getSortedTrades();
    const totalPages = Math.ceil(sortedTrades.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedTrades = sortedTrades.slice(startIndex, startIndex + rowsPerPage);

    const formatCurrency = (val, currency = 'USD') => {
        if (val === undefined || val === null) return '-';
        const num = parseFloat(val);
        if (isNaN(num)) return '-';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2, style: 'currency', currency: currency });
    };

    const formatNumber = (val) => {
        if (val === undefined || val === null) return '-';
        const num = parseFloat(val);
        if (isNaN(num)) return val;
        return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        // IBKR format: YYYYMMDD;HHMMSS
        if (dateString.includes(';')) {
            const [datePart, timePart] = dateString.split(';');
            const year = datePart.substring(0, 4);
            const month = datePart.substring(4, 6);
            const day = datePart.substring(6, 8);
            const hour = timePart.substring(0, 2);
            const minute = timePart.substring(2, 4);
            return `${day}/${month}/${year} ${hour}:${minute}`;
        }
        // Fallback for simple date YYYYMMDD
        if (dateString.length === 8) {
            const year = dateString.substring(0, 4);
            const month = dateString.substring(4, 6);
            const day = dateString.substring(6, 8);
            return `${day}/${month}/${year}`;
        }
        return dateString;
    };

    const getTypeColor = (type) => {
        if (type === 'BUY') return 'text-green-400';
        if (type === 'SELL') return 'text-red-400';
        return 'text-gray-300';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('trades_history')}</h2>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Filter Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['ALL', 'BUY', 'SELL'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                style={{
                                    background: filterType === type ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid',
                                    borderColor: filterType === type ? 'var(--accent-primary)' : 'var(--glass-border)',
                                    color: filterType === type ? 'var(--accent-primary)' : 'var(--text-dim)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '0.5rem',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {t(type.toLowerCase())}
                            </button>
                        ))}
                    </div>

                </div>
            </div>

            {sortedTrades.length === 0 ? (
                <div style={{
                    padding: '4rem 2rem',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    background: 'rgba(255,255,255,0.01)',
                    borderRadius: '1rem',
                    border: '1px dashed var(--glass-border)',
                    margin: '0 1rem'
                }}>
                    <Search size={32} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                    <p>{t('no_trades_found')}</p>
                </div>
            ) : (
                <>
                    <div style={{ overflowX: 'auto', margin: '0 -1.75rem' }}>
                        <div style={{ padding: '0 1.75rem' }}>
                            <table style={{ minWidth: '1000px' }}>
                                <thead>
                                    <tr>
                                        <th onClick={() => requestSort('dateTime')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('date')}
                                                {sortConfig.key === 'dateTime' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('symbol')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('symbol')}
                                                {sortConfig.key === 'symbol' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('buySell')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('side')}
                                                {sortConfig.key === 'buySell' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('quantity')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('quantity')}
                                                {sortConfig.key === 'quantity' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('tradePrice')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('price')}
                                                {sortConfig.key === 'tradePrice' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('tradeMoney')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('amount')}
                                                {sortConfig.key === 'tradeMoney' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('ibCommission')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('comm')}
                                                {sortConfig.key === 'ibCommission' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                        <th onClick={() => requestSort('fifoPnlRealized')} className="sortable">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {t('realized_pl')}
                                                {sortConfig.key === 'fifoPnlRealized' && (
                                                    sortConfig.direction === 'ascending' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {paginatedTrades.map((trade, index) => (
                                            <motion.tr
                                                key={trade['@tradeID'] || index}
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                                            >
                                                <td style={{ color: 'var(--text-dim)' }}>
                                                    {formatDate(trade['@dateTime'] || trade['@tradeDate'])}
                                                </td>
                                                <td style={{ fontWeight: 600 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        {(() => {
                                                            const ticker = (trade['@symbol'] || '').split(' ')[0];
                                                            const logoToken = import.meta.env.VITE_LOGO_DEV_TOKEN;
                                                            const logoUrl = (ticker && logoToken && trade['@assetCategory'] === 'STK') ? `https://img.logo.dev/ticker/${ticker.toLowerCase()}?token=${logoToken}` : null;

                                                            return (
                                                                <div
                                                                    className="ticker-logo-container"
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <img
                                                                        src={logoUrl}
                                                                        alt={trade['@symbol']}
                                                                        className="ticker-logo"
                                                                        style={{ display: logoUrl ? 'block' : 'none' }}
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            e.target.parentElement.classList.add('fallback');
                                                                        }}
                                                                    />
                                                                    <span className="ticker-fallback-icon">{trade['@symbol']?.[0]}</span>
                                                                </div>
                                                            );
                                                        })()}
                                                        {trade['@symbol']}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        background: trade['@buySell'] === 'BUY' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: trade['@buySell'] === 'BUY' ? 'var(--success)' : 'var(--danger)',
                                                        border: `1px solid ${trade['@buySell'] === 'BUY' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {trade['@buySell'] === 'BUY' ? t('buy') : t('sell')}
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatNumber(Math.abs(trade['@quantity']))}
                                                </td>
                                                <td>
                                                    {trade['@tradePrice']}
                                                </td>
                                                <td>
                                                    {formatCurrency(Math.abs(trade['@tradeMoney']), trade['@currency'])}
                                                </td>
                                                <td style={{ color: 'var(--text-dim)' }}>
                                                    {formatNumber(Math.abs(parseFloat(trade['@ibCommission'])))}
                                                </td>
                                                <td>
                                                    <span className={(parseFloat(trade['@fifoPnlRealized']) || 0) >= 0 ? 'positive' : 'negative'}>
                                                        {parseFloat(trade['@fifoPnlRealized']) !== 0 ? formatCurrency(trade['@fifoPnlRealized'], trade['@currency']) : '-'}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pagination-container">
                        <span className="pagination-info">
                            {t('showing_rows')} {startIndex + 1}-{Math.min(startIndex + rowsPerPage, sortedTrades.length)} {t('of')} {sortedTrades.length}
                        </span>
                        <div className="pagination-controls">
                            <div className="rows-selector">
                                <span>{t('rows_per_page')}</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                                    className="glass-select"
                                >
                                    {[5, 10, 20, 50, 100].map(val => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="page-navigation">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                                    className="nav-button"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                                    className="nav-button"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TradesList;
