import type React from "react";

export type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export const Component: React.FC<Props> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={`bg-accent-area rounded-full py-1 px-3 cursor-pointer disabled:cursor-not-allowed ${className ?? "w-full"}`}
      {...props}
    >
      {children}
    </button>
  );
};

type LinkTextProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  fetcherState: "idle" | "submitting" | "loading";
  idleText: string;
};

const LinkTextComponent: React.FC<LinkTextProps> = ({
  fetcherState,
  idleText,
  className,
  ...props
}) => {
  return (
    <button
      className={`text-sm text-text-weak border-b border-dashed border-text-weak pb-0.5 hover:text-text hover:border-solid hover:border-text bg-transparent ${className ?? ""}`}
      {...props}
    >
      {fetcherState === "idle" ? idleText : "送信中"}
    </button>
  );
};

export const LinkText = {
  Component: LinkTextComponent,
};
