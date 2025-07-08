'use client';

import { motion } from 'motion/react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollectRef } from '@/hooks/useCollectRef';
import { useResizeEffect } from '@/hooks/useResizeEffect';
import { useCallback, useLayoutEffect, useState } from 'react';

const tabs = [
  { label: '소프트웨어 개발자', value: 'software-dev' },
  { label: '마라톤 러너', value: 'marathon' },
  { label: '오픈소스 기여자', value: 'oss' },
  { label: '코치', value: 'coach' },
  { label: '낙관적인 사람', value: 'optimistic' },
] as const;

type Tab = (typeof tabs)[number]['value'];

const LightTabs = ({ children }: { children: React.ReactNode }) => {
  const { refs, collect } = useCollectRef();
  const [activeTab, setActiveTab] = useState<Tab>('software-dev');

  const [barStyle, setBarStyle] = useState<Partial<DOMRect>>();

  const positioningEffect = useCallback(() => {
    for (const node of refs.current) {
      if (!node?.id.includes(activeTab)) continue;

      const { width, left, top } = node.getBoundingClientRect();
      setBarStyle({ width, left, top });
    }
  }, [activeTab, refs]);

  useLayoutEffect(() => positioningEffect(), [positioningEffect]);

  useResizeEffect(positioningEffect);

  return (
    <>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as Tab)}
      >
        <TabBar {...barStyle} />
        {tabs.map((tab, index) => (
            <>
              <TabsList
                className="bg-transparent pl-0 relative flex-wrap"
                key={tab.value}
              >
                <TabsTrigger
                  ref={collect}
                  className="data-[state=active]:font-bold data-[state=active]:bg-transparent !shadow-none px-0"
                  value={tab.value}
                >
                  {tab.label}
                </TabsTrigger>
                {index !== tabs.length - 1 && ','}
              </TabsList>
            </>
        ))}
        {children}
      </Tabs>
    </>
  );
};

function TabBar(style: Partial<DOMRect>) {
  return (
    <motion.div
      className="absolute h-[2px] bg-gradient-to-b from-teal-500/80 to-transparent
        overflow-visible
        after:absolute after:content-[''] after:top-[4px] after:left-0 after:w-full after:h-[4px]
        after:bg-teal-500/30 after:blur-sm
        before:absolute before:content-[''] before:top-[6px] before:left-0 before:w-full before:h-[6px]
        before:bg-teal-500/20 before:blur-md"
      style={style}
      animate={style}
      transition={{ stiffness: 800, damping: 30 }}
    />
  );
}

export default LightTabs;
