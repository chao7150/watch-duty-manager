import { Link } from "@remix-run/react";

import * as WorkHashtagCopyButton from "~/components/work/WorkHashtagCopyButton";

export type Props = {
  title: string;
  durationMin: number;
  officialSiteUrl?: string;
  twitterId?: string;
  hashtag?: string;
};

export const Component: React.FC<Props> = ({
  title,
  durationMin,
  officialSiteUrl,
  twitterId,
  hashtag,
}) => {
  return (
    <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
      <dt>尺</dt>
      <dd>{durationMin}分</dd>
      <dt>公式サイト</dt>
      <dd>
        <a href={officialSiteUrl ?? undefined} className="hover:underline">
          {officialSiteUrl}
        </a>
      </dd>
      <dt>公式ツイッター</dt>
      <dd>
        <a
          href={`https://twitter.com/${twitterId}`}
          className="hover:underline"
        >
          {twitterId}
        </a>
      </dd>
      <dt>ハッシュタグ</dt>
      <dd>
        {hashtag && (
          <span className="flex items-center">
            <a
              href={`https://twitter.com/hashtag/${hashtag}`}
              className="hover:underline"
            >
              <span>#{hashtag}</span>
            </a>
            <span className="w-5 h-6">
              <WorkHashtagCopyButton.Component hashtag={hashtag} />
            </span>
          </span>
        )}
      </dd>
      <dt>配信サービス</dt>
      <dd>
        <Link
          to={`https://animestore.docomo.ne.jp/animestore/sch_pc?searchKey=${encodeURIComponent(
            title,
          )}&vodTypeList=svod_tvod`}
        >
          dアニメストア
        </Link>
      </dd>
    </dl>
  );
};
