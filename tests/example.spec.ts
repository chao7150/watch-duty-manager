import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("http://localhost:3000/");
  await expect(page).toHaveTitle("Watch duty manager");
  // 番組作成
  await page.getByRole("link", { name: "Create" }).click();
  await page.getByLabel("タイトル*").fill("example");
  await page.getByLabel("公式サイトURL").fill("https://example.com");
  await page.getByLabel("ツイッターID").fill("example");
  await page.getByLabel("ハッシュタグ（#は不要）").fill("example");
  await page.getByLabel("第1話放送日時*").fill("2023-01-01T12:00");
  await page.getByLabel("話数（予想でも可）").fill("12");
  await page.getByRole("button", { name: "送信" }).press("Enter");
  // 作成された番組の確認
  await page.getByRole("link", { name: "Works" }).click();
  await expect(page.getByText("example")).toHaveAttribute("href", "/works/1");
  // 非ログイン状態でsubscribeしようとするとログイン画面に飛ばされる
  await page.getByRole("button", { name: "見てない" }).click();
  await expect(page.getByText("Sign in with email")).toBeVisible();
  // ログイン
  await page.getByLabel("Email").fill("test@chao.tokyo");
  await page.getByLabel("Email").press("Enter");
  await page.getByLabel("Password").fill("password");
  await page.getByLabel("Password").press("Enter");
  await expect(page.getByText("Logout")).toBeVisible();
  // subscribeできる
  await page.getByRole("link", { name: "Works" }).click();
  await page.getByRole("button", { name: "見てない" }).click();
  await expect(page.getByText("見てる")).toBeVisible();
  await page.goto("http://localhost:3000/works/1");
  // なんかタイムアウトする
  // await expect(page.getByRole("button", { name: "見てる" })).toBeVisible();
  // watchできる
  await page.getByRole("row").nth(1).locator("summary").click();
  await page.getByRole("row").nth(1).getByRole("slider").fill("9");
  await page.getByRole("row").nth(1).getByLabel("comment").fill("good");
  await page
    .getByRole("row")
    .nth(1)
    .getByRole("button", { name: "watch with comment" })
    .click();
  // await page.getByRole("link", { name: "My" }).click();
  // await page
  //   .getByRole("listitem")
  //   .filter({ hasText: "2/29.0example" })
  //   .getByRole("link", { name: "example" })
  //   .click();
  // await page.getByRole("link", { name: "Home" }).click();
  // await page.getByRole("button", { name: "Logout" }).click();
});
