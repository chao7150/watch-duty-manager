import { Link, Form } from "@remix-run/react";
import React from "react";
import { bindUrl as bindUrlForMy } from "../routes/my";
import { bindUrl as bindUrlForWorks } from "../routes/works._index";
import { cour2symbol, date2cour } from "../domain/cour/util";

export type Props = {
  userId?: string;
};

const ListItem = ({
  text,
  ...link
}: {
  text: string;
  to: string;
  target?: string;
}) => {
  return (
    <li className="hover:bg-accent-area">
      <Link {...link} className="block py-1.5">
        {text}
      </Link>
    </li>
  );
};

export const Component: React.FC<Props> = ({ userId }) => {
  return (
    <ul>
      <ListItem text="Home" to="/" />
      <ListItem
        text="Works"
        to={bindUrlForWorks({
          "?query": { cour: cour2symbol(date2cour(new Date())) },
        })}
      />
      <ListItem text="Create" to="/create" />
      <ListItem
        text="Help"
        to="https://chao7150.notion.site/wdm-help-82a9677f1ae545e7be3ee110a2c40068?pvs=4"
        target="_blank"
      />
      {userId ? (
        <>
          <ListItem
            text="My"
            to={bindUrlForMy({
              "?query": { cour: cour2symbol(date2cour(new Date())) },
            })}
          />
          <li className="text-link py-1">
            <Form action="/logout" method="POST">
              <button className="hover:bg-accent-area w-full" type="submit">
                Logout
              </button>
            </Form>
          </li>
        </>
      ) : (
        <ListItem text="Login" to="/login" />
      )}
    </ul>
  );
};
