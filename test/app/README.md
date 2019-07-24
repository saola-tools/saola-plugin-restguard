# app-restguard test/app

> Devebot token-based authentication layerware

## Usage

### Run the server for testing

```shell
export LOGOLITE_DEBUGLOG_ENABLED=true
export DEBUG=devebot*,app*
npm run build && DEVEBOT_SANDBOX=backward node test/app
```

## Notes

### Tokenify and Webrouter

Verification middlewares of `app-restguard` (i.e. app-restguard-httpauth, app-restguard-jwt, app-restguard-kst, app-restguard-mix) must have priority higher than `body-parser` (means that they will be run before the body-parser middlewares - `json` and `urlencoded`). The `app-restguard-auth` middleware should be run after the `body-parser-json`.
