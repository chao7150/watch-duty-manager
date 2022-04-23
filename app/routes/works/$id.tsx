import { Work } from "@prisma/client";
import { LoaderFunction, useLoaderData } from "remix";
import { db } from "~/utils/db.server";

export const loader: LoaderFunction = async ({ params }) => {
  const id = params.id;
  if (id === undefined) {
    // TODO エラー
    return null;
  }
  const work = await db.work.findUnique({ where: { id: parseInt(id, 10) } });
  return work;
};

export default function Work() {
  const work = useLoaderData<Work>();

  return (
    <div>
      <h2>{work.title}</h2>
      <dl>
        <dt>公式サイト</dt>
        <dd>
          <a href={work.officialSiteUrl ?? undefined}>{work.officialSiteUrl}</a>
        </dd>
        <dt>公式ツイッター</dt>
        <dd>
          <a href={`https://twitter.com/${work.twitterId}`}>{work.twitterId}</a>
        </dd>
        <dt>ハッシュタグ</dt>
        <dd>#{work.hashtag}</dd>
      </dl>
    </div>
  );
}
