'use client';

import { motion } from 'motion/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

const tabs = [
  { label: '소프트웨어 개발자', value: 'software-dev' },
  { label: '마라톤 러너', value: 'marathon' },
  { label: '오픈소스 기여자', value: 'oss' },
  { label: '코치', value: 'coach' },
  { label: '낙관적인 사람', value: 'optimistic' },
] as const;

type Tab = (typeof tabs)[number]['value'];

const LightTabs = ({ children }: { children: React.ReactNode }) => {
  const [activeTab, setActiveTab] = useState<Tab>('software-dev');

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as Tab)}
      className="w-full"
    >
      <div className="relative mb-8">
        <TabsList className="h-auto bg-transparent p-0 gap-0">
          {tabs.map((tab, index) => (
            <div key={tab.value} className="flex items-center">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative"
              >
                <TabsTrigger
                  value={tab.value}
                  className={`
                    relative px-0 py-2 bg-transparent border-0 shadow-none 
                    text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200
                    data-[state=active]:bg-transparent data-[state=active]:text-gray-900 dark:data-[state=active]:text-white
                    transition-colors duration-200 font-medium
                  `}
                >
                  {tab.label}
                  {activeTab === tab.value && (
                    <motion.div
                      className="absolute bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      layoutId="activeTabIndicator"
                      initial={false}
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </TabsTrigger>
              </motion.div>
              {index !== tabs.length - 1 && (
                <span className="mx-2 text-gray-400 dark:text-gray-600">,</span>
              )}
            </div>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
};

export default LightTabs;
