import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "user-owner",
  name: "Harshal Atre",
  email: "harshalatre2@gmail.com",
};

test("guest can start blank HLD and LLD diagrams", async ({ page }) => {
  await mockGuestSession(page);
  await page.goto("/");

  await page.getByRole("button", { name: "New Blank" }).click();
  await expect(page.getByLabel("Board name")).toHaveValue(
    "Untitled Architecture",
  );
  await expect(page.locator(".architecture-node")).toHaveCount(0);

  await page.getByRole("button", { name: "Service", exact: true }).click();
  await expect(page.locator(".architecture-node")).toHaveCount(1);

  await page.getByRole("button", { name: "LLD Board" }).click();
  await page.getByRole("button", { name: "New Blank" }).click();
  await expect(page.getByLabel("LLD board name")).toHaveValue("Untitled LLD");
  await expect(page.locator(".uml-class-node")).toHaveCount(0);

  await page.getByRole("button", { name: "Class", exact: true }).click();
  await expect(page.locator(".uml-class-node")).toHaveCount(1);
});

test("owner can rename, duplicate, and delete an HLD board", async ({
  page,
}) => {
  let boardName = "Checkout Architecture";
  let activeBoardId = "board-1";
  const graphs = {
    "board-1": {
      elements: [
        {
          id: "service-1",
          type: "service",
          position: { x: 100, y: 100 },
          size: { width: 180, height: 64 },
          label: "Checkout Service",
        },
      ],
      edges: [],
    },
    "board-copy": {
      elements: [
        {
          id: "service-1",
          type: "service",
          position: { x: 100, y: 100 },
          size: { width: 180, height: 64 },
          label: "Checkout Service",
        },
      ],
      edges: [],
    },
  };

  await mockAuthenticatedSession(page);
  await page.route("**/api/boards", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          boards:
            activeBoardId === "deleted"
              ? []
              : [
                  {
                    id: activeBoardId,
                    name: boardName,
                    ownerId: user.id,
                    accessRole: "owner",
                    updatedAt: new Date().toISOString(),
                  },
                ],
        },
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/boards/board-1", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: boardResponse("board-1", boardName, graphs["board-1"]),
      });
      return;
    }

    if (route.request().method() === "PATCH") {
      const body = route.request().postDataJSON() as { name: string };
      boardName = body.name;
      await route.fulfill({
        json: boardResponse("board-1", boardName, graphs["board-1"]),
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/boards/board-1/duplicate", async (route) => {
    const body = route.request().postDataJSON() as { name: string };
    activeBoardId = "board-copy";
    boardName = body.name;
    await route.fulfill({
      status: 201,
      json: boardResponse("board-copy", boardName, graphs["board-copy"]),
    });
  });
  await page.route("**/api/boards/board-copy", async (route) => {
    if (route.request().method() === "DELETE") {
      activeBoardId = "deleted";
      await route.fulfill({ json: { action: "deleted" } });
      return;
    }
    await route.fallback();
  });

  await page.goto("/");
  await page
    .getByRole("button", { name: /Checkout Architecture/ })
    .click();

  await page.getByLabel("Board name").fill("Checkout Platform");
  await page.getByRole("button", { name: "Rename & Save" }).click();
  await expect(page.getByText(/Board renamed/)).toBeVisible();

  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page.getByLabel("Board name")).toHaveValue(
    "Checkout Platform Copy",
  );
  await expect(
    page.getByText(/Duplicated as your board/),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Board" }).click();
  await expect(page.getByLabel("Board name")).toHaveValue(
    "Untitled Architecture",
  );
  await expect(page.getByText("Board deleted", { exact: true })).toBeVisible();
});

test("collaborator can leave a shared LLD board", async ({ page }) => {
  const sharedBoard = {
    id: "lld-shared",
    name: "Shared Billing LLD",
    ownerId: "another-user",
    collaboratorIds: [user.id],
    viewerIds: [],
    accessRole: "editor",
    classes: [],
    relationships: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await mockAuthenticatedSession(page);
  await page.route("**/api/boards", (route) =>
    route.fulfill({ json: { boards: [] } }),
  );
  await page.route("**/api/lld-boards", (route) =>
    route.fulfill({
      json: {
        boards: [
          {
            id: sharedBoard.id,
            name: sharedBoard.name,
            ownerId: sharedBoard.ownerId,
            accessRole: "editor",
            updatedAt: sharedBoard.updatedAt,
          },
        ],
      },
    }),
  );
  await page.route("**/api/lld-boards/lld-shared", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: sharedBoard });
      return;
    }
    await route.fulfill({ json: { action: "left" } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "LLD Board" }).click();
  await page.getByRole("button", { name: /Shared Billing LLD/ }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Leave Shared Board" }).click();
  await expect(page.getByLabel("LLD board name")).toHaveValue("Untitled LLD");
  await expect(
    page.getByText("Shared LLD board removed from your account", {
      exact: true,
    }),
  ).toBeVisible();
});

async function mockGuestSession(page: Page) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { user: null } }),
  );
}

async function mockAuthenticatedSession(page: Page) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { user } }),
  );
}

function boardResponse(
  id: string,
  name: string,
  graph: {
    elements: Array<Record<string, unknown>>;
    edges: Array<Record<string, unknown>>;
  },
) {
  const now = new Date().toISOString();
  return {
    id,
    name,
    ownerId: user.id,
    collaboratorIds: [],
    viewerIds: [],
    accessRole: "owner",
    ...graph,
    createdAt: now,
    updatedAt: now,
  };
}
