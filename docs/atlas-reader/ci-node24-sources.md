# CI Node.js 24 action pins

Verified release sources used by the Atlas Reader maintenance workflow:

- `actions/checkout` v5.0.0: `08c6903cd8c0fde910a37f88322edcfb5dd907a8`
  - Node.js 24 runtime
  - minimum Actions runner v2.327.1
- `actions/upload-artifact` v6.0.0: `b7c566a772e6b6bfb58ed0dc250532a479d7789f`
  - Node.js 24 runtime
  - minimum Actions runner v2.327.1

The Atlas workflow uses GitHub-hosted `ubuntu-latest` runners, `permissions: contents: read`, and `persist-credentials: false` for checkout.
