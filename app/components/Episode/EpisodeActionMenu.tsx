import { isValidUrlString } from "~/utils/validator";

import * as ClipboardCopyIcon from "../Icons/ClipboardCopy";
import * as ExternalLinkIcon from "../Icons/ExternalLink";
import * as FilterIcon from "../Icons/Filter";
import * as MenuIcon from "../Icons/Menu";
import { useCloseDetailsOnClickAway } from "../hooks/useCloseDetailsOnClickAway";
import * as WatchForm from "./WatchForm";

export type Props = {
  workId: number;
  officialSiteUrl?: string;
  watchUrl: string | undefined;
  count: number;
  watched: boolean;
  skipped?: boolean;
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
        <div className="w-6 h-6">{icon}</div>
        <span className="whitespace-nowrap">{text}</span>
      </OuterComponent>
    </li>
  );
};

export const Component: React.FC<Props> = ({
  workId,
  watchUrl,
  officialSiteUrl,
  count,
  watched,
  skipped,
  hashtag,
  onClickWatchUnready,
  published,
}) => {
  const { ref, onToggle } = useCloseDetailsOnClickAway();
  return (
    <div className="grid grid-cols-2 gap-2">
      <div>
        <details ref={ref} onToggle={onToggle} className="relative">
          <summary className="cursor-pointer list-none">
            <MenuIcon.Component />
          </summary>
          <ul className="z-10 absolute left-10 -top-1 shadow-menu bg-dark p-2 flex flex-col">
            {isValidUrlString(watchUrl) && (
              <MenuItem
                text="視聴リンク（外部）"
                icon={<ExternalLinkIcon.Component />}
                href={watchUrl}
              />
            )}
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
            skipped={skipped}
          />
        )}
      </div>
    </div>
  );
};
