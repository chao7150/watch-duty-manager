import { Form } from "remix";

import * as TextInput from "../components/TextInput";

export type Props = {
  title?: Partial<TextInput.Props>;
  publishedAt?: { defaultValue: string };
  officialSiteUrl?: Partial<TextInput.Props>;
  twitterId?: Partial<TextInput.Props>;
  hashTag?: Partial<TextInput.Props>;
};

export const Component: React.VFC<Props> = ({
  title,
  publishedAt,
  officialSiteUrl,
  twitterId,
  hashTag,
}) => {
  return (
    <Form method="post">
      <p>
        <abbr title="required">*</abbr>は必須です。
      </p>
      <ul>
        <li>
          <TextInput.Component
            labelText="タイトル"
            name="title"
            isRequired={true}
            {...title}
          />
        </li>
        <li>
          <label>
            放送開始時期
            <abbr title="required" aria-label="required">
              *
            </abbr>
            <input type="month" name="publishedAt" {...publishedAt} />
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
            labelText="ハッシュタグ"
            name="hashtag"
            {...hashTag}
          />
        </li>
        <li>
          <button type="submit">submit</button>
        </li>
      </ul>
    </Form>
  );
};
