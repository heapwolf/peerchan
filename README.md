# SYNOPSIS
A terminal based client for the peerlinks protocol.

![screenshot](screenshot.png)

- Fully peer to peer
- Multiline input editing
- Command autocomplete
- Customizable color scheme
- Buffer scrollback
- Create channels
- Request and accept invites

# CONFIG
Optional example config stored in `~/.peerchan.json`.

```
{
  "bg": 255,
  "fg": 234,
  "comment": {
    "fg": 246,
    "bg": 255
  },
  "prompt": {
    "bg": 4,
    "fg": 15
  },
  "timestamp": {
    "fg": 244,
    "bg": 255
  },
  "status": {
    "fg": 4,
    "bg": 15
  },
  "id": "heapwolf"
}
```

# DEBUGGING
This has been tested on node `12.16.3 LTS`, but latest, `14.1.0` seems
to have some issues.

In terminal window A...

```sh
DEBUG_COLORS=false DEBUG='peerlinks:*' INST=0 node ./bin/peerchan.js
```

In terminal widow B...
```sh
DEBUG_COLORS=false DEBUG='peerlinks:*' INST=1 node ./bin/peerchan.js
```

In terminal window C...

```sh
tail -f ./peerchan.log
```
