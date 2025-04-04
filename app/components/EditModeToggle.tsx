import React, { useCallback } from "react";
import * as CloseIcon from "./Icons/Close";
import * as EditIcon from "./Icons/Edit";

interface Props {
  editMode: boolean;
  turnEditMode: () => void;
}

export const Component: React.FC<Props> = ({ editMode, turnEditMode }) => {
  return (
    <button className="ml-2" onClick={turnEditMode}>
      {editMode ? (
        <div title="編集をやめる">
          <CloseIcon.Component />
        </div>
      ) : (
        <div title="編集する">
          <EditIcon.Component />
        </div>
      )}
    </button>
  );
};