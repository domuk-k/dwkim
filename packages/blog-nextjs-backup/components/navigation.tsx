'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/posts', label: '글' },
  // { href: '/library', label: '라이브러리' }, // 임시로 숨김
];

export function Navigation() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <motion.div
        className={`mx-auto transition-all duration-300 py-4 ${
          isScrolled
            ? 'bg-white/80 dark:bg-gray-950/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/"
                className="text-lg font-medium text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                김동욱
              </Link>
            </motion.div>

            <div className="flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <motion.div
                    key={item.href}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Link
                      href={item.href}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                        isActive
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                      {isActive && (
                        <motion.div
                          className="absolute -top-1 inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg -z-10"
                          layoutId="activeTab"
                          initial={false}
                          transition={{
                            type: 'spring',
                            stiffness: 400,
                            damping: 30,
                          }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
}
