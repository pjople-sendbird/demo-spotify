
var CHANNEL_URL = 'spotify';
var APP_ID = '6A6CF887-E6F6-4763-84B6-BEFD2410EE42';

var USER_ID = '';
var NAME = '';
var IMAGE_URL = '';

var sb = new SendBird({ appId: APP_ID });
var SELECTED_CHANNEL;
var MESSAGE_LIST = [];
var MEMBER_LIST = [];

/**
 * http://127.0.0.1:5500/index.html?name=walter&geo=1&size=2
 */
function receiveUrlParams() {
    var url_string = (window.location.href);
    var url = new URL(url_string);
    var userId  = url.searchParams.get("userId");
    var name = url.searchParams.get("name");
    IMAGE_URL = url.searchParams.get("imageUrl");
    if (!name) {
        name = 'User logged in at ' + new Date();
    }
    if (!userId) {
        userId = btoa(name);
    }
    USER_ID = userId;
    NAME = name;
    if (USER_ID) {
        connect();
    }
}

function connect() {
    sb.connect(USER_ID, (user, error) => {
        updateCurrentUser(() => {
            enterTheChannel(() => {
                getChannelMessages();
                getAndDrawMemebers();
                listen();
            })    
        })
    })
}

function updateCurrentUser(callback) {
    if (!IMAGE_URL) callback();
    sb.updateCurrentUserInfo(NAME, IMAGE_URL, (response, error) => {
        callback();
    });    
}

function enterTheChannel(callback) {
    sb.OpenChannel.getChannel(CHANNEL_URL, (channel, error) => {
        if (error) {
            alert('Error entering the chat!');
        } else {
            SELECTED_CHANNEL = channel;
            console.log(channel);
            SELECTED_CHANNEL.enter(() => {
                callback();    
            })
        }
    })
}

function getAndDrawMemebers() {
    MEMBER_LIST = [];
    var listQuery = SELECTED_CHANNEL.createParticipantListQuery();
    listQuery.limit = 100;
    listQuery.next(function(participantList, error) {
        if (!error) {
            MEMBER_LIST.push(...participantList);
            drawMembers();
        }
    })    
}

function drawMembers() {
    document.getElementById('members-dj').innerHTML = '';
    document.getElementById('members-listener').innerHTML = '';
    let djs = 0;
    let listeners = 0;
    for (let user of MEMBER_LIST) {
        const member = getMemberAvatar(user);
        if (member.isDJ) {
            document.getElementById('members-dj').innerHTML += member.drawThis;
            djs ++;
        } else {
            document.getElementById('members-listener').innerHTML += member.drawThis;
            listen ++;
        }
    }
    document.getElementById('djLabel').innerHTML = 'DJs (' + djs + ')';
    document.getElementById('listenersLabel').innerHTML = 'Listeners (' + djs + ')';
}

function getMemberAvatar(user) {
    if (!user) return;
    const img = user.plainProfileUrl ? user.plainProfileUrl : 'logo.png';
    const name = user.nickname ? user.nickname : user.userId;
    const pointerClass = user.userId == sb.currentUser.userId ? 'pointer' : '';
    const avatarClass = isDJ(user) ? 'avatar-dj' : 'avatar-listener';
    const out = `
    <div class="col-auto avatar text-center" onclick="moveTo('${ user.userId }')">
        <div class="avatar">
            <div class="${ avatarClass } ${ pointerClass }">
                <img src="${ img }" />
            </div>        
        </div>
        <p>
            ${ name }
        </p>
    </div>
    `;
    return {
        drawThis: out,
        isDJ: isDJ(user)
    };
}

function getChannelMessages() {
    var listQuery = SELECTED_CHANNEL.createPreviousMessageListQuery();
    listQuery.limit = 50;
    listQuery.load((messageList, error) => {
        if (!error) {
            MESSAGE_LIST = messageList;
            drawMessages();
        }
    });
}

function drawMessages() {
    document.getElementById('divMessages').innerHTML = '';
    console.log(MESSAGE_LIST);
    for (let msg of MESSAGE_LIST) {
        drawMessage(msg);
    }
}

function drawMessage(msg) {
    if (!msg) return;
    if (msg.message == 'userStatusChanged') return;
    const nickname = msg.sender && msg.sender.nickname ? msg.sender.nickname : msg.sender.userId;
    const time = timeAgo(msg.createdAt);
    const out = `
        <div class="pb-3 small">
            ${nickname} - <span class="text-muted small">${time}</span>
            <div class="text-white">
                ${msg.message}
            </div>
        </div>
    `;
    document.getElementById('divMessages').innerHTML += out;
}

function drawAdminMessage(text) {
    document.getElementById('adminMessageText').innerHTML = text;
    document.getElementById('adminMessageText').style.display = 'inline-block';
    setTimeout( () => {
        document.getElementById('adminMessageText').innerHTML = '';
        document.getElementById('adminMessageText').style.display = 'none';
    }, 3000);
}


function listen() {
    var channelHandler = new sb.ChannelHandler();
    channelHandler.onMessageReceived = (channel, message) => {
        if (message.message == 'userStatusChanged') {
            getAndDrawMemebers();
        } else {
            getChannelMessages();
        }
    }
    channelHandler.onUserEntered = (openChannel, user) => {
        const name = user.nickname ? user.nickname : user.userId;
        drawAdminMessage('User ' + name + ' entered');
        drawMembers();
    }
    channelHandler.onUserExited = (openChannel, user) => {
        const name = user.nickname ? user.nickname : user.userId;
        drawAdminMessage('User ' + name + ' left');
        drawMembers();
    }
    sb.addChannelHandler('UNIQUE_HANDLER_ID', channelHandler);
}

function sendMessage() {
    const message = document.getElementById('message');
    if (!message || !message.value || !SELECTED_CHANNEL) return;

    const params = new sb.UserMessageParams();
    params.message = message.value;
    SELECTED_CHANNEL.sendUserMessage(params, function (userMessage, error) {
        if (!error) {
            getChannelMessages();
            message.value = '';
        }
    });
}

function userStatusChanged() {
    const params = new sb.UserMessageParams();
    params.message = 'userStatusChanged';
    SELECTED_CHANNEL.sendUserMessage(params, function (userMessage, error) {});
}



function isDJ(user) {
    var role = user.metaData['role'];
    return (role && role == 'DJ')
}

function moveToDJ(user, callback) {
    var data = {
        'role': 'DJ'
    };    
    user.createMetaData(data, (metadata, error) => {
        callback( error == null );
    });
}

function removeAsDJ(user, callback) {
    user.deleteMetaData('role', (metadata, error) => {
        callback( error == null );
    });
}

function moveTo(userId) {
    if (!MEMBER_LIST) return;
    const member = MEMBER_LIST.find(i => i.userId == userId);
    if (member) {
        if (isDJ(member)) {
            removeAsDJ(member, () => {
                getAndDrawMemebers();
                userStatusChanged();                
            })
        } else {
            moveToDJ(member, () => {
                getAndDrawMemebers();
                userStatusChanged();
            })
        }
    }
}



receiveUrlParams();