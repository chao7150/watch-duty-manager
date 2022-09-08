import * as E from "fp-ts/Either";
import * as F from "fp-ts/function";
import { json } from "@remix-run/node";
import { Form } from "@remix-run/react";

import { nonEmptyStringOrUndefined } from "~/utils/type";

import { isNonEmptyString } from "~/utils/validator";
import * as WorkInput from "./Work/Input";

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
        <small>
          <abbr title="required">*</abbr>は必須です。
        </small>
      </p>
      <fieldset className="mt-4" name="基本情報">
        <legend>
          <h3>基本情報</h3>
        </legend>
        <WorkInput.Component />
      </fieldset>
      <fieldset className="mt-4" name="放送情報">
        <legend>
          <h3>放送情報</h3>
        </legend>
        <ul className="mt-2 flex flex-col gap-2">
          <li>
            <label>
              <div>
                第1話放送日時
                <abbr title="required" aria-label="required">
                  *
                </abbr>
              </div>
              <input type="datetime-local" name="publishedAt" />
            </label>
          </li>
          <li>
            <label>
              <div>話数（予想でも可）</div>
              <input
                type="number"
                name="episodeCount"
                min={1}
                defaultValue={13}
              ></input>
            </label>
          </li>
        </ul>
      </fieldset>
      <button
        className="mt-4 bg-accent-area rounded-full py-2 px-12"
        type="submit"
      >
        送信
      </button>
    </Form>
  );
};
