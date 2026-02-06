import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        setIsOpen(false);
    };

    const languages = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'es', label: 'Español', flag: '🇪🇸' },
    ];

    // Get current language object
    const currentLanguage = languages.find(lang => i18n.language.startsWith(lang.code)) || languages[0];

    return (
        <div style={{ position: 'relative', zIndex: 100 }}>
            <button
                onClick={toggleOpen}
                className="glass-card"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-main)',
                    fontSize: '0.875rem',
                    borderRadius: '2rem',
                }}
            >
                <span style={{ fontSize: '1.25rem' }}>{currentLanguage.flag}</span>
                <span style={{ fontWeight: 600 }}>{currentLanguage.code.toUpperCase()}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                            position: 'absolute',
                            top: '110%',
                            right: 0,
                            background: '#0f172a',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '0.75rem',
                            padding: '0.5rem',
                            width: '140px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => changeLanguage(lang.code)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.5rem 0.75rem',
                                        background: i18n.language.startsWith(lang.code) ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: i18n.language.startsWith(lang.code) ? 'var(--accent-primary)' : 'var(--text-dim)',
                                        cursor: 'pointer',
                                        width: '100%',
                                        textAlign: 'left',
                                        fontSize: '0.875rem',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span style={{ fontSize: '1.25rem' }}>{lang.flag}</span>
                                    <span style={{ fontWeight: i18n.language.startsWith(lang.code) ? 600 : 400 }}>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LanguageSelector;
