# Cleaner Readme

There is an automatic cleanup tool. By default, it will only clean if there is more videos than `CLEANUP_MIN_THRESHOLD`, and it will be doing this check every `CLEANUP_INTERVAL_MS`. It will only delete the lowest hit videos until it is below the threshold.

### Purge

If you enable purge by setting `CLEANUP_ENABLE_PURGE` it will then cleanup old files that hit both conditions:

1. Video is older than `CLEANUP_PURGE_OLDER_MS`
2. Video has less than `CLEANUP_PURGE_LESS_THAN_HITS` or is disabled (by setting it to 0).

## Environment Variables & Defaults

| Name                         | Default |  Description                                                 |
|------------------------------|---------|--------------------------------------------------------------|
| CLEANUP_INTERVAL_MS          | 5 hours | The cleanup interval check                                   |
| CLEANUP_EXPIRE_MS            | 1 hour  | When will videos be able to be cleaned up (download session) |
| CLEANUP_MIN_THRESHOLD        | 100     | The minimum amount of videos until cleanup starts            |
| CLEANUP_ENABLE_PURGE         | 0       | Should purge be enabled                                      |
| CLEANUP_PURGE_OLDER_MS       | 1 week  | The threshold of how old the video it is to purge            |
| CLEANUP_PURGE_LESS_THAN_HITS | 100     | The maximum amount of hits it has to be below                |