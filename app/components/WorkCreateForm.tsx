import { Prisma } from "@prisma/client";
import { Form } from "remix";

import * as TextInput from "../components/TextInput";

export const serverValidator = (formData: FormData): Prisma.WorkCreateInput => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    throw "title must not be empty";
  }

  const publishedAt = formData.get("publishedAt");
  if (typeof publishedAt !== "string" || publishedAt === "") {
    throw "publishedAt must not be empty";
  }

  const optionalWorkCreateInput = [
    "officialSiteUrl",
    "twitterId",
    "hashtag",
  ].reduce((acc, key) => {
    const formDataEntryValue = formData.get(key);
    const value =
      typeof formDataEntryValue === "string" ? formDataEntryValue : undefined;
    return { ...acc, [key]: value };
  }, {} as { officialSiteUrl?: string; twitterId?: string; hashtag?: string });

  return {
    title,
    publishedAt: new Date(publishedAt),
    ...optionalWorkCreateInput,
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
