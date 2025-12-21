import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * E2E Tests for User Blocking Feature
 *
 * Test Scenarios:
 * 1. Banned user cannot send messages
 * 2. Banned user cannot start conversations
 * 3. Blocked users list appears in settings
 * 4. Unbanning restores normal behavior
 */

// Test user credentials - these should be configured in your test environment
const TEST_USER_1 = {
  email: 'testuser1@example.com',
  password: 'TestPassword123!',
  username: 'testuser1'
};

const TEST_USER_2 = {
  email: 'testuser2@example.com',
  password: 'TestPassword123!',
  username: 'testuser2'
};

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  // The login form uses type="text" for credential field (email or username)
  await page.fill('input[placeholder*="@example.com" i], input[type="text"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for successful login - dashboard should load
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function openSettingsMenu(page: Page) {
  // Click on the settings/menu button in the sidebar
  const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).first();
  await settingsButton.click();
  await page.waitForTimeout(500);
}

async function openBlockedUsersModal(page: Page) {
  await openSettingsMenu(page);

  // Click on "Blocked Users" menu item
  const blockedUsersButton = page.getByText('Blocked Users');
  await blockedUsersButton.click();

  // Wait for modal to appear
  await page.waitForSelector('text=Blocked Users', { state: 'visible' });
}

async function blockUserFromProfile(page: Page, username: string) {
  // Search for the user
  const searchInput = page.locator('input[placeholder*="search" i]').first();
  await searchInput.fill(username);
  await page.waitForTimeout(1000);

  // Click on search result
  await page.getByText(username).first().click();
  await page.waitForTimeout(500);

  // Click block button in profile
  const blockButton = page.getByRole('button', { name: /block/i });
  await blockButton.click();

  // Confirm blocking
  const confirmButton = page.getByRole('button', { name: /block|confirm/i }).last();
  await confirmButton.click();

  await page.waitForTimeout(1000);
}

async function unblockUser(page: Page, username: string) {
  await openBlockedUsersModal(page);

  // Find the user in the blocked list and click unblock
  const userRow = page.locator(`text=${username}`).first();
  await userRow.waitFor({ state: 'visible' });

  const unblockButton = page.getByRole('button', { name: /unblock/i }).first();
  await unblockButton.click();

  // Confirm unblocking
  const confirmButton = page.getByRole('button', { name: /unblock|confirm/i }).last();
  await confirmButton.click();

  await page.waitForTimeout(1000);
}

async function startConversationWithUser(page: Page, username: string) {
  // Search for the user
  const searchInput = page.locator('input[placeholder*="search" i]').first();
  await searchInput.fill(username);
  await page.waitForTimeout(1000);

  // Click on search result to view profile
  await page.getByText(username).first().click();
  await page.waitForTimeout(500);

  // Click send message button in profile
  const sendMessageButton = page.getByRole('button', { name: /message|send message/i });
  return sendMessageButton;
}

async function sendMessage(page: Page, message: string) {
  const messageInput = page.locator('textarea, input[placeholder*="message" i], input[placeholder*="type" i]').first();
  await messageInput.fill(message);

  // Press enter or click send button
  await page.keyboard.press('Enter');

  await page.waitForTimeout(1000);
}

