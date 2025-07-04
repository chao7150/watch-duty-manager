import { Link } from "@remix-run/react";

import { useState, useCallback } from "react";

import * as EditModeToggle from "~/components/EditModeToggle";
import { Component as WatchSettingsEditFormComponent } from "~/components/watch-settings-edit-form/component";

import { durationSec2DayAndSec } from "~/utils/date";
import { isValidUrlString } from "~/utils/validator";

/**
 * 視聴設定表示・編集用コンポーネント
 * 視聴する際の遅延時間や視聴URLなどの設定を表示・編集する
 */
export const Component = ({
  workId,
  delay,
  url,
}: {
  /** 作品ID */
  workId: number;
  /** 視聴遅延時間（秒） */
  delay: number | undefined;
  /** 視聴URL */
  url: string | undefined;
}) => {
  const [watchSettingsEditMode, setWatchSettingsEditMode] = useState(false);
  const toggleWatchSettingsEditMode = useCallback(
    () => setWatchSettingsEditMode((s) => !s),
    [],
  );

  return (
    <section>
      <header className="flex">
        <h3>視聴設定</h3>
        <EditModeToggle.Component
          editMode={watchSettingsEditMode}
          turnEditMode={toggleWatchSettingsEditMode}
        />
      </header>
      {watchSettingsEditMode ? (
        <WatchSettingsEditFormComponent
          workId={workId}
          defaultValue={{ delaySec: delay, url }}
          onSubmitSuccess={toggleWatchSettingsEditMode}
        />
      ) : (
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
          <dt className="whitespace-nowrap">視聴遅延</dt>
          <dd className="break-all">
            {delay === undefined
              ? "なし"
              : `${durationSec2DayAndSec(delay)[0]}日+${Math.floor(
                  durationSec2DayAndSec(delay)[1] / 3600,
                )
                  .toString()
                  .padStart(
                    2,
                    "0",
                  )}時間${((durationSec2DayAndSec(delay)[1] % 3600) / 60).toString().padStart(2, "0")}分`}
          </dd>
          <dt className="whitespace-nowrap">視聴リンク</dt>
          <dd className="break-all">
            {isValidUrlString(url) ? (
              <Link to={url} target="_blank">
                {url}
              </Link>
            ) : (
              url
            )}
          </dd>
        </dl>
      )}
    </section>
  );
};
