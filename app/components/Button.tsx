import React from "react";

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
