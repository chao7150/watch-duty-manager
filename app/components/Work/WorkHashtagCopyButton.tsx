import * as ClipboardCopyIcon from "../../components/Icons/ClipboardCopy";

export type Props = { hashtag: string };

export const Component: React.VFC<Props> = ({ hashtag }) => {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(`#${hashtag}`);
      }}
      title="ハッシュタグをコピーする"
    >
      <ClipboardCopyIcon.Component />
    </button>
  );
};
