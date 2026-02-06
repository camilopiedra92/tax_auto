import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Settings as SettingsIcon, Save, X, Key, Hash, ShieldCheck, AlertCircle, User, Lock, Sliders, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const Settings = ({ isOpen, onClose, onSaveSuccess, userId, token: authToken, onThemeChange }) => {
    const { t, i18n } = useTranslation();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Profile state
    const [profile, setProfile] = useState({
        username: '',
        email: '',
        display_name: '',
        created_at: ''
    });

    // Security state
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: ''
    });

    // Preferences state
    const [preferences, setPreferences] = useState({
        theme: 'dark',
        language: 'en',
        default_currency: 'USD'
    });

    // IBKR Config state
    const [token, setToken] = useState('');
    const [queryId, setQueryId] = useState('');
    const [currentMaskedToken, setCurrentMaskedToken] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchAllData();
        }
    }, [isOpen]);

    const fetchAllData = async () => {
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { 'Authorization': `Bearer ${authToken}` } };

            // Fetch profile
            const profileRes = await axios.get(`${API_BASE}/user/profile`, config);
            setProfile(profileRes.data);

            // Fetch preferences
            const prefsRes = await axios.get(`${API_BASE}/user/preferences`, config);
            setPreferences(prefsRes.data);

            // Fetch IBKR config
            const ibkrRes = await axios.get(`${API_BASE}/config`, config);
            setQueryId(ibkrRes.data.query_id);
            setCurrentMaskedToken(ibkrRes.data.token_masked);
        } catch (err) {
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError(t('error_connection'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axios.put(`${API_BASE}/user/profile`, {
                email: profile.email,
                display_name: profile.display_name
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || t('config_error'));
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axios.post(`${API_BASE}/user/change-password`, passwordData, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            setSuccess(true);
            setPasswordData({ current_password: '', new_password: '' });
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || t('config_error'));
        } finally {
            setSaving(false);
        }
    };

    const handlePreferencesSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axios.put(`${API_BASE}/user/preferences`, preferences, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            // Update language if changed
            if (preferences.language !== i18n.language) {
                i18n.changeLanguage(preferences.language);
            }

            // Update theme if callback provided
            if (onThemeChange && preferences.theme) {
                onThemeChange(preferences.theme);
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || t('config_error'));
        } finally {
            setSaving(false);
        }
    };

    const handleIBKRSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);
        try {
            await axios.post(`${API_BASE}/config`, {
                token: token || undefined,
                query_id: queryId
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            if (onSaveSuccess) onSaveSuccess();
        } catch (err) {
            setError(err.response?.data?.detail || t('config_error'));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const tabs = [
        { id: 'profile', label: t('profile'), icon: User },
        { id: 'security', label: t('security'), icon: Lock },
        { id: 'preferences', label: t('preferences'), icon: Sliders },
        { id: 'ibkr', label: t('ibkr_config'), icon: Database }
    ];

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

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
                    maxWidth: '600px',
                    margin: 0,
                    position: 'relative',
                    border: '1px solid var(--glass-border)',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            background: 'rgba(56, 189, 248, 0.1)',
                            padding: '0.5rem',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(56, 189, 248, 0.2)'
                        }}>
                            <SettingsIcon size={20} color="var(--accent-primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{t('user_settings')}</h2>
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

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid var(--glass-border)',
                    paddingBottom: '0.5rem',
                    overflowX: 'auto'
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setError(null);
                                    setSuccess(false);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                    border: '1px solid',
                                    borderColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                                    color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-dim)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    fontWeight: activeTab === tab.id ? 600 : 400,
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                    <AnimatePresence mode="wait">
                        {/* Profile Tab */}
                        {activeTab === 'profile' && (
                            <motion.form
                                key="profile"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleProfileSave}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('username')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.username}
                                        disabled
                                        className="glass-input"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-dim)',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('email')}
                                    </label>
                                    <input
                                        type="email"
                                        value={profile.email || ''}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                                        placeholder={t('email_placeholder')}
                                        className="glass-input"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('display_name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.display_name || ''}
                                        onChange={e => setProfile({ ...profile, display_name: e.target.value })}
                                        placeholder={t('display_name_placeholder')}
                                        className="glass-input"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                    />
                                </div>

                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid var(--glass-border)',
                                    fontSize: '0.875rem',
                                    color: 'var(--text-dim)'
                                }}>
                                    {t('member_since')}: {formatDate(profile.created_at)}
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="sync-button"
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                                >
                                    {saving ? <div className="spinner" /> : <Save size={18} />}
                                    {t('update_profile')}
                                </button>
                            </motion.form>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <motion.form
                                key="security"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handlePasswordChange}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('current_password')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.current_password}
                                        onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                        placeholder={t('current_password_placeholder')}
                                        className="glass-input"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('new_password')}
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={e => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        placeholder={t('new_password_placeholder')}
                                        className="glass-input"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="sync-button"
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                                >
                                    {saving ? <div className="spinner" /> : <Lock size={18} />}
                                    {t('change_password')}
                                </button>
                            </motion.form>
                        )}

                        {/* Preferences Tab */}
                        {activeTab === 'preferences' && (
                            <motion.form
                                key="preferences"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handlePreferencesSave}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('language')}
                                    </label>
                                    <select
                                        value={preferences.language}
                                        onChange={e => setPreferences({ ...preferences, language: e.target.value })}
                                        className="glass-select"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                    >
                                        <option value="en">English</option>
                                        <option value="es">Español</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('theme')}
                                    </label>
                                    <select
                                        value={preferences.theme}
                                        onChange={e => setPreferences({ ...preferences, theme: e.target.value })}
                                        className="glass-select"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                    >
                                        <option value="dark">{t('dark_theme')}</option>
                                        <option value="light">{t('light_theme')}</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                                        {t('default_currency')}
                                    </label>
                                    <select
                                        value={preferences.default_currency}
                                        onChange={e => setPreferences({ ...preferences, default_currency: e.target.value })}
                                        className="glass-select"
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid var(--glass-border)',
                                            color: 'var(--text-main)'
                                        }}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="COP">COP</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="sync-button"
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                                >
                                    {saving ? <div className="spinner" /> : <Save size={18} />}
                                    {t('save_preferences')}
                                </button>
                            </motion.form>
                        )}

                        {/* IBKR Config Tab */}
                        {activeTab === 'ibkr' && (
                            <motion.form
                                key="ibkr"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={handleIBKRSave}
                                style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
                            >
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
                                            color: 'var(--text-main)'
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
                                            color: 'var(--text-main)'
                                        }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving || (!token && !queryId)}
                                    className="sync-button"
                                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', margin: 0 }}
                                >
                                    {saving ? <div className="spinner" /> : <Save size={18} />}
                                    {t('save_config')}
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Success/Error Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    marginTop: '1rem',
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
                                    marginTop: '1rem',
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
                                {activeTab === 'profile' && t('profile_updated')}
                                {activeTab === 'security' && t('password_changed')}
                                {activeTab === 'preferences' && t('preferences_saved')}
                                {activeTab === 'ibkr' && t('config_saved')}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Settings;
