import React from "react";

export type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  additionalClassName?: string;
};

export const Component: React.FC<Props> = ({
  children,
  additionalClassName,
  ...props
}) => {
  return (
    <button
      className={`w-full h-full bg-accent-area rounded-full py-1 px-3 ${additionalClassName || ""}`}
      {...props}
    >
      {children}
    </button>
  );
};
