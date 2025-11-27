import { motion, useAnimation } from 'framer-motion';
import { useState } from 'react';
import { Tractor, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function HeroSection() {
  const { userData } = useAuth();
  const [clickCount, setClickCount] = useState(0);
  const tractorControls = useAnimation();

  const handleTractorClick = async () => {
    setClickCount(prev => prev + 1);
    await tractorControls.start({
      rotate: [0, -10, 10, -10, 10, 0],
      scale: [1, 1.2, 1],
      transition: { duration: 0.6 }
    });

    if (clickCount >= 4) {
      // Easter egg after 5 clicks
      await tractorControls.start({
        scale: [1, 2, 1],
        transition: { duration: 0.5 }
      });
    }
  };

  const userName = userData ? `${userData.nombres} ${userData.apellidos}`.trim() : 'Usuario';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-r from-green-600 to-green-800 text-white rounded-xl p-6 relative overflow-hidden"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
        <div className="absolute top-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 -translate-y-12"></div>
        <div className="absolute bottom-0 left-1/4 w-20 h-20 bg-white rounded-full translate-y-10"></div>
        <div className="absolute bottom-0 right-1/3 w-16 h-16 bg-white rounded-full translate-y-8"></div>
      </div>

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div
            animate={tractorControls}
            whileHover={{ scale: 1.1 }}
            onClick={handleTractorClick}
            className="cursor-pointer relative"
          >
            <Tractor size={48} className="text-green-200" />
            {clickCount >= 5 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2"
              >
                <Sparkles size={24} className="text-yellow-300" />
              </motion.div>
            )}
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold">AgroTech</h1>
            <p className="text-xl text-green-100 mt-1">
              Bienvenido, {userName}
              {clickCount >= 5 && (
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-yellow-300 ml-2"
                >
                  ✨ ¡Easter egg! ✨
                </motion.span>
              )}
            </p>
            {clickCount > 0 && clickCount < 5 && (
              <p className="text-green-200 text-sm mt-1">
                Clicks en el tractor: {clickCount}/5
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}