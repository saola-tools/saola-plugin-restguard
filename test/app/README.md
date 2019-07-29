# app-restguard test/app

> Devebot access-token authentication layerware

## Usage

### Run the server for testing

```shell
export LOGOLITE_DEBUGLOG_ENABLED=true
export DEBUG=devebot*,app*
npm run build && node test/app
```

### Examine the error codes

#### `access-token is expired`

```shell
curl -v --request GET \
--url http://localhost:7878/example/jwt/session-info \
--header 'x-access-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBUeXBlIjoiYWdlbnRBcHAiLCJwaG9uZU51bWJlciI6Iis4NDk3MzQwNzEzOSIsImV4cGlyZWRJbiI6NjAwLCJleHBpcmVkVGltZSI6IjIwMTktMDctMjlUMTY6MjQ6MTkuMTYyWiIsInVzZXJJZCI6IjVkMjUyZTQ4NTM2YjU0MmMyY2ViM2FiZiIsImhvbGRlcklkIjoiNWQzMzYzODJkM2NmZDE2ZmM2YmVhYTA3IiwiaWF0IjoxNTY0NDE2ODMxLCJleHAiOjE1NjQ0MTc0MzF9.b-ywZsOguwDABtXjoq02JlTLRt5HzEPHCjAZsdynPnw' \
```

The output (X-Return-Code: 1001):

```
Note: Unnecessary use of -X or --request, GET is already inferred.
*   Trying 127.0.0.1...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 7878 (#0)
> GET /example/jwt/session-info HTTP/1.1
> Host: localhost:7878
> User-Agent: curl/7.58.0
> Accept: */*
> Cookie: sessionId=s%253AS9UX3mI8tpsf2B4k5QadpIV1DtAOAMSy.%252BKYFAu9mmzglDwllLLBCDrCDVToodArsrbk0pJmktV4
> x-access-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBUeXBlIjoiYWdlbnRBcHAiLCJwaG9uZU51bWJlciI6Iis4NDk3MzQwNzEzOSIsImV4cGlyZWRJbiI6NjAwLCJleHBpcmVkVGltZSI6IjIwMTktMDctMjlUMTY6MjQ6MTkuMTYyWiIsInVzZXJJZCI6IjVkMjUyZTQ4NTM2YjU0MmMyY2ViM2FiZiIsImhvbGRlcklkIjoiNWQzMzYzODJkM2NmZDE2ZmM2YmVhYTA3IiwiaWF0IjoxNTY0NDE2ODMxLCJleHAiOjE1NjQ0MTc0MzF9.b-ywZsOguwDABtXjoq02JlTLRt5HzEPHCjAZsdynPnw
> 
< HTTP/1.1 401 Unauthorized
< X-Powered-By: Express
< X-Request-Id: xgMWdpX3Sz2ypbYoAz04vQ
< X-Return-Code: 1001
< Content-Type: application/json; charset=utf-8
< Content-Length: 64
< ETag: W/"40-MnuSDEE6qp6xEvFvTVByqVU3RQY"
< Date: Mon, 29 Jul 2019 17:34:49 GMT
< Connection: keep-alive
< 
* Connection #0 to host localhost left intact
{"name":"TokenExpiredError","message":"access-token is expired"}
```

#### `access-token is invalid`

```shell
curl -v --request GET \
--url http://localhost:7878/example/jwt/session-info \
--header 'x-access-token: 5d3f22c73b413d0010bbb6db'
```

The output (X-Return-Code: 1002):

```
> GET /example/jwt/session-info HTTP/1.1
> Host: localhost:7878
> User-Agent: curl/7.58.0
> Accept: */*
> x-access-token: 5d3f22c73b413d0010bbb6db
> 
< HTTP/1.1 401 Unauthorized
< X-Powered-By: Express
< X-Request-Id: SKj6qoy-R1O_fekJ9e7ONg
< X-Return-Code: 1002
< Content-Type: application/json; charset=utf-8
< Content-Length: 64
< ETag: W/"40-H2ivibVU9gYLAgCq2dfE/JLaUM8"
< Date: Mon, 29 Jul 2019 17:31:18 GMT
< Connection: keep-alive
< 
* Connection #0 to host localhost left intact
{"name":"JsonWebTokenError","message":"access-token is invalid"}
```

#### `access-token not found`

```shell
curl -v --request GET \
--url http://localhost:7878/example/jwt/session-info
```

The output (X-Return-Code: 1003):

```
Note: Unnecessary use of -X or --request, GET is already inferred.
*   Trying 127.0.0.1...
* TCP_NODELAY set
* Connected to localhost (127.0.0.1) port 7878 (#0)
> GET /example/jwt/session-info HTTP/1.1
> Host: localhost:7878
> User-Agent: curl/7.58.0
> Accept: */*
> 
< HTTP/1.1 401 Unauthorized
< X-Powered-By: Express
< X-Request-Id: G5S41yjQTFKw2x2rRT51Ww
< X-Return-Code: 1003
< Content-Type: application/json; charset=utf-8
< Content-Length: 64
< ETag: W/"40-0jJvVk1bZjUmg2+lrhUXkclHC7E"
< Date: Mon, 29 Jul 2019 17:37:02 GMT
< Connection: keep-alive
< 
* Connection #0 to host localhost left intact
{"name":"TokenNotFoundError","message":"access-token not found"}
```
