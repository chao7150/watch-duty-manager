import { useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import type { LoaderData as DistributorsLoaderData } from "../../routes/distributors";
import { Serialized } from "~/utils/type";

export type Props = {
  defaultValue?: { [N: number]: string };
};

export const Component: React.FC<Props> = ({ defaultValue }) => {
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
            <li key={d.id}>
              <label className="flex">
                <div className="w-24">{d.name}</div>
                <input
                  className="ml-2"
                  type="text"
                  name={`distributor-${d.id}`}
                  defaultValue={defaultValue && defaultValue[d.id]}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
