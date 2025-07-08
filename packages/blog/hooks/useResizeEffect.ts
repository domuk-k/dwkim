import { useLayoutEffect } from 'react';

export const useResizeEffect: typeof useLayoutEffect = (effect, deps) => {
  useLayoutEffect(() => {
    window.addEventListener('resize', effect);
    return () => window.removeEventListener('resize', effect);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effect, ...(deps ?? [])]);
};
