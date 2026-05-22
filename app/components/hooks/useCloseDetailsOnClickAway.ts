import { useCallback, useEffect, useRef, useState } from "react";

const noOpCallback = () => {};

function useClickAway(
  ref: React.RefObject<HTMLElement | null>,
  onClickAway: (event: Event) => void,
  events: string[] = ["click"],
) {
  useEffect(() => {
    const handler = (event: Event) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      onClickAway(event);
    };

    events.forEach((event) => {
      document.addEventListener(event, handler);
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handler);
      });
    };
  }, [ref, onClickAway, events]);
}

/**
 * detailsが開かれたときに
 * そのdetailsのuseClickAwayのイベントハンドラをdetailsを閉じる処理に入れ替える
 */
export const useCloseDetailsOnClickAway = () => {
  const ref = useRef<HTMLDetailsElement>(null);
  const closeCallback = useCallback(() => {
    if (ref.current) {
      ref.current.removeAttribute("open");
    }
  }, []);
  const [onClickAway, setOnClickAway] = useState({ f: noOpCallback });
  const onToggle = useCallback<React.ReactEventHandler<HTMLDetailsElement>>(
    (_) => {
      if (ref.current === null) {
        return;
      }
      if (ref.current.open) {
        setOnClickAway({ f: closeCallback });
      } else {
        setOnClickAway({ f: noOpCallback });
      }
    },
    [closeCallback],
  );
  useClickAway(ref, onClickAway.f, ["click"]);
  return { ref, onToggle };
};
