import { useLoaderData } from "@remix-run/react";
import { db } from "~/utils/db.server";

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

export const loader = async ({ }) => {
  const distributors = await db.distributor.findMany();
  return { distributors };
};

export default function Distributors() {
  const { distributors } = useLoaderData<typeof loader>();

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
