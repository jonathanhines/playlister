var source = "https://spreadsheets.google.com/feeds/cells/1SHlMvmClCuTVQCE8dqdjkXZ65gHEqj-z1ucylXmY2bI/1/public/full?alt=json"

var clips = [];
var currentClipIndex = 0;

$(function() {
    console.log("Calling jquery getJson"); // TEMP
    $.getJSON( source, function( data ) {
        console.log(data); // TEMP
        getClips(data.feed.entry)
        buildClipsTable();
        loadYoutubePlayer();
    });
});

function getClips(entries) {
    // Headings is a map of column headings
    const headings = [];
    let pRow = -1;
    // Loop over the spreadsheet cells
    for (entry of entries) {
        const cell = entry['gs$cell'];
        const row = parseInt(cell.row);
        const col = parseInt(cell.col);
        if(row === 1) {
            switch(cell["$t"]) {
                case "VideoID":
                    headings[col] = "videoID";
                    break;
                case "Title":
                    headings[col] = "title";
                    break;
                case "Start Time":
                    headings[col] = "start";
                    break;
                case "End Time":
                    headings[col] = "end";
                    break;
                case "Type":
                    headings[col] = "type";
                    break;
                case "Number":
                    headings[col] = "number";
                    break;
            }
        } else if (row > 1) {
            if (pRow !== row) {
                // We have a new row, add an entry and sae the last one.
                clips[row - 2] = {}
                pRow = row;
            }
            const key = headings[col];
            let value = cell["$t"];
            switch(key) {
                case "start":
                case "end":
                case "number":
                    value = parseInt(value);
                    break;
            }
            clips[row - 2][key] = value;
        }
    }
    console.log(headings); // TEMP
    console.log(clips); // TEMP
}
function buildClipsTable() {
    let table = document.getElementById("clipsTable");
    let data = Object.keys(clips[0]);
    generateTableHead(table, data);
    generateTable(table, clips);
}

function generateTableHead(table, data) {
    let thead = table.createTHead();
    let row = thead.insertRow();
    for (let key of data) {
        let th = document.createElement("th");
        let text = document.createTextNode(key);
        th.appendChild(text);
        row.appendChild(th);
    }
}

function generateTable(table, data) {
    for (let element of data) {
        let row = table.insertRow();
        for (key in element) {
            let cell = row.insertCell();
            let text = document.createTextNode(element[key]);
            cell.appendChild(text);
        }
    }
}

function loadYoutubePlayer() {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/player_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Replace the 'ytplayer' element with an <iframe> and
// YouTube player after the API code downloads.
var player;

function onYouTubePlayerAPIReady() {
    clip = clips[currentClipIndex];
    var playerConfig = {
        height: '360',
        width: '640',
        videoId: clip.videoID,
        playerVars: {
        autoplay: 1, // Auto-play the video on load
        controls: 1, // Show pause/play buttons in player
        showinfo: 1, // Hide the video title
        modestbranding: 1, // Hide the Youtube Logo
        fs: 1, // Hide the full screen button
        cc_load_policy: 0, // Hide closed captions
        iv_load_policy: 3, // Hide the Video Annotations
        start: clip.start,
        end: clip.end,
        autohide: 0, // Hide video controls when playing
        rel: 0,
        },
        events: {
        'onStateChange': onStateChange
        }
    };
    player = new YT.Player('ytplayer', playerConfig);
}

function onStateChange(state) {
    var _video_url = state.target.getVideoUrl();
    var _video_id = _video_url.split('v=')[1];
    var _end_play_time = player.getCurrentTime();
    clip = clips[currentClipIndex];

    if (state.data === YT.PlayerState.ENDED && _end_play_time >= clip.end) {
    // Video ended, play the next one
        console.log('State: ', _video_id,
            player.getCurrentTime(),
            clip,
            state
        );
        nextVideo();
    }
}

function playVideo() {
    player.playVideo();
}

function pauseVideo() {
    player.pauseVideo();
}

function previousVideo() {
    currentClipIndex--;
    loadCurrentVideo();
}

function nextVideo() {
    currentClipIndex++;
    loadCurrentVideo();
}

function loadCurrentVideo() {
    clip = clips[currentClipIndex];
    if (typeof clip === 'undefined') {
        currentClipIndex = 0;
        return;
    }

    player.loadVideoById({
        videoId: clip.videoID,
        startSeconds: clip.start,
        endSeconds: clip.end
    });
}