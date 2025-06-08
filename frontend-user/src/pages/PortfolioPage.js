// frontend-user/src/pages/PortfolioPage.js
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './PortfolioPage.css'; // Gaya spesifik halaman ini

function PortfolioPage() {
    // Efek untuk mencegah context menu (klik kanan)
    useEffect(() => {
        const handleContextMenu = (event) => {
            event.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);

        // Cleanup: hapus event listener saat komponen di-unmount
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    // Daftar teks yang akan dirotasi
    const texts = [
        "WHAT ARE YOU LOOKING FOR HERE?",
        "PIRATED FILE", // Ini akan menjadi merah
        "OF COURSE THERE IS"
    ];
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    // Efek untuk merotasi teks setiap 3 detik
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
        }, 3000); // Ganti teks setiap 3 detik

        // Cleanup: bersihkan interval saat komponen di-unmount
        return () => clearInterval(interval);
    }, [texts.length]);

    // Variasi animasi untuk teks
    const textVariants = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    return (
        // .portfolio-page-container tidak lagi mengandung particles-background
        // karena partikel sekarang ditangani di App.js secara global.
        <div className="portfolio-page-container">
            {/* Partikel Latar Belakang Dihapus dari sini dan dipindahkan ke App.js */}
            {/* Konten utama halaman portfolio */}
            <main className="portfolio-content-area">
                <motion.section
                    className="hero-section"
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    {/* Judul utama yang sudah ada */}
                    <h1>THIS IS MINE!</h1> 
                    <AnimatePresence mode='wait'>
                        <motion.p
                            className={`tagline ${texts[currentTextIndex] === "PIRATED FILE" ? 'red-text-accent' : ''}`}
                            key={currentTextIndex}
                            variants={textVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={{ duration: 0.5 }}
                        >
                            {texts[currentTextIndex]}
                        </motion.p>
                    </AnimatePresence>
                </motion.section>
            </main>
        </div>
    );
}

export default PortfolioPage;