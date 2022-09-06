import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { Serialized } from "~/utils/type";
import type { LoaderData as DistributorsLoaderData } from "../../routes/distributors/index";

export type Props = {
  defaultValue?: { [N: number]: string };
};

export const Component: React.VFC<Props> = ({ defaultValue }) => {
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.type === "init") {
      fetcher.load("/distributors?index");
    }
  }, [fetcher]);
  const { distributors: distributors }: Serialized<DistributorsLoaderData> =
    fetcher.type === "done" ? fetcher.data : { distributors: [] };

  return (
    <div>
      <h4>配信サービスにおける作品ID</h4>
      <ul>
        {distributors.map((d) => {
          return (
            <label>
              {d.name}
              <input
                type="text"
                name={`distributor-${d.id}`}
                defaultValue={defaultValue && defaultValue[d.id]}
              />
            </label>
          );
        })}
      </ul>
    </div>
  );
};
