import { Prisma } from "@prisma/client";
import { Form } from "remix";
import { nonEmptyStringOrUndefined } from "~/utils/type";

import * as TextInput from "../components/TextInput";

export const serverValidator = (
  formData: FormData
): Prisma.WorkCreateInput & { episodeCount: number } => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    throw "title must not be empty";
  }

  const publishedAt = formData.get("publishedAt");
  if (typeof publishedAt !== "string" || publishedAt === "") {
    throw "publishedAt must not be empty";
  }

  const episodeCount = formData.get("episodeCount");
  if (typeof episodeCount !== "string" || episodeCount === "") {
    throw "episodeCount must not be empty";
  }

  const optionalWorkCreateInput = nonEmptyStringOrUndefined(
    Object.fromEntries(formData),
    ["officialSiteUrl", "twitterid", "hashtag"]
  );

  return {
    title,
    publishedAt: new Date(publishedAt),
    ...optionalWorkCreateInput,
    episodeCount: parseInt(episodeCount, 10),
  };
};

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
            第1話放送日時
            <abbr title="required" aria-label="required">
              *
            </abbr>
            <input type="datetime-local" name="publishedAt" {...publishedAt} />
          </label>
        </li>
        <li>
          <label>
            話数（予想でも可）
            <input
              type="number"
              name="episodeCount"
              min={1}
              defaultValue={13}
            ></input>
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
