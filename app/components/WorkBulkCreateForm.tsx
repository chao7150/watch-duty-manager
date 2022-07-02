import { Form, json } from "remix";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import { isNonEmptyString } from "~/utils/validator";

export const serverValidator = (
  formData: FormData
): E.Either<
  Response,
  Array<{
    title: string;
    publishedAt: Date;
    episodeCount: number;
    officialSiteUrl?: string;
    twitterId?: string;
    hashtag?: string;
  }>
> => {
  return pipe(
    formData,
    (formData) => {
      const works = formData.get("works");
      return isNonEmptyString(works) ? E.right(works) : E.left("empty");
    },
    E.chain((works) => {
      return E.right(
        works.split("\n").map((line) => {
          const properties = line.split(",");
          return {
            title: properties[0],
            publishedAt: new Date(properties[1]),
            episodeCount: Number(properties[2]),
            officialSiteUrl: properties[3] || undefined,
            twitterId: properties[4] || undefined,
            hashtag: properties[5] || undefined,
          };
        })
      );
    }),
    E.mapLeft((e) => json({ errorMessage: e }, { status: 400 }))
  );
};

export type Props = Record<string, never>;

export const Component: React.VFC<Props> = () => {
  return (
    <Form method="post">
      <li>
        <label>
          複数番組
          <textarea
            name="works"
            defaultValue={
              "title,publishedAt(ISO8601),episodeCount,officialSiteUrl(optional),twitterId(optional),hashtag(optional without #)"
            }
          ></textarea>
        </label>
      </li>
      <li>
        <button type="submit" name="_action" value="bulkCreate">
          送信
        </button>
      </li>
    </Form>
  );
};
