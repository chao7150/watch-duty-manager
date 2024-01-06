import { useFetcher } from "@remix-run/react";
import * as TextInput from "../../components/TextInput";
import { type loader as MyLoader } from "../../routes/my/route";
import { useEffect } from "react";

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
  personalTags?: number[];
};

export const Component: React.FC<Props> = ({
  workTitle,
  durationMin,
  officialSiteUrl,
  twitterId,
  hashtag,
  personalTags,
}) => {
  const personalTagsFetcher = useFetcher<typeof MyLoader>();
  useEffect(() => {
    personalTagsFetcher.load("/my");
  }, []);

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
      {personalTags && (
        <li>
          <label>
            <div>パーソナルタグ</div>
            <ul>
              {personalTagsFetcher.data?.tagsOnUser.map((t) => {
                return (
                  <li>
                    <input
                      type="checkbox"
                      defaultChecked={personalTags.includes(t.id)}
                      name={`personal-tag-${String(t.id)}`}
                    ></input>
                    {t.text}
                  </li>
                );
              })}
            </ul>
          </label>
        </li>
      )}
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
