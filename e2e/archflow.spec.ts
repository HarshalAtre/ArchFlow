import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "user-owner",
  name: "Harshal Atre",
  email: "harshalatre2@gmail.com",
};

test("guest can start blank HLD and LLD diagrams", async ({ page }) => {
  await mockGuestSession(page);
  await page.goto("/");

  await openToolSection(page, "HLD tools", "Board Actions");
  await page.getByRole("button", { name: "New Blank" }).click();
  await expect(page.getByLabel("Board name")).toHaveValue(
    "Untitled Architecture",
  );
  await expect(page.locator(".architecture-node")).toHaveCount(0);
  await expect(
    page.getByText("Start with your first component", { exact: true }),
  ).toBeVisible();

  await page
    .getByLabel("HLD tools")
    .getByRole("button", { name: "Service Compute", exact: true })
    .click();
  await expect(page.locator(".architecture-node")).toHaveCount(1);

  await page.getByRole("button", { name: "LLD Board" }).click();
  await openToolSection(page, "LLD tools", "Board Actions");
  await page.getByRole("button", { name: "New Blank" }).click();
  await expect(page.getByLabel("LLD board name")).toHaveValue("Untitled LLD");
  await expect(page.locator(".uml-class-node")).toHaveCount(0);
  await expect(
    page.getByText("Start your UML model", { exact: true }),
  ).toBeVisible();

  await page
    .getByLabel("LLD tools")
    .getByRole("button", { name: "Class Concrete type", exact: true })
    .click();
  await expect(page.locator(".uml-class-node")).toHaveCount(1);

  const attributes = page
    .getByLabel("LLD inspector")
    .locator("details")
    .filter({ hasText: "Attributes" });
  await expect(attributes).not.toHaveAttribute("open", "");
  await attributes.locator("summary").click();
  await expect(page.getByRole("button", { name: "Add Attribute" })).toBeVisible();
});

test("mobile workbench keeps HLD and LLD tools accessible in drawers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGuestSession(page);
  await page.goto("/");

  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await expect(page.getByLabel("HLD tools")).toHaveClass(/workspace-panel-open/);
  await expect(page.getByRole("button", { name: "Save Board" })).toBeVisible();
  await page.getByRole("button", { name: "Close Tools" }).click();
  await expect(page.getByLabel("HLD tools")).not.toHaveClass(/workspace-panel-open/);

  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByLabel("HLD inspector")).toHaveClass(
    /workspace-panel-open/,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("HLD inspector")).not.toHaveClass(
    /workspace-panel-open/,
  );

  await page.getByRole("button", { name: "LLD Board" }).click();
  await page.getByRole("button", { name: "Tools", exact: true }).click();
  await expect(page.getByLabel("LLD tools")).toHaveClass(/workspace-panel-open/);
  await expect(page.getByRole("button", { name: "Save Board" })).toBeVisible();
  await page.getByRole("button", { name: "Close Tools" }).click();

  await page.getByRole("button", { name: "Inspector", exact: true }).click();
  await expect(page.getByLabel("LLD inspector")).toHaveClass(
    /workspace-panel-open/,
  );
  await page.getByRole("button", { name: "Close Inspector" }).click();
  await expect(page.getByLabel("LLD inspector")).not.toHaveClass(
    /workspace-panel-open/,
  );
});

test("dark mode is default and theme choice persists", async ({ page }) => {
  await mockGuestSession(page);
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("button", { name: "Switch to dark mode" }),
  ).toBeVisible();
});

test("desktop rails scroll without moving the workspace", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await mockGuestSession(page);
  await page.goto("/");

  const tools = page.getByLabel("HLD tools");
  const canvas = page.locator(".board-canvas");
  const canvasTop = (await canvas.boundingBox())?.y;

  await tools.hover();
  await page.mouse.wheel(0, 700);
  await expect.poll(() => tools.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect.poll(async () => (await canvas.boundingBox())?.y).toBe(canvasTop);
});

test("recent boards stay compact and expand on demand", async ({ page }) => {
  const updatedAt = new Date().toISOString();
  const boards = Array.from({ length: 5 }, (_, index) => ({
    id: `recent-${index + 1}`,
    name: `Architecture ${index + 1}`,
    ownerId: user.id,
    accessRole: "owner",
    updatedAt,
  }));

  await mockAuthenticatedSession(page);
  await page.route("**/api/boards", (route) =>
    route.fulfill({ json: { boards } }),
  );
  await page.goto("/");

  const recentBoards = page.getByLabel("HLD tools").locator(".recent-board-button");
  await expect(recentBoards).toHaveCount(3);

  await page.getByRole("button", { name: "Load more (2)" }).click();
  await expect(recentBoards).toHaveCount(5);

  await page.getByRole("button", { name: "Show fewer" }).click();
  await expect(recentBoards).toHaveCount(3);
});

