import { useFetcher } from "@remix-run/react";

import type { action } from "~/routes/works.$workId";

import * as WorkInput from "../Work/Input";

export type Props = {
  workId: string | number;
  workInput: WorkInput.Props;
};

export const Component: React.FC<Props> = ({ workId, workInput }) => {
  const fetcher = useFetcher<typeof action>();
  return (
    <section>
      {fetcher.data && <p>{fetcher.data.data.message}</p>}
      <fetcher.Form method="POST" action={`/works/${workId}`}>
        <WorkInput.Component {...workInput} />
        <button
          className="mt-4 bg-accent-area rounded-full py-1 px-3 ml-auto"
          type="submit"
          name="_action"
          value="edit"
        >
          送信
        </button>
      </fetcher.Form>
    </section>
  );
};
