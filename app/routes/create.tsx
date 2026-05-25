import { useState } from "react";
import { data, redirect, useActionData } from "react-router";

import { episodeRepository } from "~/adapters/repository/prisma/episode";
import { workRepository } from "~/adapters/repository/prisma/work";
import * as WorkBulkCreateForm from "~/components/WorkBulkCreateForm";
import { serverValidator as WorkCreateFormServerValidator } from "~/components/work-create-form/action.server";
import { Component as WorkCreateFormComponent } from "~/components/work-create-form/component";
import { bulkCreateWorks } from "~/usecases/bulkCreateWorks";
import { createWork } from "~/usecases/createWork";
import { errorToMessage, errorToStatus } from "~/utils/result";

import type { Route } from "./+types/create";

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.formData();

  if (formData.get("_action") === "bulkCreate") {
    const validationResult = WorkBulkCreateForm.serverValidator(formData);
    if (validationResult.err) {
      return data(
        { errorMessage: "登録しようとしている作品が0件です" },
        { status: 400 },
      );
    }

    const result = await bulkCreateWorks({
      workRepo: workRepository,
      episodeRepo: episodeRepository,
    })(validationResult.ok);
    if (result.err) {
      return data(
        { errorMessage: errorToMessage(result.err) },
        { status: errorToStatus(result.err) },
      );
    }

    return result.ok;
  }

  const validationResult = WorkCreateFormServerValidator(formData);
  if (validationResult.err) {
    return data(
      { errorMessage: validationResult.err.message },
      { status: 400 },
    );
  }

  const { episodeDate, ...workData } = validationResult.ok;
  const result = await createWork({
    workRepo: workRepository,
    episodeRepo: episodeRepository,
  })({
    ...workData,
    episodeDate,
  });
  if (result.err) {
    return data(
      { errorMessage: errorToMessage(result.err) },
      { status: errorToStatus(result.err) },
    );
  }

  return redirect(`/works/${result.ok.id}`);
};

export default function Create() {
  const [bulkCreateMode, setBulkCreateMode] = useState(false);
  const actionData = useActionData<typeof action>();

  return (
    <div className="pb-8">
      <h2>作品登録</h2>
      <section className="mt-4">
        <p>{actionData && JSON.stringify(actionData)}</p>
        <div>
          <button onClick={() => setBulkCreateMode((m) => !m)} type="button">
            {bulkCreateMode ? "戻る" : "複数入力する"}
          </button>
          {bulkCreateMode ? (
            <WorkBulkCreateForm.Component />
          ) : (
            <WorkCreateFormComponent />
          )}
        </div>
      </section>
    </div>
  );
}
