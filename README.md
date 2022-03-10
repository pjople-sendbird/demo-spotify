Our documentation: https://sendbird.com/docs

# demo-spotify

The user status change (from listener to DJ) should be done via user metadata.
Developers can add custom metadata to users. One of them could be the "role" of this user in the conversation.

### Add metadata
```
var data = {
    'role': 'listener'
};
var user = sb.currentUser;
user.createMetaData(data, function(metadata, error) {
    ...
});
```

### Remove metadata
```
var user = sb.currentUser;
user.deleteMetaData('role', function(response, error) {
    if (error) {
        // Handle error.
    }
});
```
