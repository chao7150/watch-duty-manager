import { pipe } from "fp-ts/lib/function";
import { either } from "fp-ts";
import { Form, json } from "remix";
import { nonEmptyStringOrUndefined } from "~/utils/type";

import * as TextInput from "../components/TextInput";
import { isNonEmptyString } from "~/utils/validator";

export const serverValidator = (
  formData: FormData
): either.Either<
  Response,
  {
    title: string;
    publishedAt: Date;
    episodeCount: number;
    officialSiteUrl?: string;
    twitterId?: string;
    hashtag?: string;
  }
> => {
  return pipe(
    formData,
    (formData) => {
      const title = formData.get("title");
      return isNonEmptyString(title)
        ? either.right({ formData, title })
        : either.left("title must not be empty");
    },
    either.chain(({ formData, ...rest }) => {
      const publishedAt = formData.get("publishedAt");
      return isNonEmptyString(publishedAt)
        ? either.right({ formData, publishedAt, ...rest })
        : either.left("publishedAt must not be empty");
    }),
    either.chain(({ formData, ...rest }) => {
      const episodeCount = formData.get("episodeCount");
      return isNonEmptyString(episodeCount)
        ? either.right({ formData, episodeCount, ...rest })
        : either.left("episodeCount must not be empty");
    }),
    either.bimap(
      (l) => json({ errorMessage: l }, { status: 400 }),
      ({ title, publishedAt, episodeCount, formData }) => ({
        title,
        publishedAt: new Date(publishedAt),
        episodeCount: Number(episodeCount),
        ...nonEmptyStringOrUndefined(Object.fromEntries(formData), [
          "officialSiteUrl",
          "twitterId",
          "hashtag",
        ]),
      })
    )
  );
};

export type Props = Record<string, never>;

export const Component: React.VFC<Props> = () => {
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
          />
        </li>
        <li>
          <label>
            第1話放送日時
            <abbr title="required" aria-label="required">
              *
            </abbr>
            <input type="datetime-local" name="publishedAt" />
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
          />
        </li>
        <li>
          <TextInput.Component labelText="ツイッターID" name="twitterId" />
        </li>
        <li>
          <TextInput.Component
            labelText="ハッシュタグ（#は不要）"
            name="hashtag"
          />
        </li>
        <li>
          <button type="submit">submit</button>
        </li>
      </ul>
    </Form>
  );
};
