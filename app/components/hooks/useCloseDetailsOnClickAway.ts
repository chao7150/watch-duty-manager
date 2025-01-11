import { useCallback, useRef, useState } from "react";
import { useClickAway } from "react-use";

/**
 * detailsが開かれたときに
 * そのdetailsのuseClickAwayのイベントハンドラをdetailsを閉じる処理に入れ替える
 */
export const useCloseDetailsOnClickAway = () => {
  const ref = useRef<HTMLDetailsElement>(null);
  const noOpCallback = useCallback(() => {}, []);
  const closeCallback = useCallback(() => {
    if (ref.current) {
      ref.current.removeAttribute("open");
    }
  }, [ref]);
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
    [],
  );
  const [onClickAway, setOnClickAway] = useState({ f: noOpCallback });
  useClickAway(ref, onClickAway.f);
  return { ref, onToggle };
};
