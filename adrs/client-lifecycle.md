# Client lifecycle

## Recovery goal

Recover the previous functional state where possible, not just connectivity. Prefer restoring existing
resources; recreate them when restoration is impossible. If the client had a party before an unexpected
disconnect, successful recovery should leave it with a party afterward.
If there was no party before disconnection, reconnecting does not create one.

Recreation aims for equivalent functionality, not necessarily the same party ID or membership.
Recreated parties use the default client configuration; previous runtime settings are not preserved.

## Decisions

### Login succeeds

Authenticate, connect enabled services (`connectToXMPP`, `connectToSTOMP`), restore configured client
state, then mark ready and emit `ready`.

### Login fails

Report the failure without marking ready. Initial login is not automatically retried or fully rolled
back; the caller must clean up and decide whether to retry.

### XMPP unexpectedly disconnects

Reconnect and restore the previous status, refresh friend caches if `fetchFriends` is enabled, and
restore the previous party unless `disablePartyService` is enabled. If that party cannot be restored,
recreate it.

### STOMP unexpectedly disconnects

Reconnect and, unless `disablePartyService` is enabled, rebind the previous party. If rebinding is
impossible, recreate it.

### Reconnection or state restoration fails

Consume an attempt and retry according to the backoff policy.

### Retry limit is exhausted

Log out the entire client, disconnecting both transports. Do not terminate the application process.

### An authenticated request rejects the access token

Attempt one token refresh and retry the request once. If unsuccessful, report the failure; transport
recovery does not perform a fresh login or replace invalid credentials.

### Explicit transport disconnect

Stop that transport's recovery and fail pending connection attempts. Do not automatically reconnect.

### Explicit client logout

Mark unready, disconnect both transports, clear client-owned timers, main caches, and the current
party, then attempt token revocation. Emit `disconnected` even if revocation fails; report that failure.

## Recovery policy

XMPP and STOMP independently default to **four recovery attempts**, delayed by **5 seconds, 15 seconds,
60 seconds, and 10 minutes**. Each transport's attempt limit and backoff are configurable; attempts
beyond its configured schedule repeat the last delay. Successful recovery resets the sequence.

Party recovery is deferred until both required transports are connected. Concurrent reconnections
share one party recovery operation.

- Attempt limits: `xmppMaxConnectionRetries` and `stompMaxConnectionRetries`.
- Backoff arrays, in milliseconds: `xmppConnectionRetryBackoff` and `stompConnectionRetryBackoff`.
- Connection timeouts, in milliseconds: `xmppConnectionTimeout` and `stompConnectionTimeout`.
- Initial party behavior: `createParty` and `forceNewParty`. Recovery follows the previous-state goal above.

A previously ready client remains ready during recovery; readiness is not a guarantee that both
transports are connected. Recovery does not emit another `ready` event.

Disconnect prevents new recovery work, but already-started state restoration may finish. Logout is
not a universal state reset; chat signing keys and conversation caches remain retained.
