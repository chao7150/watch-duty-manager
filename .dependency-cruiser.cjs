/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-shared-to-usecase-dependency",
      comment:
        "Files in usecases/_shared must not depend on files in other usecases directories.",
      severity: "error",
      from: {
        path: "^app/usecases/_shared/",
      },
      to: {
        path: "^app/usecases/",
        pathNot: "^app/usecases/_shared/",
      },
    },
  ],
  options: {
    tsConfig: {
      fileName: "tsconfig.json",
    },
  },
};
