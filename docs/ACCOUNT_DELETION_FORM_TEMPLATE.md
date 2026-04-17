# NoteFit AI account deletion (Google Form -> GAS -> Cloud Functions)

For Google Play "account deletion URL" and users who uninstalled the app.

**Flow**

1. User submits the Google Form (email required).
2. Responses are stored in a linked spreadsheet.
3. A spreadsheet-bound Apps Script runs on **form submit**.
4. The script POSTs JSON to Firebase `functions-ai` HTTP function `deleteUserByEmail`.
5. The function recursively deletes `users/{uid}` and removes the Auth user.

Code: `functions-ai/src/accountDeletion.ts` (`deleteUserByEmail`).

---

## Important

- **Deletion runs right after form submit** (not "within days"). Align your form text, or change the automation.
- The **question title** for the email field must match GAS constant `TITLE_EMAIL` exactly (default below).

---

## 1. Firebase

### Secret (same value as GAS)

From repo root:

```bash
firebase functions:secrets:set GAS_WEBHOOK_SECRET
```

Use a long random string. Put the **same** value in Apps Script property `GAS_WEBHOOK_TOKEN`.

### Deploy

```bash
firebase deploy --only functions:ai
```

### Webhook URL

Firebase Console -> Build -> Functions -> codebase **ai** -> `deleteUserByEmail` -> copy URL (`asia-northeast1`).  
Set this as `DELETE_WEBHOOK_URL` in Apps Script (no extra path).

---

## 2. Google Form

### Title (Japanese)

`NoteFit AI アカウント削除リクエスト`

### Description (example, Japanese)

本フォームは、健康管理アプリ「NoteFit AI」のアカウントおよび関連データの削除をリクエストするためのものです。  
ご登録のメールアドレスを入力して送信すると、システムにより Firebase 上のデータが削除されます。  
不備がある場合は notefit-ai@gmail.com からご連絡する場合があります。

### Required question

| Question title | Type | Required |
| --- | --- | --- |
| `登録しているメールアドレス` | Short answer | ON |

Do not rename without updating `TITLE_EMAIL` in the script.

### Optional (for support only; not sent to the webhook)

- `アプリ内ユーザー名（任意）`
- `補足メモ（任意）`

### Link a spreadsheet

Form -> **Responses** -> link/create spreadsheet. Bind Apps Script to **that** spreadsheet.

---

## 3. Google Apps Script

1. Open the response spreadsheet.
2. **Extensions** -> **Apps Script**.
3. Paste the script below (remove default `myFunction`).
4. Once: fill `setupWebhookConfig` with URL + token, run it, authorize.
5. Remove secrets from source; rely on Script Properties.
6. **Triggers** -> Add: function `onFormSubmit`, source **From spreadsheet**, type **On form submit**.

```javascript
var TITLE_EMAIL = '登録しているメールアドレス';

function setupWebhookConfig() {
  PropertiesService.getScriptProperties().setProperties({
    DELETE_WEBHOOK_URL: 'https://YOUR-deleteUserByEmail-URL',
    GAS_WEBHOOK_TOKEN: 'SAME_AS_GAS_WEBHOOK_SECRET',
  });
}

function onFormSubmit(e) {
  var named = e.namedValues;
  if (!named || !named[TITLE_EMAIL]) {
    Logger.log('No email column keys=' + JSON.stringify(named ? Object.keys(named) : []));
    return;
  }
  var email = String(named[TITLE_EMAIL][0] || '').trim();
  if (!email) return;

  var props = PropertiesService.getScriptProperties();
  var url = props.getProperty('DELETE_WEBHOOK_URL');
  var token = props.getProperty('GAS_WEBHOOK_TOKEN');
  if (!url || !token) {
    throw new Error('Set DELETE_WEBHOOK_URL and GAS_WEBHOOK_TOKEN in Script Properties');
  }

  var payload = JSON.stringify({ email: email, token: token });
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    muteHttpExceptions: true,
  });
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) {
    Logger.log('deleteUserByEmail failed HTTP ' + code + ' ' + resp.getContentText());
  }
}
```

---

## 4. Publish

1. Form **Send** -> **Link** -> copy `https://forms.gle/...`
2. Paste into Play Console account-deletion URL field.
3. Replace placeholder in `docs/PRIVACY_POLICY.md` with the same link.

### Notes

- Form must be public (do not require Google sign-in to **respond**).
- Token mismatch -> HTTP 403 from Cloud Function.

---

## curl test

```bash
curl -sS -X POST "YOUR_deleteUserByEmail_URL" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"token\":\"GAS_WEBHOOK_SECRET_VALUE\"}"
```
