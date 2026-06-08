"use client";

import {
  useEffect,
  useRef,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") ref(value);
      else if (ref && typeof ref === "object")
        (ref as React.MutableRefObject<T | null>).current = value;
    });
  };
}

type Props = {
  children: ReactNode;
  delay?: number;
  className?: string;
  asChild?: boolean;
};

export function AnimateOnScroll({ children, delay = 0, className, asChild }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => el.classList.add("visible"), delay);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      className?: string;
      ref?: Ref<HTMLElement>;
      "data-animate"?: boolean;
    }>;
    return cloneElement(child, {
      ref: mergeRefs(ref, child.props.ref),
      className: [child.props.className, className].filter(Boolean).join(" ") || undefined,
      "data-animate": true as const,
    });
  }

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} data-animate className={className}>
      {children}
    </div>
  );
}
