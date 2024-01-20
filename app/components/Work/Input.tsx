import { useFetcher } from "@remix-run/react";

import { useEffect } from "react";

import { type loader as MyLoader } from "~/routes/my.tag";

import * as TextInput from "~/components/TextInput";

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
    personalTagsFetcher.load("/my/tag");
  },[]);

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
        <label className="flex flex-col">
          <span>尺（分・未入力なら30分）</span>
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
          labelText="ツイッターID（@は不要）"
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
                  <li key={t.id}>
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
