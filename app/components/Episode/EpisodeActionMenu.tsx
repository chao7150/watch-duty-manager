import * as ExternalLinkIcon from "../Icons/ExternalLink";
import * as FilterIcon from "../Icons/Filter";
import * as WatchForm from "./WatchForm";
import * as MenuIcon from "../Icons/Menu";
import * as ClipboardCopyIcon from "../Icons/ClipboardCopy";
import { useRef } from "react";

export type Props = {
  workId: number;
  officialSiteUrl?: string;
  count: number;
  watched: boolean;
  hashtag?: string;
  onClickWatchUnready?: (workId: number) => void;
  published: boolean;
};

type MenuItemProps = {
  text: string;
  icon: React.ReactNode;
} & ({ onClick: () => void; href?: never } | { href: string; onClick?: never });

const MenuItem: React.FC<MenuItemProps> = ({ text, icon, onClick, href }) => {
  const OuterComponent = onClick ? "button" : "a";
  return (
    <li>
      <OuterComponent
        onClick={onClick}
        href={href}
        className="w-full flex flex-row gap-1 hover:bg-accent-area py-1"
        target={href ? "_blank" : undefined}
      >
        {icon}
        <p className="whitespace-nowrap">{text}</p>
      </OuterComponent>
    </li>
  );
};

export const Component: React.FC<Props> = ({
  workId,
  officialSiteUrl,
  count,
  watched,
  hashtag,
  onClickWatchUnready,
  published,
}) => {
  const ref = useRef<HTMLDetailsElement>(null);
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <details ref={ref} className="relative">
          <summary className="cursor-pointer list-none">
            <MenuIcon.Component />
          </summary>
          <ul className="z-10 absolute left-10 -top-1 shadow-menu bg-dark p-2 flex flex-col">
            {hashtag !== undefined && hashtag !== "" && (
              <MenuItem
                text="ハッシュタグをコピー"
                icon={<ClipboardCopyIcon.Component />}
                onClick={() => {
                  navigator.clipboard.writeText(`#${hashtag}`);
                  ref.current?.removeAttribute("open");
                }}
              />
            )}
            {onClickWatchUnready && (
              <MenuItem
                text="作品でフィルタ"
                icon={<FilterIcon.Component />}
                onClick={() => {
                  onClickWatchUnready(workId);
                  ref.current?.removeAttribute("open");
                }}
              />
            )}
            {officialSiteUrl !== undefined && officialSiteUrl !== "" && (
              <MenuItem
                text="公式サイト（外部）"
                icon={<ExternalLinkIcon.Component />}
                href={officialSiteUrl}
              />
            )}
          </ul>
        </details>
      </div>
      <div>
        {published && (
          <WatchForm.Component
            workId={workId}
            count={count}
            watched={watched}
          />
        )}
      </div>
    </div>
  );
};
