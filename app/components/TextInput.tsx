import React from "react";

export type Props = {
  labelText: string;
  name: string;
  defaultValue?: string;
  isRequired?: boolean;
};

const RequiredAbbreviation: React.FC = () => (
  <abbr title="required" aria-label="required">
    *
  </abbr>
);

export const Component: React.FC<Props> = ({
  labelText,
  isRequired,
  ...props
}) => {
  return (
    <label className="flex flex-col">
      <span>
        {labelText}
        {isRequired && <RequiredAbbreviation />}
      </span>
      <input className="w-3/4" type="text" {...props} />
    </label>
  );
};
