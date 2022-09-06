import * as E from "fp-ts/Either";
import * as F from "fp-ts/function";
import { json } from "@remix-run/node";
import { Form } from "@remix-run/react";
import * as TextInput from "../components/TextInput";
import { nonEmptyStringOrUndefined } from "~/utils/type";
import * as DistributorForm from "../components/Distributor/Form";

import { isNonEmptyString } from "~/utils/validator";

export const serverValidator = (
  formData: FormData
): E.Either<
  Response,
  {
    title: string;
    publishedAt: Date;
    episodeCount: number;
    officialSiteUrl?: string;
    twitterId?: string;
    hashtag?: string;
    distributions?: { distributorId: number; workIdOnDistributor: string }[];
  }
> => {
  return F.pipe(
    formData,
    (formData) => {
      const title = formData.get("title");
      return isNonEmptyString(title)
        ? E.right({ formData, title })
        : E.left("title must not be empty");
    },
    E.chain(({ formData, ...rest }) => {
      const publishedAt = formData.get("publishedAt");
      return isNonEmptyString(publishedAt)
        ? E.right({ formData, publishedAt, ...rest })
        : E.left("publishedAt must not be empty");
    }),
    E.chain(({ formData, ...rest }) => {
      const episodeCount = formData.get("episodeCount");
      return isNonEmptyString(episodeCount)
        ? E.right({ formData, episodeCount, ...rest })
        : E.left("episodeCount must not be empty");
    }),
    E.chain(({ formData, ...rest }) => {
      const distributions = Object.entries(Object.fromEntries(formData))
        .filter(([k, v]) => k.startsWith("distributor-"))
        .map(([k, v]) => {
          return {
            distributorId: Number(k.replace("distributor-", "")),
            workIdOnDistributor: v as string,
          };
        });
      return E.right({ formData, distributions, ...rest });
    }),
    E.bimap(
      (l) => json({ errorMessage: l }, { status: 400 }),
      ({ title, publishedAt, episodeCount, distributions, formData }) => ({
        title,
        publishedAt: new Date(publishedAt),
        episodeCount: Number(episodeCount),
        distributions,
        ...nonEmptyStringOrUndefined(Object.fromEntries(formData), [
          "officialSiteUrl",
          "twitterId",
          "hashtag",
        ]),
      })
    )
  );
};

export type Props = {};

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
          <DistributorForm.Component />
        </li>
        <li>
          <button type="submit">submit</button>
        </li>
      </ul>
    </Form>
  );
};
