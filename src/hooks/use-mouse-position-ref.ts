import { RefObject, useEffect, useRef } from "react";

export function useMousePositionRef(containerRef: RefObject<HTMLElement | null>) {
  const mousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) {
        mousePositionRef.current = { x: 0, y: 0 };
        return;
      }

      mousePositionRef.current = {
        x: event.clientX - rect.left - rect.width / 2,
        y: event.clientY - rect.top - rect.height / 2
      };
    };

    window.addEventListener("pointermove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleMouseMove);
    };
  }, [containerRef]);

  return mousePositionRef;
}
