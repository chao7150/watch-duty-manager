import { useCallback, useRef, useState } from "react";
import { useClickAway } from "react-use";

const noOpCallback = () => {};

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
  }, [ref.current]);
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
    [],
  );
  useClickAway(ref, onClickAway.f, ["click"]);
  return { ref, onToggle };
};
