
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
 * Call this file like:
 * file://.../index.html?userId=nick&nameNick R&imageUrl=https://...
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

/**
 * Connects to Sendbird!
 */
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

/**
 * Use Sendbird to update profile picture and more...
 */
function updateCurrentUser(callback) {
    if (!IMAGE_URL) callback();
    sb.updateCurrentUserInfo(NAME, IMAGE_URL, (response, error) => {
        callback();
    });    
}

/**
 * Enter the Open Channel
 */
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

function getMembers(callback) {
    var listQuery = SELECTED_CHANNEL.createParticipantListQuery();
    listQuery.limit = 100;
    listQuery.next(function(participantList, error) {
        if (!error) {
            callback(participantList);
        }
    })
}

/**
 * Get members from the Open Channel
 */
function getAndDrawMemebers() {
    MEMBER_LIST = [];
    getMembers((participantList) => {
        MEMBER_LIST = participantList;
        drawMembers();
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
    <div class="col-auto avatar text-center" onclick="toggleRole()">
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

/**
 * Get current messages on the channel
 */
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
    const nickname = msg.sender && msg.sender.nickname ? msg.sender.nickname : msg.sender.userId;
    const time = timeAgo(msg.createdAt);
    const timeAndName = msg.customType && msg.customType == 'statusMessage' ? '' : `${nickname} - <span class="text-muted small">${time}</span>`;
    const out = `
        <div class="pb-3 small">
            ${ timeAndName }
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

/**
 * Sendbird provides listener to know what's happening on the chnanel
 */

function listen() {
    var channelHandler = new sb.ChannelHandler();
    channelHandler.onMessageReceived = (channel, message) => {
        if (message && message.customType && message.customType == 'statusMessage') {
            getAndDrawMemebers();
        }
        getChannelMessages();
    }
    channelHandler.onUserEntered = (openChannel, user) => {
        const name = user.nickname ? user.nickname : user.userId;
        drawAdminMessage('User ' + name + ' entered');
        getAndDrawMemebers();
    }
    channelHandler.onUserExited = (openChannel, user) => {
        const name = user.nickname ? user.nickname : user.userId;
        drawAdminMessage('User ' + name + ' left');
        getAndDrawMemebers();
    }
    sb.addChannelHandler('UNIQUE_HANDLER_ID', channelHandler);
}

/**
 * Send a message with Sendbird
 */
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

/**
 * Send Admin message
 */
 function sendStatusMessage(text) {
    const params = new sb.UserMessageParams();
    params.message = text;
    params.customType = 'statusMessage';
    SELECTED_CHANNEL.sendUserMessage(params, function (userMessage, error) {
        if (!error) {
            getChannelMessages();
            getAndDrawMemebers();
        }
    });
}


/**
 * Helper functions
 */

function toggleRole() {
    const user = sb.currentUser;
    var role = user.metaData['role'];
    const newRole = (!role || role == 'Listener' ? 'DJ' : 'Listener')
    var data = {
        'role': newRole
    };    
    if (role || role == '') {
        user.updateMetaData(data, (metadata, error) => {
            sendStatusMessage(user.nickname + ' is now ' + newRole)
        });    
    } else {
        user.createMetaData(data, (metadata, error) => {
            sendStatusMessage(user.nickname + ' is now ' + newRole)
        });    
    }
}
function isDJ(user) {
    var role = user.metaData['role'];
    return (role && role == 'DJ')
}


/**
 * All starts here
 */
receiveUrlParams();