test("version history loads five records per page", async ({ page }) => {
  const graph = { elements: [], edges: [] };
  const versions = Array.from({ length: 12 }, (_, index) => ({
    id: `version-${index + 1}`,
    boardId: "history-board",
    mode: "hld",
    actorId: `actor-${index + 1}`,
    actorName: `Person ${index + 1}`,
    action: "saved",
    createdAt: new Date(Date.now() - index * 60_000).toISOString(),
  }));

  await mockAuthenticatedSession(page);
  await page.route("**/api/boards", (route) =>
    route.fulfill({
      json: {
        boards: [
          {
            id: "history-board",
            name: "Versioned Architecture",
            ownerId: user.id,
            accessRole: "owner",
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.route("**/api/boards/history-board", (route) =>
    route.fulfill({
      json: boardResponse("history-board", "Versioned Architecture", graph),
    }),
  );
  await page.route("**/api/versions/hld/history-board**", (route) => {
    const requestUrl = new URL(route.request().url());
    const requestedPage = Number(requestUrl.searchParams.get("page") ?? "1");
    const pageSize = Number(requestUrl.searchParams.get("pageSize") ?? "5");
    const start = (requestedPage - 1) * pageSize;

    return route.fulfill({
      json: {
        versions: versions.slice(start, start + pageSize),
        pagination: {
          page: requestedPage,
          pageSize,
          total: versions.length,
          totalPages: Math.ceil(versions.length / pageSize),
        },
      },
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Versioned Architecture/ }).click();
  await openToolSection(page, "HLD tools", "Collaboration");
  await page.getByRole("button", { name: "Version History" }).click();

  const rows = page.locator(".version-row");
  await expect(rows).toHaveCount(5);
  await expect(page.getByText("1 / 3 (12)", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Next version page" }).click();
  await expect(page.getByText("Person 6", { exact: false })).toBeVisible();
  await expect(rows).toHaveCount(5);
  await expect(page.getByText("2 / 3 (12)", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Next version page" }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByText("3 / 3 (12)", { exact: true })).toBeVisible();
});

test("failed board loads show an actionable retry state", async ({ page }) => {
  let attempts = 0;
  const graph = {
    elements: [
      {
        id: "service-recovered",
        type: "service",
        position: { x: 100, y: 100 },
        size: { width: 180, height: 64 },
        label: "Recovered Service",
      },
    ],
    edges: [],
  };

  await mockAuthenticatedSession(page);
  await page.route("**/api/boards", (route) =>
    route.fulfill({
      json: {
        boards: [
          {
            id: "board-retry",
            name: "Resilient Architecture",
            ownerId: user.id,
            accessRole: "owner",
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
  await page.route("**/api/boards/board-retry", async (route) => {
    attempts += 1;

    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        json: { message: "Board service is temporarily unavailable." },
      });
      return;
    }

    await route.fulfill({
      json: boardResponse("board-retry", "Resilient Architecture", graph),
    });
  });

  await page.goto("/");
  await page
    .getByRole("button", { name: /Resilient Architecture/ })
    .click();

  await expect(
    page.getByText("Board could not be loaded", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".canvas-state-error")
      .getByText("Board service is temporarily unavailable.", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("Recovered Service", { exact: true })).toBeVisible();
  await expect(page.locator(".canvas-state-overlay")).toHaveCount(0);
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

  await openToolSection(page, "HLD tools", "Board Actions");
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
  await openToolSection(page, "LLD tools", "Collaboration");
  await page.getByRole("button", { name: /Shared Billing LLD/ }).click();

  await openToolSection(page, "LLD tools", "Board Actions");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Leave Shared Board" }).click();
  await expect(page.getByLabel("LLD board name")).toHaveValue("Untitled LLD");
  await expect(
    page.getByText("Shared LLD board removed from your account", {
      exact: true,
    }),
  ).toBeVisible();
});

async function openToolSection(
  page: Page,
  panelLabel: "HLD tools" | "LLD tools",
  title: string,
) {
  const section = page
    .getByLabel(panelLabel)
    .locator("details")
    .filter({ has: page.locator("summary", { hasText: title }) });

  if (!(await section.evaluate((element) => element.hasAttribute("open")))) {
    await section.locator("summary").click();
  }
}

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
