import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Lock, ArrowRight, LayoutDashboard, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const Login = ({ onLogin }) => {
    const { t } = useTranslation();
    const [isRegister, setIsRegister] = useState(false);
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            if (isRegister) {
                if (password !== confirmPassword) {
                    setError(t('passwords_dont_match'));
                    setLoading(false);
                    return;
                }
                await axios.post(`${API_BASE}/auth/register`, {
                    username: userId,
                    password: password
                });
                setSuccessMsg(t('registration_success'));
                setIsRegister(false);
                setPassword('');
                setConfirmPassword('');
            } else {
                const formData = new FormData();
                formData.append('username', userId);
                formData.append('password', password);

                const response = await axios.post(`${API_BASE}/auth/login`, formData);
                onLogin(response.data.user_id, response.data.access_token);
            }
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError(t('invalid_credentials'));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-mesh-bg" />

            {/* Floating background elements for extra depth */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ duration: 2 }}
                style={{
                    position: 'absolute',
                    top: '15%',
                    left: '10%',
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    filter: 'blur(100px)',
                    zIndex: 0
                }}
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                transition={{ duration: 2, delay: 0.5 }}
                style={{
                    position: 'absolute',
                    bottom: '15%',
                    right: '10%',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'var(--accent-secondary)',
                    filter: 'blur(120px)',
                    zIndex: 0
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                    duration: 0.8,
                    ease: [0.16, 1, 0.3, 1]
                }}
                className="glass-card login-card"
            >
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
                    className="login-icon-container"
                >
                    <LayoutDashboard size={36} color="var(--accent-primary)" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: 800,
                        marginBottom: '0.75rem',
                        letterSpacing: '-0.04em',
                        background: 'linear-gradient(to bottom, #fff, #94a3b8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {isRegister ? t('create_account') : t('welcome_back')}
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '1rem', marginBottom: '2.5rem' }}>
                        {isRegister ? t('enter_user_id') : t('login_footer_text')}
                    </p>
                </motion.div>

                {error && (
                    <div style={{ color: '#f87171', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div style={{ color: '#4ade80', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
                        {successMsg}
                    </div>
                )}

                <motion.form
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                    <div className="glass-input-container">
                        <div style={{
                            position: 'absolute',
                            left: '1.25rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-dim)',
                            zIndex: 1
                        }}>
                            <User size={20} />
                        </div>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder={t('user_id_placeholder')}
                            className="glass-input"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="glass-input-container">
                        <div style={{
                            position: 'absolute',
                            left: '1.25rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-dim)',
                            zIndex: 1
                        }}>
                            <Lock size={20} />
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('password_placeholder')}
                            className="glass-input"
                            required
                        />
                    </div>

                    {isRegister && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="glass-input-container"
                        >
                            <div style={{
                                position: 'absolute',
                                left: '1.25rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-dim)',
                                zIndex: 1
                            }}>
                                <Lock size={20} />
                            </div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={t('confirm_password_placeholder')}
                                className="glass-input"
                                required
                            />
                        </motion.div>
                    )}

                    <motion.button
                        type="submit"
                        disabled={loading || !userId.trim() || !password.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="sync-button"
                        style={{
                            width: '100%',
                            height: '3.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            marginTop: '0.5rem'
                        }}
                    >
                        {loading ? '...' : (isRegister ? t('register') : t('login'))}
                        <ArrowRight size={20} />
                    </motion.button>
                </motion.form>

                <div style={{
                    marginTop: '1.5rem',
                    textAlign: 'center'
                }}>
                    <button
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError(null);
                            setSuccessMsg(null);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isRegister ? t('already_have_account') : t('need_account')}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