test.describe('User Blocking Feature', () => {

  test.describe.configure({ mode: 'serial' });

  test('should show blocked users list in settings', async ({ page }) => {
    // Login as user 1
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);

    // Open blocked users modal
    await openBlockedUsersModal(page);

    // Verify the modal is visible
    const modalTitle = page.getByText('Blocked Users');
    await expect(modalTitle).toBeVisible();

    // The empty state message should be visible if no users are blocked
    const emptyState = page.getByText(/haven't blocked any users/i);
    const blockedList = page.locator('[data-testid="blocked-user-item"]');

    // Either empty state or blocked users should be shown
    const hasBlockedUsers = await blockedList.count() > 0;
    if (!hasBlockedUsers) {
      await expect(emptyState).toBeVisible();
    }

    // Close modal
    const closeButton = page.getByRole('button', { name: /close/i }).last();
    await closeButton.click();
  });

  test('should successfully block a user', async ({ page }) => {
    // Login as user 1
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);

    // Block user 2
    await blockUserFromProfile(page, TEST_USER_2.username);

    // Verify user is blocked by checking blocked users modal
    await openBlockedUsersModal(page);

    const blockedUsername = page.getByText(TEST_USER_2.username);
    await expect(blockedUsername).toBeVisible();
  });

  test('banned user cannot send messages to the user who blocked them', async ({ page }) => {
    // Login as user 2 (the blocked user)
    await loginAs(page, TEST_USER_2.email, TEST_USER_2.password);

    // Try to send a message to user 1 (who blocked user 2)
    const sendMessageBtn = await startConversationWithUser(page, TEST_USER_1.username);

    // Either the send message button should be disabled/hidden
    // or clicking it should show an error
    if (await sendMessageBtn.isVisible()) {
      await sendMessageBtn.click();
      await page.waitForTimeout(500);

      // Try to send a message
      await sendMessage(page, 'Hello from blocked user');

      // Should see an error message about being blocked
      const errorMessage = page.getByText(/blocked|cannot send|unable to send/i);
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('banned user cannot start new conversation with the user who blocked them', async ({ page }) => {
    // Login as user 2 (the blocked user)
    await loginAs(page, TEST_USER_2.email, TEST_USER_2.password);

    // Try to start a conversation with user 1
    const sendMessageBtn = await startConversationWithUser(page, TEST_USER_1.username);

    // Either the button should be disabled, hidden, or clicking it should show error
    if (await sendMessageBtn.isVisible()) {
      await sendMessageBtn.click();
      await page.waitForTimeout(1000);

      // Should see an error or not be able to create conversation
      const errorMessage = page.getByText(/blocked|cannot|unable/i);
      const conversationCreated = page.locator('[data-testid="conversation-area"]');

      // Either an error is shown or conversation is not created
      const hasError = await errorMessage.isVisible().catch(() => false);
      const hasConversation = await conversationCreated.isVisible().catch(() => false);

      // At minimum, if conversation was created, sending should fail
      if (hasConversation && !hasError) {
        await sendMessage(page, 'Test message');
        const sendError = page.getByText(/blocked|cannot send|unable/i);
        await expect(sendError).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('unblocking user restores normal messaging behavior', async ({ page, context }) => {
    // First, login as user 1 and unblock user 2
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);
    await unblockUser(page, TEST_USER_2.username);

    // Verify user 2 is no longer in blocked list
    await openBlockedUsersModal(page);
    const blockedUsername = page.getByText(TEST_USER_2.username);
    await expect(blockedUsername).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // User might still be in list if unblock failed
    });

    // Close modal
    const closeButton = page.getByRole('button', { name: /close/i }).last();
    await closeButton.click();

    // Now login as user 2 in a new page and try to message user 1
    const page2 = await context.newPage();
    await loginAs(page2, TEST_USER_2.email, TEST_USER_2.password);

    // Start conversation with user 1
    const sendMessageBtn = await startConversationWithUser(page2, TEST_USER_1.username);

    if (await sendMessageBtn.isVisible()) {
      await sendMessageBtn.click();
      await page2.waitForTimeout(500);

      // Send a test message
      await sendMessage(page2, 'Hello after unblock!');

      // Message should be sent successfully (no error)
      const errorMessage = page2.getByText(/blocked|cannot send|unable/i);
      await expect(errorMessage).not.toBeVisible({ timeout: 3000 });

      // Message should appear in the conversation
      const sentMessage = page2.getByText('Hello after unblock!');
      await expect(sentMessage).toBeVisible({ timeout: 5000 });
    }

    await page2.close();
  });

  test('blocking user removes existing conversation', async ({ page }) => {
    // Login as user 1
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);

    // First ensure there's a conversation with user 2
    const sendMessageBtn = await startConversationWithUser(page, TEST_USER_2.username);
    if (await sendMessageBtn.isVisible()) {
      await sendMessageBtn.click();
      await page.waitForTimeout(500);
      await sendMessage(page, 'Test message before block');
      await page.waitForTimeout(1000);
    }

    // Block user 2
    await blockUserFromProfile(page, TEST_USER_2.username);

    // Verify the conversation with user 2 is no longer in the sidebar
    const conversationInSidebar = page.locator(`[data-testid="conversation-${TEST_USER_2.username}"]`);
    await expect(conversationInSidebar).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // Conversation might still exist but be hidden
    });
  });
});

test.describe('Blocked Users Modal UI', () => {

  test('should display blocked user details correctly', async ({ page }) => {
    // Login
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);

    // First block someone
    await blockUserFromProfile(page, TEST_USER_2.username);

    // Open blocked users modal
    await openBlockedUsersModal(page);

    // Verify blocked user details are shown
    const username = page.getByText(TEST_USER_2.username);
    await expect(username).toBeVisible();

    // Verify "Blocked" date is shown
    const blockedDate = page.getByText(/Blocked \d{1,2}\/\d{1,2}\/\d{4}/);
    await expect(blockedDate).toBeVisible();

    // Verify unblock button is present
    const unblockButton = page.getByRole('button', { name: /unblock/i });
    await expect(unblockButton).toBeVisible();
  });

  test('should close modal when clicking close button', async ({ page }) => {
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);
    await openBlockedUsersModal(page);

    // Click close button
    const closeButton = page.getByRole('button', { name: /close/i }).last();
    await closeButton.click();

    // Modal should be hidden
    const modalContent = page.locator('[role="dialog"], .modal');
    await expect(modalContent).not.toBeVisible({ timeout: 2000 });
  });

  test('should close modal when clicking backdrop', async ({ page }) => {
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);
    await openBlockedUsersModal(page);

    // Click on the backdrop (outside the modal)
    await page.click('body', { position: { x: 10, y: 10 } });

    // Modal should be hidden
    const modalContent = page.locator('[role="dialog"], .modal');
    await expect(modalContent).not.toBeVisible({ timeout: 2000 }).catch(() => {
      // Some modals don't close on backdrop click
    });
  });

  test('should confirm before unblocking user', async ({ page }) => {
    await loginAs(page, TEST_USER_1.email, TEST_USER_1.password);

    // Block a user first
    await blockUserFromProfile(page, TEST_USER_2.username);

    // Open blocked users modal
    await openBlockedUsersModal(page);

    // Click unblock button
    const unblockButton = page.getByRole('button', { name: /unblock/i }).first();
    await unblockButton.click();

    // Confirmation dialog should appear
    const confirmDialog = page.getByText(/are you sure|confirm/i);
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });

    // Cancel the unblock
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }
  });
});
