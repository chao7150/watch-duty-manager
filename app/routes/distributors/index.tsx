import { Distributor } from "@prisma/client";
import { LoaderFunction, useLoaderData } from "remix";
import { db } from "~/utils/db.server";
import { Serialized } from "~/utils/type";

export type LoaderData = {
  distributors: Distributor[];
};

export const createDistributorLinkHref = ({
  distributorId,
  domain,
  workIdOnDistributor,
}: {
  distributorId: number;
  domain: string;
  workIdOnDistributor: string;
}): string | undefined => {
  switch (distributorId) {
    case 1:
      return `${domain}/animestore/ci_pc?workId=${workIdOnDistributor}`;
    default:
      return undefined;
  }
};

export const loader: LoaderFunction = async ({}): Promise<LoaderData> => {
  const distributors = await db.distributor.findMany();
  return { distributors };
};

export default function Distributors() {
  const { distributors } = useLoaderData<Serialized<LoaderData>>();

  return (
    <div className="remix__page">
      <section>
        <h2>配信サービス</h2>
        <table>
          {distributors.map((d) => {
            return (
              <tr key={d.id}>
                <td>{d.name}</td>
                <td>{d.domain}</td>
              </tr>
            );
          })}
        </table>
      </section>
    </div>
  );
}
