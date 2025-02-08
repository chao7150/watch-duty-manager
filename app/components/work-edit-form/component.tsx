import { useFetcher } from "@remix-run/react";

import { useEffect } from "react";

import type { action } from "~/routes/works.$workId";

import * as WorkInput from "../work/Input";

export type Props = {
  workId: string | number;
  workInput: WorkInput.Props;
  onSubmitSuccess: () => void;
};

export const Component: React.FC<Props> = ({
  workId,
  workInput,
  onSubmitSuccess,
}) => {
  const fetcher = useFetcher<typeof action>();
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data && !fetcher.data.hasError) {
      onSubmitSuccess();
    }
  }, [fetcher.state, fetcher.data]);
  return (
    <section>
      {fetcher.data && fetcher.data.hasError && <p>{fetcher.data.message}</p>}
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
