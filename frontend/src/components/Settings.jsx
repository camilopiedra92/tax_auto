import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Settings as SettingsIcon, Save, X, Key, Hash, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const Settings = ({ isOpen, onClose, onSaveSuccess, userId }) => {
    const { t } = useTranslation();
    const [token, setToken] = useState('');
    const [queryId, setQueryId] = useState('');
    const [currentMaskedToken, setCurrentMaskedToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchConfig();
        }
    }, [isOpen]);

    const fetchConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE}/config`, {
                headers: { 'X-User-ID': userId }
            });
            setQueryId(response.data.query_id);
            setCurrentMaskedToken(response.data.token_masked);
        } catch (err) {
            setError(t('error_connection'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axios.post(`${API_BASE}/config`, {
                token: token || undefined, // If empty, backend might need to handle it or we use current
                query_id: queryId
            }, {
                headers: { 'X-User-ID': userId }
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            if (onSaveSuccess) onSaveSuccess();
        } catch (err) {
            setError(t('config_error'));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(8px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass-card"
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    margin: 0,
                    position: 'relative',
                    border: '1px solid var(--glass-border)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '0.5rem',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(56, 189, 248, 0.2)'
                        }}>
                            <SettingsIcon size={20} color="var(--accent-primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('configuration')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(255,255,255,0.03)',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-dim)'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Key size={14} />
                            {t('ibkr_token')}
                        </label>
                        <input
                            type="password"
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            placeholder={currentMaskedToken || "Enter token..."}
                            className="glass-input"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-main)',
                                fontFamily: 'inherit'
                            }}
                        />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <ShieldCheck size={12} />
                            Masked: {currentMaskedToken}
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Hash size={14} />
                            {t('query_id')}
                        </label>
                        <input
                            type="text"
                            value={queryId}
                            onChange={e => setQueryId(e.target.value)}
                            placeholder="e.g. 1395336"
                            className="glass-input"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--glass-border)',
                                color: 'var(--text-main)',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}

                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.2)',
                                    color: '#4ade80',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <ShieldCheck size={16} />
                                {t('config_saved')}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="nav-button"
                            style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '2.75rem' }}
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={saving || (!token && !queryId)}
                            className="sync-button"
                            style={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                        >
                            {saving ? <div className="spinner" /> : <Save size={18} />}
                            {t('save_config')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default Settings;
