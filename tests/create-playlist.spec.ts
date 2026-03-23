import { expect, test } from "@playwright/test";

// Simulate a logged-in state by injecting fake tokens into localStorage.
// We set expiry far in the future so getValidToken() skips the refresh flow.
const FAKE_TOKEN = "fake-access-token";

async function injectAuth(page: import("@playwright/test").Page) {
  const expiry = Date.now() + 3600 * 1000; // 1 hour from now
  await page.addInitScript(
    ({ token, expiry }) => {
      localStorage.setItem("access_token", token);
      localStorage.setItem("refresh_token", "fake-refresh-token");
      localStorage.setItem("token_expiry", String(expiry));
    },
    { token: FAKE_TOKEN, expiry }
  );
}

test.describe("Create Playlist", () => {
  test("shows the create form on /create", async ({ page }) => {
    await injectAuth(page);
    await page.goto("/create");

    await expect(page.getByPlaceholder("Playlist name")).toBeVisible();
    await expect(page.getByPlaceholder("Description (optional)")).toBeVisible();
    await expect(
      page.getByPlaceholder(
        "Prompt (optional) — describe what kind of songs to include"
      )
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /create/i })).toBeVisible();
  });

  test("shows validation error when submitting without a name", async ({
    page,
  }) => {
    await injectAuth(page);
    await page.goto("/create");

    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText("Name is required")).toBeVisible();
  });

  test("creates a plain playlist (no prompt) and redirects home", async ({
    page,
  }) => {
    await injectAuth(page);

    // Mock Spotify create-playlist endpoint
    await page.route("https://api.spotify.com/v1/me/playlists", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-playlist-id",
          external_urls: { spotify: "https://open.spotify.com/playlist/mock" },
        }),
      });
    });

    await page.goto("/create");
    await page.getByPlaceholder("Playlist name").fill("My Test Playlist");
    await page.getByPlaceholder("Description (optional)").fill("A test description");
    await page.getByRole("button", { name: /create/i }).click();

    await expect(page).toHaveURL("/", { timeout: 10000 });
  });

  test("creates a playlist with prompt — full flow", async ({ page }) => {
    await injectAuth(page);

    // Mock Gemini parse-prompt API
    await page.route("**/api/parse-prompt", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mood: "chill",
          genres: ["r-n-b", "soul"],
          energy: 0.4,
          tempo: "medium",
          era: ["2000s", "2010s", "2020s"],
          source: "mix",
        }),
      });
    });

    // Mock Spotify search
    await page.route(
      "https://api.spotify.com/v1/search*",
      (route) => {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tracks: {
              items: [
                { uri: "spotify:track:1", name: "Track 1", artists: [{ name: "Artist 1" }] },
                { uri: "spotify:track:2", name: "Track 2", artists: [{ name: "Artist 2" }] },
              ],
            },
          }),
        });
      }
    );

    // Mock Spotify create-playlist
    await page.route("https://api.spotify.com/v1/me/playlists", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-playlist-id",
          external_urls: { spotify: "https://open.spotify.com/playlist/mock" },
        }),
      });
    });

    // Mock Spotify add-tracks
    await page.route(
      "https://api.spotify.com/v1/playlists/mock-playlist-id/items",
      (route) => {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ snapshot_id: "mock-snapshot" }),
        });
      }
    );

    await page.goto("/create");
    await page.getByPlaceholder("Playlist name").fill("Chill Night Drive");
    await page
      .getByPlaceholder(
        "Prompt (optional) — describe what kind of songs to include"
      )
      .fill("chill night drive, some r&b, not too slow, mix of old and new");

    await page.getByRole("button", { name: /create/i }).click();

    await expect(page).toHaveURL("/", { timeout: 10000 });
  });

  test("shows error toast when Gemini parse-prompt fails", async ({ page }) => {
    await injectAuth(page);

    await page.route("**/api/parse-prompt", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Groq API rate limit reached. Please wait a moment and try again." }),
      });
    });

    await page.goto("/create");
    await page.getByPlaceholder("Playlist name").fill("Test");
    await page
      .getByPlaceholder(
        "Prompt (optional) — describe what kind of songs to include"
      )
      .fill("chill vibes");

    await page.getByRole("button", { name: /create/i }).click();

    await expect(
      page.getByText("Groq API rate limit reached. Please wait a moment and try again.")
    ).toBeVisible({ timeout: 8000 });
  });

  test("shows error toast when Spotify playlist creation fails", async ({
    page,
  }) => {
    await injectAuth(page);

    await page.route("https://api.spotify.com/v1/me/playlists", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    await page.goto("/create");
    await page.getByPlaceholder("Playlist name").fill("Test");
    await page.getByRole("button", { name: /create/i }).click();

    await expect(page.getByText("Unauthorized")).toBeVisible({ timeout: 8000 });
  });

  test("include saved music toggle is visible and toggleable", async ({
    page,
  }) => {
    await injectAuth(page);
    await page.goto("/create");

    const toggle = page.getByRole("switch");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  test("with 'include saved music' enabled, fetches liked songs + recommendations", async ({
    page,
  }) => {
    await injectAuth(page);

    let searchCalled = false;
    let savedTracksCalled = false;

    await page.route("**/api/parse-prompt", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mood: "chill",
          genres: ["r-n-b"],
          energy: 0.4,
          tempo: "medium",
          era: ["2020s"],
          source: "mix",
        }),
      });
    });

    await page.route(
      "https://api.spotify.com/v1/search*",
      (route) => {
        searchCalled = true;
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ tracks: { items: [{ uri: "spotify:track:new1", name: "New", artists: [] }] } }),
        });
      }
    );

    await page.route("https://api.spotify.com/v1/me/tracks*", (route) => {
      savedTracksCalled = true;
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ track: { uri: "spotify:track:saved1", name: "Saved", artists: [] } }],
          next: null,
          total: 1,
        }),
      });
    });

    await page.route("https://api.spotify.com/v1/me/playlists", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "pid", external_urls: { spotify: "" } }),
      });
    });

    await page.route(
      "https://api.spotify.com/v1/playlists/pid/items",
      (route) => {
        route.fulfill({ status: 201, body: JSON.stringify({ snapshot_id: "s" }) });
      }
    );

    await page.goto("/create");
    await page.getByPlaceholder("Playlist name").fill("Mixed Playlist");
    await page
      .getByPlaceholder(
        "Prompt (optional) — describe what kind of songs to include"
      )
      .fill("chill vibes");

    await page.getByRole("switch").click(); // enable saved music
    await page.getByRole("button", { name: /create/i }).click();

    await expect(page).toHaveURL("/", { timeout: 10000 });
    expect(searchCalled).toBe(true);
    expect(savedTracksCalled).toBe(true);
  });
});
