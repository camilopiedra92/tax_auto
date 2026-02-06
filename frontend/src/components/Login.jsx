import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, ArrowRight, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = ({ onLogin }) => {
    const { t } = useTranslation();
    const [userId, setUserId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (userId.trim()) {
            onLogin(userId.trim());
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
                        {t('welcome_back')}
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '1rem', marginBottom: '2.5rem' }}>
                        {t('enter_user_id')}
                    </p>
                </motion.div>

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
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={!userId.trim()}
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
                        {t('continue')}
                        <ArrowRight size={20} />
                    </motion.button>
                </motion.form>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    style={{
                        marginTop: '2.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--text-dim)',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '1.5rem'
                    }}
                >
                    {t('login_footer_text') || 'Secure access to your tax dashboard'}
                </motion.div>
            </motion.div>
        </div>
    );
};

export default Login;
