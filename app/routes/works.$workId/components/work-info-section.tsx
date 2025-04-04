import { useState, useCallback } from "react";

import * as EditModeToggle from "~/components/EditModeToggle";
import {
  Component as WorkEditFormComponent,
  type Props as WorkEditFormProps,
} from "~/components/work-edit-form/component";
import * as Work from "~/components/work/component";

import { LoaderData } from "../server/loader";

/**
 * 作品情報表示・編集用コンポーネント
 * 作品のタイトル、詳細情報などを表示し、必要に応じて編集モードを切り替えられる
 */
export const Component = ({
  work,
}: {
  /** 作品の基本情報 */
  work: LoaderData["work"];
}) => {
  const [editMode, setEditMode] = useState(false);
  const turnEditMode = useCallback(() => setEditMode((s) => !s), []);

  const defaultValueMap: WorkEditFormProps = {
    workId: work.id,
    workInput: {
      workTitle: { defaultValue: work.title ?? "" },
      durationMin: { defaultValue: work.durationMin },
      officialSiteUrl: { defaultValue: work.officialSiteUrl ?? "" },
      twitterId: { defaultValue: work.twitterId ?? "" },
      hashtag: { defaultValue: work.hashtag ?? "" },
    },
    onSubmitSuccess: () => {
      setEditMode(false);
    },
  };

  return (
    <section className={`${editMode ? "col-span-2" : ""}`}>
      <header className="flex">
        <h3>作品情報</h3>
        <EditModeToggle.Component
          editMode={editMode}
          turnEditMode={turnEditMode}
        />
      </header>
      {editMode ? (
        <WorkEditFormComponent {...defaultValueMap} />
      ) : (
        <Work.Component
          {...{
            ...work,
            officialSiteUrl: work.officialSiteUrl ?? undefined,
            twitterId: work.twitterId ?? undefined,
            hashtag: work.hashtag ?? undefined,
          }}
        />
      )}
    </section>
  );
};
