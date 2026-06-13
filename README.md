# Visa Application Compiler

This project is a static HTML app with real Firebase authentication for:

- Email/password signup and sign in
- Google sign in
- GitHub sign in

## Local development

Firebase authentication requires a real HTTP origin (`http://localhost` or HTTPS), so `file://` will not work. 

This app now includes a small Node backend for Stripe Checkout, so the recommended local flow is:

```powershell
npm install
npm start
```

Then open:

```text
http://localhost:8000
```

If you want to use the PowerShell helper instead, it will prefer `node server.js` when available:

```powershell
.
start-local-server.ps1
```

### Stripe setup

Create a `.env` file in the project root with your Stripe keys:

```text
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

The backend reads the publishable key from `/config` and creates a Checkout session with `/create-checkout-session`.

### Backup static server option

If you only need the frontend without Stripe checkout, you can still run a static server.

```powershell
npm install -g http-server
http-server -p 8000
```

## Firebase setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Authentication > Sign-in method:
   - Email/Password
   - Google
   - GitHub
3. Add `http://localhost` as an authorized domain in Firebase Auth.
4. Replace the placeholder values in `index.html` inside the `firebaseConfig` block:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Notes

- After Firebase auth is configured and the app is served from `http://localhost`, social sign-in will work.
- If you use GitHub auth, make sure GitHub OAuth is configured in Firebase with the correct callback URL.
- The app is static and only uses Firebase for authentication.
