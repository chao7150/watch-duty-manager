import * as TextInput from "../../components/TextInput";

type TextInputOptionalProps = Pick<
  TextInput.Props,
  "defaultValue" | "isRequired"
>;

export type Props = {
  workTitle?: TextInputOptionalProps;
  durationMin?: { defaultValue: number };
  officialSiteUrl?: TextInputOptionalProps;
  twitterId?: TextInputOptionalProps;
  hashtag?: TextInputOptionalProps;
};

export const Component: React.FC<Props> = ({
  workTitle,
  durationMin,
  officialSiteUrl,
  twitterId,
  hashtag,
}) => {
  return (
    <ul className="flex flex-col gap-2">
      <li>
        <TextInput.Component
          labelText="タイトル"
          name="title"
          isRequired={true}
          {...workTitle}
        />
      </li>
      <li>
        <label>
          <div>尺（分・未入力なら30分）</div>
          <input
            name="durationMin"
            className="w-3/4"
            type="number"
            min={1}
            step={1}
            defaultValue={durationMin?.defaultValue}
          />
        </label>
      </li>
      <li>
        <TextInput.Component
          labelText="公式サイトURL"
          name="officialSiteUrl"
          {...officialSiteUrl}
        />
      </li>
      <li>
        <TextInput.Component
          labelText="ツイッターID"
          name="twitterId"
          {...twitterId}
        />
      </li>
      <li>
        <TextInput.Component
          labelText="ハッシュタグ（#は不要）"
          name="hashtag"
          {...hashtag}
        />
      </li>
    </ul>
  );
};
