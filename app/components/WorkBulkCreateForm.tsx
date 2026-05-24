import { Form } from "react-router";

import type { BulkWorkInput } from "~/domain/work/types";
import type { Result } from "~/utils/result";
import { Err, Ok } from "~/utils/result";
import { isNonEmptyString } from "~/utils/validator";

export const serverValidator = (
  formData: FormData,
): Result<BulkWorkInput[], { type: "empty" }> => {
  const works = formData.get("works");
  if (!isNonEmptyString(works)) {
    return Err({ type: "empty" });
  }
  return Ok(
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
    }),
  );
};

export type Props = Record<string, never>;

export const Component: React.FC<Props> = () => {
  return (
    <Form method="POST">
      <ul>
        <li>
          <label>
            複数番組
            <textarea
              name="works"
              className="w-full p-2 border border-gray-300 rounded"
              placeholder={
                "title,publishedAt(ISO8601),episodeCount,officialSiteUrl(optional),twitterId(optional),hashtag(optional without #)"
              }
            ></textarea>
          </label>
        </li>
        <li>
          <button
            className="mt-4 bg-accent-area rounded-full py-2 px-12"
            type="submit"
            name="_action"
            value="bulkCreate"
          >
            送信
          </button>
        </li>
      </ul>
    </Form>
  );
};
