import * as E from "fp-ts/Either";
import { useFetcher } from "@remix-run/react";
import * as TextInput from "./TextInput";
import { db } from "~/utils/db.server";
import { nonEmptyStringOrUndefined } from "~/utils/type";
import * as DistributorForm from "../components/Distributor/Form";

export const serverAction = async (
  workId: number,
  formData: FormData
): Promise<
  E.Either<
    { errorMessage: string; status: number },
    { successMessage: string; status: number }
  >
> => {
  const title = formData.get("title");
  if (typeof title !== "string" || title === "") {
    return E.left({ errorMessage: "title must not be empty", status: 400 });
  }
  const optionalWorkCreateInput = nonEmptyStringOrUndefined(
    Object.fromEntries(formData),
    ["officialSiteUrl", "twitterId", "hashtag"]
  );
  const distributions = Object.entries(Object.fromEntries(formData))
    .filter(([k, v]) => k.startsWith("distributor-"))
    .map(([k, v]) => {
      return {
        distributorId: Number(k.replace("distributor-", "")),
        workIdOnDistributor: v as string,
      };
    });
  try {
    const work = await db.work.update({
      where: { id: workId },
      data: {
        title,
        ...optionalWorkCreateInput,
      },
    });
    await Promise.all(
      distributions.map(async (d) => {
        await db.distributorsOnWorks.upsert({
          where: {
            workId_distributorId: {
              workId: work.id,
              distributorId: d.distributorId,
            },
          },
          create: {
            workIdOnDistributor: d.workIdOnDistributor,
            distributorId: d.distributorId,
            workId: work.id,
          },
          update: {
            workIdOnDistributor: d.workIdOnDistributor,
          },
        });
      })
    );
    return E.right({
      successMessage: `${work.title} is successfully updated`,
      status: 200,
    });
  } catch (e) {
    console.log(e);
    return E.left({ errorMessage: "internal server error", status: 500 });
  }
};

export type Props = {
  workId: string | number;
  title?: Partial<TextInput.Props>;
  officialSiteUrl?: Partial<TextInput.Props>;
  twitterId?: Partial<TextInput.Props>;
  hashTag?: Partial<TextInput.Props>;
  distributionForm?: DistributorForm.Props;
};

export const Component: React.VFC<Props> = ({
  workId,
  title,
  officialSiteUrl,
  twitterId,
  hashTag,
  distributionForm,
}) => {
  const fetcher = useFetcher();
  return (
    <section>
      {fetcher.data && (
        <p>{fetcher.data.errorMessage || fetcher.data.successMessage}</p>
      )}
      <fetcher.Form method="post" action={`/works/${workId}`}>
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
            <DistributorForm.Component {...distributionForm} />
          </li>
          <li className="mt-2 flex">
            <button
              className="bg-accent-area rounded-full py-1 px-3 ml-auto"
              type="submit"
              name="_action"
              value="edit"
            >
              送信
            </button>
          </li>
        </ul>
      </fetcher.Form>
    </section>
  );
};
