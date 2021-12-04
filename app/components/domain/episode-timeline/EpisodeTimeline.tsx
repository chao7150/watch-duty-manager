import * as React from "react";

import * as Episode from "../episode/Episode";

export type Props = {
  title: string;
  episodes: Readonly<Episode.Props>[];
};

export const Component: React.VFC<Props> = ({
  title,
  episodes,
}: Props) => {
  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {episodes.map((episode) => {
          return (
            <li key={episode.id}>
              <Episode.Component {...episode}></Episode.Component>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
