import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, List, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const OpenPositions = ({
    positions,
    selectedFilter,
    searchQuery,
    onPositionClick
}) => {
    const { t } = useTranslation();
    const [isGrouped, setIsGrouped] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: '@percentOfNAV', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Reset to first page when sorting or rows per page change
    useEffect(() => {
        setCurrentPage(1);
    }, [sortConfig, rowsPerPage, selectedFilter, searchQuery, isGrouped]);

    const formatCurrency = (val) => {
        if (val === undefined || val === null) return '0.00';
        const num = parseFloat(val);
        if (isNaN(num)) return '0.00';
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getAssetLabel = (code, singular = false) => {
        const normalized = (code || '').trim();
        if (!normalized) return t(singular ? 'asset_types_singular.Other' : 'asset_types.Other');
        const key = singular ? `asset_types_singular.${normalized}` : `asset_types.${normalized}`;
        return t(key, { defaultValue: normalized });
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortedPositions = (positionsList) => {
        let result = positionsList || [];

        // Filter by search query
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(pos =>
                (pos['@symbol'] || '').toLowerCase().includes(q) ||
                (pos['@description'] || '').toLowerCase().includes(q)
            );
        }

        // Filter by external filter (chart selection)
        if (selectedFilter) {
            result = result.filter(pos => {
                if (selectedFilter.type === 'category') return getAssetLabel(pos['@assetCategory']) === selectedFilter.value;
                if (selectedFilter.type === 'currency') return pos['@currency'] === selectedFilter.value;
                if (selectedFilter.type === 'symbol') {
                    // If the selected filter is "Others", we need to know what constitutes "Others".
                    // In App.jsx this logic depended on the full list to determine the threshold.
                    // For simplicity here, we might need to handle 'symbol' matching directly.
                    // However, the selectedFilter.value usually comes from the chart name.
                    // If it is a specific symbol:
                    return pos['@symbol'] === selectedFilter.value;
                }
                return true;
            });
        }

        if (!sortConfig.key && !isGrouped) return result;

        return [...result].sort((a, b) => {
            // Primary sort if grouped: Asset Category
            if (isGrouped) {
                const catA = getAssetLabel(a['@assetCategory']);
                const catB = getAssetLabel(b['@assetCategory']);
                const catCompare = catA.localeCompare(catB);
                if (catCompare !== 0) return catCompare;
            }

            // Secondary (or primary if not grouped) sort: User selection
            if (!sortConfig.key) return 0;

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

    const sortedPositions = getSortedPositions(positions);
    const totalPages = Math.ceil(sortedPositions.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginatedPositions = sortedPositions.slice(startIndex, startIndex + rowsPerPage);

    return (
        <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('open_positions')}</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={() => setIsGrouped(!isGrouped)}
                        style={{
                            background: isGrouped ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid',
                            borderColor: isGrouped ? 'var(--accent-primary)' : 'var(--glass-border)',
                            color: isGrouped ? 'var(--accent-primary)' : 'var(--text-dim)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s ease',
                            height: '36px'
                        }}
                    >
                        {isGrouped ? <Layers size={16} /> : <List size={16} />}
                        {t('group_by_type')}
                    </button>
                </div>
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
                            <AnimatePresence>
                                {paginatedPositions.length > 0 ? (
                                    paginatedPositions.map((pos, idx) => {
                                        const showHeader = isGrouped && (idx === 0 || getAssetLabel(pos['@assetCategory']) !== getAssetLabel(paginatedPositions[idx - 1]['@assetCategory']));
                                        return (
                                            <React.Fragment key={`${pos['@symbol']}-${idx}`}>
                                                {showHeader && (
                                                    <tr className="group-header-row">
                                                        <td colSpan={10} style={{ padding: '0.8rem 1rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                                                            {getAssetLabel(pos['@assetCategory'])}
                                                        </td>
                                                    </tr>
                                                )}
                                                <motion.tr
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    transition={{ delay: idx * 0.03 }}
                                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                                                >
                                                    <td style={{ fontWeight: 600 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div
                                                                className="ticker-logo-container"
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => onPositionClick && onPositionClick(pos)}
                                                            >
                                                                <img
                                                                    src={`https://img.logo.dev/ticker/${(pos['@symbol'] || '').split(' ')[0].toLowerCase()}?token=${import.meta.env.VITE_LOGO_DEV_TOKEN}`}
                                                                    alt={pos['@symbol']}
                                                                    className="ticker-logo"
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.parentElement.classList.add('fallback');
                                                                    }}
                                                                />
                                                                <span className="ticker-fallback-icon">{pos['@symbol']?.[0]}</span>
                                                            </div>
                                                            {pos['@symbol']}
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-dim)' }}>{getAssetLabel(pos['@assetCategory'], true)}</td>
                                                    <td>{parseFloat(pos['@position']).toLocaleString()}</td>
                                                    <td style={{ color: 'var(--text-dim)' }}>{pos['@currency']}</td>
                                                    <td>{formatCurrency(pos['@openPrice'] || 0)}</td>
                                                    <td>{formatCurrency(pos['@markPrice'] || 0)}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(pos['@positionValue'] || 0)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{
                                                                width: '60px',
                                                                height: '4px',
                                                                background: 'rgba(255,255,255,0.1)',
                                                                borderRadius: '2px',
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${Math.min(100, Math.abs(parseFloat(pos['@percentOfNAV']) || 0))}%`,
                                                                    height: '100%',
                                                                    background: 'var(--accent-primary)'
                                                                }} />
                                                            </div>
                                                            {parseFloat(pos['@percentOfNAV'] || 0).toFixed(2)}%
                                                        </div>
                                                    </td>
                                                    <td className={(parseFloat(pos['@fifoPnlUnrealized']) || 0) >= 0 ? 'positive' : 'negative'}>
                                                        {formatCurrency(pos['@fifoPnlUnrealized'] || 0)}
                                                    </td>
                                                    <td className={(parseFloat(pos['realized_pnl']) || 0) >= 0 ? 'positive' : 'negative'}>
                                                        {formatCurrency(pos['realized_pnl'] || 0)}
                                                    </td>
                                                </motion.tr>
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                                            {t('no_positions')}
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="pagination-container">
                <span className="pagination-info">
                    {t('showing_rows')} {startIndex + 1}-{Math.min(startIndex + rowsPerPage, sortedPositions.length)} {t('of')} {sortedPositions.length}
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
        </div>
    );
};

export default OpenPositions;
