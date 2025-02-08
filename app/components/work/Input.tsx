export type Props = {
  workTitle?: { defaultValue: string };
  durationMin?: { defaultValue: number };
  officialSiteUrl?: { defaultValue: string };
  twitterId?: { defaultValue: string };
  hashtag?: { defaultValue: string };
};

export const Component: React.FC<Props> = ({
  workTitle,
  durationMin,
  officialSiteUrl,
  twitterId,
  hashtag,
}) => {
  return (
    <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
      <dt>
        タイトル
        <RequiredAbbreviation />
      </dt>
      <dd>
        <label className="w-full">
          <input
            type="text"
            name="title"
            defaultValue={workTitle?.defaultValue}
            className="w-full"
          ></input>
        </label>
      </dd>
      <dt>尺（分・未入力なら30分）</dt>
      <dd>
        <input
          name="durationMin"
          type="number"
          min={1}
          step={1}
          defaultValue={durationMin?.defaultValue}
          className="w-full"
        />
      </dd>
      <dt>公式サイトURL</dt>
      <dd>
        <label>
          <input
            type="text"
            name="officialSiteUrl"
            defaultValue={officialSiteUrl?.defaultValue}
            className="w-full"
          ></input>
        </label>
      </dd>
      <dt>ツイッターID（@は不要）</dt>
      <dd>
        <label>
          <input
            type="text"
            name="twitterId"
            defaultValue={twitterId?.defaultValue}
            className="w-full"
          ></input>
        </label>
      </dd>
      <dt>ハッシュタグ（#は不要）</dt>
      <dd>
        <label>
          <input
            type="text"
            name="hashtag"
            defaultValue={hashtag?.defaultValue}
            className="w-full"
          ></input>
        </label>
      </dd>
    </dl>
  );
};

const RequiredAbbreviation: React.FC = () => (
  <abbr title="required" aria-label="required">
    *
  </abbr>
);
