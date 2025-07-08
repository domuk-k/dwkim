import { useCallback, useRef } from 'react';

export const useCollectRef = () => {
  const refs = useRef<Set<HTMLButtonElement>>(new Set());

  const collect = useCallback(
    (instance: HTMLButtonElement) => refs.current.add(instance),
    [],
  );
  return { refs, collect };
};
