'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ShiftCard from './ShiftCard';
import type { ShiftRecord } from '@/hooks/usePaginatedShifts';

interface VirtualizedShiftListProps {
  shifts: ShiftRecord[];
  onShiftClick?: (shift: ShiftRecord) => void;
  onShiftEdit?: (shift: ShiftRecord) => void;
  onShiftDelete?: (shiftId: string) => void;
  selectedShiftIds?: Set<string>;
  onToggleSelect?: (shiftId: string) => void;
  emptyState?: React.ReactNode;
  estimatedItemHeight?: number;
}

const DEFAULT_ESTIMATED_HEIGHT = 132;
const OVERSCAN_COUNT = 6;

export default function VirtualizedShiftList({
  shifts,
  onShiftClick,
  onShiftEdit,
  onShiftDelete,
  selectedShiftIds,
  onToggleSelect,
  emptyState,
  estimatedItemHeight = DEFAULT_ESTIMATED_HEIGHT,
}: VirtualizedShiftListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerHeight, setContainerHeight] = useState(640);
  const [scrollTop, setScrollTop] = useState(0);
  const heightsRef = useRef<Map<string, number>>(new Map());
  const [heightsVersion, setHeightsVersion] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      setContainerHeight(container.clientHeight);
    };

    handleResize();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const { offsets, totalHeight } = useMemo(() => {
    const offsetsAccumulator: number[] = new Array(shifts.length);
    let runningOffset = 0;

    for (let index = 0; index < shifts.length; index += 1) {
      offsetsAccumulator[index] = runningOffset;
      const measuredHeight = heightsRef.current.get(shifts[index].id);
      runningOffset += measuredHeight ?? estimatedItemHeight;
    }

    return { offsets: offsetsAccumulator, totalHeight: runningOffset };
  }, [shifts, estimatedItemHeight, heightsVersion]);

  const findStartIndex = useCallback(
    (value: number) => {
      let low = 0;
      let high = offsets.length - 1;
      let mid = 0;

      while (low <= high) {
        mid = Math.floor((low + high) / 2);
        const offset = offsets[mid];
        const nextOffset = mid + 1 < offsets.length ? offsets[mid + 1] : totalHeight;

        if (offset <= value && value < nextOffset) {
          return mid;
        }

        if (offset < value) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      return Math.max(0, Math.min(offsets.length - 1, low));
    },
    [offsets, totalHeight]
  );

  const startIndex = useMemo(() => findStartIndex(Math.max(0, scrollTop - estimatedItemHeight * OVERSCAN_COUNT)), [
    scrollTop,
    findStartIndex,
    estimatedItemHeight,
  ]);

  const endIndex = useMemo(() => {
    if (!offsets.length) return 0;

    let index = startIndex;
    const target = scrollTop + containerHeight + estimatedItemHeight * OVERSCAN_COUNT;

    while (index < offsets.length && offsets[index] < target) {
      index += 1;
    }

    return Math.min(offsets.length, index + OVERSCAN_COUNT);
  }, [offsets, startIndex, scrollTop, containerHeight, estimatedItemHeight]);

  const visibleItems = useMemo(() => shifts.slice(startIndex, endIndex), [shifts, startIndex, endIndex]);

  const registerHeight = useCallback((shiftId: string, node: HTMLDivElement | null) => {
    if (!node) return;

    const measuredHeight = node.getBoundingClientRect().height;
    const previousHeight = heightsRef.current.get(shiftId);

    if (!previousHeight || Math.abs(previousHeight - measuredHeight) > 2) {
      heightsRef.current.set(shiftId, measuredHeight);
      setHeightsVersion(version => version + 1);
    }
  }, []);

  if (!shifts.length) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900/60 rounded-xl border border-gray-800">
        {emptyState ?? (
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-white">No shifts scheduled</p>
            <p className="text-sm text-gray-400">Adjust your filters or create a new shift to get started.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-[640px] overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/70"
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((shift, idx) => {
          const globalIndex = startIndex + idx;
          const top = offsets[globalIndex];
          const isSelected = selectedShiftIds?.has(shift.id);

          return (
            <div
              key={shift.id}
              ref={node => registerHeight(shift.id, node)}
              style={{
                position: 'absolute',
                top,
                left: 0,
                right: 0,
              }}
              className="px-4 py-2"
            >
              <ShiftCard
                shift={shift as any}
                onClick={onShiftClick ? () => onShiftClick(shift) : undefined}
                onEdit={onShiftEdit ? () => onShiftEdit(shift) : undefined}
                onDelete={onShiftDelete ? () => onShiftDelete(shift.id) : undefined}
                selectable={Boolean(onToggleSelect)}
                selected={isSelected}
                onToggleSelect={onToggleSelect ? () => onToggleSelect(shift.id) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
